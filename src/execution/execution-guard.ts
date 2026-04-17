import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { EXECUTION } from '../config/constants';
import {
	buildExecutionState,
	ExecutionStatus,
	hasErrorOutputItems,
	isAlreadyExecutedSnapshot,
	parseExecutionState,
} from './freeze-state';

let hooksConnected = false;

function getExecutionCount(cell: Cell): number | null {
	const count = (cell.model as any).executionCount;
	return typeof count === 'number' && Number.isFinite(count) ? count : null;
}

function getOutputItems(cell: Cell): unknown[] {
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

function getCellSnapshot(cell: Cell): { executionCount: unknown; outputs: unknown[] } {
	return {
		executionCount: getExecutionCount(cell),
		outputs: getOutputItems(cell),
	};
}

function isAlreadyExecuted(cell: Cell): boolean {
	const value = cell.model.getMetadata(EXECUTION.metadataKey);
	const stateValue = cell.model.getMetadata(EXECUTION.stateMetadataKey);
	return isAlreadyExecutedSnapshot(value, stateValue);
}

function setExecutedMetadata(cell: Cell, executed: boolean): void {
	cell.model.setMetadata(EXECUTION.metadataKey, executed);
}

function setExecutionState(cell: Cell, status: ExecutionStatus): void {
	const previousState = parseExecutionState(cell.model.getMetadata(EXECUTION.stateMetadataKey));
	cell.model.setMetadata(
		EXECUTION.stateMetadataKey,
		buildExecutionState(getCellSnapshot(cell), status, previousState),
	);
}

function setCellFrozenState(cell: Cell, shouldFreeze: boolean): void {
	setExecutedMetadata(cell, shouldFreeze);
	setExecutedAppearance(cell, shouldFreeze);
}

function applyExecutionStatus(cell: Cell, status: ExecutionStatus): void {
	setExecutionState(cell, status);
	setCellFrozenState(cell, status === 'success');
}

function setExecutedAppearance(cell: Cell, executed: boolean): void {
	const shouldLock = executed;
	const cellAny = cell as any;
	// Use JupyterLab cell APIs/metadata for locking behavior.
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

function resolveExecutionStatus(payload: any, cell: Cell): ExecutionStatus {
	// Keep this conservative: only explicit success locks the cell.
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
	const snapshot = getCellSnapshot(cell);
	if (hasErrorOutputItems(snapshot.outputs)) {
		return 'error';
	}
	return 'unknown';
}

function applyCellState(cell: Cell, isPluginEnabled: () => boolean): void {
	if (!shouldGuardCell(cell)) {
		return;
	}
	if (!isPluginEnabled()) {
		setExecutedAppearance(cell, false);
		return;
	}
	const executed = isAlreadyExecuted(cell);
	setCellFrozenState(cell, executed);
}

function connectNotebookHooks(isPluginEnabled: () => boolean): void {
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
		if (isAlreadyExecuted(cell)) {
			payload.cancel = true;
			setExecutionState(cell, 'blocked');
			setExecutedAppearance(cell, true);
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
		const status = resolveExecutionStatus(payload, cell);
		applyExecutionStatus(cell, status);
	});
}

function syncNotebookAppearance(panel: NotebookPanel, isPluginEnabled: () => boolean): void {
	const notebook = panel.content;
	const refresh = () => {
		notebook.widgets.forEach((cell) => {
			applyCellState(cell, isPluginEnabled);
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

function applyPanelState(panel: NotebookPanel, isPluginEnabled: () => boolean): void {
	const notebook = panel.content;
	notebook.widgets.forEach((cell) => {
		if (cell.model.type !== 'code') {
			return;
		}
		applyCellState(cell, isPluginEnabled);
	});
}

/**
 * Activate execution guard integration for a notebook panel.
 */
export function activateExecutionGuard(panel: NotebookPanel, isPluginEnabled: () => boolean): void {
	panel.context.ready
		.then(() => {
			connectNotebookHooks(isPluginEnabled);
			syncNotebookAppearance(panel, isPluginEnabled);
			applyPanelState(panel, isPluginEnabled);
		})
		.catch(() => {
			// Ignore startup race errors and allow notebook to continue.
		});
}
