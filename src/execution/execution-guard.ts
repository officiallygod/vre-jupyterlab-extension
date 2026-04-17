import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { EXECUTION } from '../config/constants';
import {
	buildExecutionState,
	ExecutionStatus,
	hasSuccessfulExecutionSnapshot,
	isAlreadyExecutedSnapshot,
} from './freeze-state';

let hooksConnected = false;
const watchedModels = new WeakSet<any>();

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

function hasSuccessfulExecution(cell: Cell): boolean {
	return hasSuccessfulExecutionSnapshot({
		executionCount: getExecutionCount(cell),
		outputs: getOutputItems(cell),
	});
}

function isAlreadyExecuted(cell: Cell): boolean {
	const value = cell.model.getMetadata(EXECUTION.metadataKey);
	const stateValue = cell.model.getMetadata(EXECUTION.stateMetadataKey);
	return isAlreadyExecutedSnapshot(value, stateValue);
}

function markExecuted(cell: Cell): void {
	cell.model.setMetadata(EXECUTION.metadataKey, true);
}

function unmarkExecuted(cell: Cell): void {
	cell.model.setMetadata(EXECUTION.metadataKey, false);
}

function setExecutionState(cell: Cell, status: ExecutionStatus): void {
	cell.model.setMetadata(
		EXECUTION.stateMetadataKey,
		buildExecutionState(
			{
				executionCount: getExecutionCount(cell),
				outputs: getOutputItems(cell),
			},
			status,
		),
	);
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
		return hasSuccessfulExecution(cell) ? 'success' : 'error';
	}
	if (hasSuccessfulExecution(cell)) {
		return 'success';
	}
	return 'unknown';
}

function applyCellState(cell: Cell): void {
	if (!shouldGuardCell(cell)) {
		return;
	}
	const executed = isAlreadyExecuted(cell);
	if (executed) {
		markExecuted(cell);
	}
	setExecutedAppearance(cell, executed);
}

function connectNotebookHooks(): void {
	if (hooksConnected) {
		return;
	}
	hooksConnected = true;

	(NotebookActions as any).executionScheduled.connect(async (_: unknown, payload: any) => {
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
		const cell = payload?.cell as Cell | null;
		if (!cell || !shouldGuardCell(cell)) {
			return;
		}
		const status = resolveExecutionStatus(payload, cell);
		setExecutionState(cell, status);
		if (status !== 'success') {
			unmarkExecuted(cell);
			setExecutedAppearance(cell, false);
			return;
		}
		markExecuted(cell);
		setExecutedAppearance(cell, true);
	});
}

function syncNotebookAppearance(panel: NotebookPanel): void {
	const notebook = panel.content;
	const refresh = () => {
		notebook.widgets.forEach((cell) => {
			applyCellState(cell);
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

function watchCellModel(cell: Cell): void {
	const modelAny = cell.model as any;
	if (watchedModels.has(modelAny)) {
		return;
	}
	watchedModels.add(modelAny);
	if (modelAny.stateChanged?.connect) {
		modelAny.stateChanged.connect(() => applyCellState(cell));
	}
	if (modelAny.outputs?.changed?.connect) {
		modelAny.outputs.changed.connect(() => applyCellState(cell));
	}
}

function applyPanelState(panel: NotebookPanel): void {
	const notebook = panel.content;
	notebook.widgets.forEach((cell) => {
		if (cell.model.type !== 'code') {
			return;
		}
		watchCellModel(cell);
		applyCellState(cell);
	});
}

/**
 * Activate execution guard integration for a notebook panel.
 */
export function activateExecutionGuard(panel: NotebookPanel): void {
	panel.context.ready
		.then(() => {
			connectNotebookHooks();
			syncNotebookAppearance(panel);
			applyPanelState(panel);
		})
		.catch(() => {
			// Ignore startup race errors and allow notebook to continue.
		});
}
