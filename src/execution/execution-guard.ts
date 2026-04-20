import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { EXECUTION } from '../config/constants';
import {
	buildState,
	ExecutionStatus,
	hasErrorOutputs,
	isExecutedSnapshot,
	parseState,
} from './freeze-state';

let hooksConnected = false;

/**
 * Read the notebook model execution count for a cell.
 */
function readExecutionCount(cell: Cell): number | null {
	const count = (cell.model as any).executionCount;
	return typeof count === 'number' && Number.isFinite(count) ? count : null;
}

/**
 * Read the notebook model outputs for a cell.
 */
function readOutputItems(cell: Cell): unknown[] {
	const outputs = (cell.model as any).outputs;
	if (!outputs) {
		return [];
	}
	const length = typeof outputs.length === 'number' ? outputs.length : 0;
	const items: unknown[] = [];
	for (let i = 0; i < length; i += 1) {
		items.push(typeof outputs.get === 'function' ? outputs.get(i) : outputs[i]);
	}
	return items;
}

/**
 * Capture the pieces of cell state needed for execution metadata.
 */
function readCellSnapshot(cell: Cell): { executionCount: unknown; outputs: unknown[] } {
	return {
		executionCount: readExecutionCount(cell),
		outputs: readOutputItems(cell),
	};
}

/**
 * Return true when the cell is already marked as executed.
 */
function isExecuted(cell: Cell): boolean {
	const value = cell.model.getMetadata(EXECUTION.metadataKey);
	const stateValue = cell.model.getMetadata(EXECUTION.stateMetadataKey);
	return isExecutedSnapshot(value, stateValue);
}

/**
 * Store the executed flag in notebook metadata.
 */
function setExecutedMetadata(cell: Cell, executed: boolean): void {
	cell.model.setMetadata(EXECUTION.metadataKey, executed);
}

/**
 * Store the execution state payload in notebook metadata.
 */
function setExecutionState(cell: Cell, status: ExecutionStatus): void {
	const previousState = parseState(cell.model.getMetadata(EXECUTION.stateMetadataKey));
	cell.model.setMetadata(
		EXECUTION.stateMetadataKey,
		buildState(readCellSnapshot(cell), status, previousState),
	);
}

/**
 * Apply or clear the executed visual treatment.
 */
function setFrozenState(cell: Cell, shouldFreeze: boolean, showReadonlyDesign: boolean): void {
	setExecutedMetadata(cell, shouldFreeze);
	setReadonlyAppearance(cell, shouldFreeze && showReadonlyDesign);
}

/**
 * Persist the execution status and sync the visual state.
 */
function syncExecutionStatus(
	cell: Cell,
	status: ExecutionStatus,
	isReadonlyDesignEnabled: () => boolean,
): void {
	setExecutionState(cell, status);
	setFrozenState(cell, status === 'success', isReadonlyDesignEnabled());
}

/**
 * Apply or clear readonly styling on a cell.
 */
function setReadonlyAppearance(cell: Cell, executed: boolean): void {
	const shouldLock = executed;
	const cellAny = cell as any;
	cellAny.readOnly = shouldLock;
	cell.model.setMetadata('editable', !shouldLock);
	cell.model.setMetadata('deletable', !shouldLock);

	const inputEditorHost = cell.node.querySelector('.jp-InputArea-editor') as HTMLElement | null;
	const cmEditorHost = cell.node.querySelector('.cm-editor') as HTMLElement | null;

	const setClass = (element: HTMLElement | null | undefined, className: string, on: boolean) => {
		if (!element) {
			return;
		}
		if (on) {
			element.classList.add(className);
		} else {
			element.classList.remove(className);
		}
	};

	setClass(inputEditorHost, EXECUTION.executedInputClass, executed);
	setClass(cmEditorHost, EXECUTION.executedEditorClass, executed);

	if (executed) {
		cell.addClass(EXECUTION.executedCellClass);
		return;
	}
	cell.removeClass(EXECUTION.executedCellClass);
}

/**
 * Show the block message for a repeated execution attempt.
 */
async function notifyBlockedExecution(): Promise<void> {
	await showDialog({
		title: 'VRE Cell Already Executed',
		body: 'This VRE cell is declarative and has already been executed. Re-execution is blocked.',
		buttons: [Dialog.okButton({ label: 'OK' })],
	});
}

function shouldGuardCell(cell: Cell): boolean {
	return cell.model.type === 'code';
}

/**
 * Infer the execution status from NotebookActions payloads.
 */
function readExecutionStatus(payload: any, cell: Cell): ExecutionStatus {
	if (payload?.success === true) {
		return 'success';
	}
	if (payload?.cancel === true) {
		return 'cancelled';
	}
	if (payload?.error) {
		return 'error';
	}
	if (payload?.success === false) {
		return 'error';
	}
	const snapshot = readCellSnapshot(cell);
	if (hasErrorOutputs(snapshot.outputs)) {
		return 'error';
	}
	return 'unknown';
}

/**
 * Sync one cell's guarded state.
 */
function syncCellState(
	cell: Cell,
	isPluginEnabled: () => boolean,
	isReadonlyDesignEnabled: () => boolean,
): void {
	if (!shouldGuardCell(cell)) {
		return;
	}
	if (!isPluginEnabled() || !isReadonlyDesignEnabled()) {
		setReadonlyAppearance(cell, false);
		return;
	}
	setFrozenState(cell, isExecuted(cell), true);
}

/**
 * Connect global notebook execution hooks once.
 */
function bindNotebookHooks(
	isPluginEnabled: () => boolean,
	isReadonlyDesignEnabled: () => boolean,
): void {
	if (hooksConnected) {
		return;
	}
	hooksConnected = true;

	(NotebookActions as any).executionScheduled.connect(async (_: unknown, payload: any) => {
		if (!isPluginEnabled()) {
			return;
		}
		const cell = payload?.cell as Cell | null;
		if (!cell || !shouldGuardCell(cell)) {
			return;
		}
		if (isExecuted(cell)) {
			payload.cancel = true;
			setExecutionState(cell, 'blocked');
			setReadonlyAppearance(cell, isReadonlyDesignEnabled());
			await notifyBlockedExecution();
		}
	});

	(NotebookActions as any).executed.connect((_sender: unknown, payload: any) => {
		if (!isPluginEnabled()) {
			return;
		}
		const cell = payload?.cell as Cell | null;
		if (!cell || !shouldGuardCell(cell)) {
			return;
		}
		const alreadyExecuted = isExecuted(cell);

		// A blocked re-run emits a cancelled execution event; ignore it so we do not
		// overwrite blocked metadata and accidentally unfreeze the cell.
		if (payload?.cancel === true && alreadyExecuted) {
			setFrozenState(cell, true, isReadonlyDesignEnabled());
			return;
		}

		const status = readExecutionStatus(payload, cell);

		// Defensive fallback: once frozen as executed, do not allow non-success events
		// to transition a cell back to executable.
		if (alreadyExecuted && status !== 'success') {
			setFrozenState(cell, true, isReadonlyDesignEnabled());
			return;
		}

		syncExecutionStatus(cell, status, isReadonlyDesignEnabled);
	});
}

/**
 * Keep all guarded cells in a notebook visually up to date.
 */
function syncNotebookView(
	panel: NotebookPanel,
	isPluginEnabled: () => boolean,
	isReadonlyDesignEnabled: () => boolean,
): void {
	const notebook = panel.content;
	const refresh = () => {
		notebook.widgets.forEach((cell) => {
			syncCellState(cell, isPluginEnabled, isReadonlyDesignEnabled);
		});
	};

	refresh();
	notebook.modelContentChanged.connect(() => {
		refresh();
	});
	panel.sessionContext.kernelChanged.connect(() => {
		refresh();
	});
	panel.sessionContext.statusChanged.connect(() => {
		refresh();
	});
}

/**
 * Refresh the existing code cells in a notebook panel.
 */
function syncPanelCells(
	panel: NotebookPanel,
	isPluginEnabled: () => boolean,
	isReadonlyDesignEnabled: () => boolean,
): void {
	const notebook = panel.content;
	notebook.widgets.forEach((cell) => {
		if (cell.model.type !== 'code') {
			return;
		}
		syncCellState(cell, isPluginEnabled, isReadonlyDesignEnabled);
	});
}

/**
 * Wire execution-guard behavior into a notebook panel.
 */
export function activateExecutionGuard(
	panel: NotebookPanel,
	isPluginEnabled: () => boolean,
	isReadonlyDesignEnabled: () => boolean,
): void {
	(panel as any).__vreRefreshExecutionGuard = () => {
		syncPanelCells(panel, isPluginEnabled, isReadonlyDesignEnabled);
	};

	panel.context.ready
		.then(() => {
			bindNotebookHooks(isPluginEnabled, isReadonlyDesignEnabled);
			syncNotebookView(panel, isPluginEnabled, isReadonlyDesignEnabled);
			syncPanelCells(panel, isPluginEnabled, isReadonlyDesignEnabled);
		})
		.catch(() => {
			// Ignore startup race errors and allow notebook to continue.
		});
}

/**
 * Force-refresh execution-guard appearance for a previously wired notebook panel.
 */
export function refreshExecutionGuard(panel: NotebookPanel): void {
	const fn = (panel as any).__vreRefreshExecutionGuard;
	if (typeof fn === 'function') {
		fn();
	}
}
