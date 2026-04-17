import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { EXECUTION } from '../config/constants';

let hooksConnected = false;
const watchedModels = new WeakSet<any>();

function getExecutionCount(cell: Cell): number | null {
	const count = (cell.model as any).executionCount;
	return typeof count === 'number' && Number.isFinite(count) ? count : null;
}

function hasErrorOutput(cell: Cell): boolean {
	const outputs = (cell.model as any).outputs;
	if (!outputs) {
		return false;
	}
	const length = typeof outputs.length === 'number' ? outputs.length : 0;
	for (let i = 0; i < length; i += 1) {
		const item = typeof outputs.get === 'function' ? outputs.get(i) : outputs[i];
		const outputType = item?.output_type ?? item?.type;
		if (outputType === 'error') {
			return true;
		}
	}
	return false;
}

function hasAnyOutput(cell: Cell): boolean {
	const outputs = (cell.model as any).outputs;
	if (!outputs) {
		return false;
	}
	const length = typeof outputs.length === 'number' ? outputs.length : 0;
	return length > 0;
}

function hasSuccessfulExecution(cell: Cell): boolean {
	const count = getExecutionCount(cell);
	if (hasErrorOutput(cell)) {
		return false;
	}
	// Some custom kernels may not reliably set executionCount.
	// Treat any non-error output as successful execution for idle resync.
	return count !== null || hasAnyOutput(cell);
}

function isAlreadyExecuted(cell: Cell): boolean {
	const value = cell.model.getMetadata(EXECUTION.metadataKey);
	return value === true || hasSuccessfulExecution(cell);
}

function markExecuted(cell: Cell): void {
	cell.model.setMetadata(EXECUTION.metadataKey, true);
}

function unmarkExecuted(cell: Cell): void {
	cell.model.deleteMetadata(EXECUTION.metadataKey);
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

function isSuccessfulExecution(payload: any): boolean {
	if (payload?.success === true) {
		return true;
	}
	if (payload?.success === false) {
		return false;
	}
	if (payload?.error) {
		return false;
	}
	if (payload?.cell) {
		return !hasErrorOutput(payload.cell as Cell);
	}
	return true;
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
			setExecutedAppearance(cell, true);
			await notifyBlockedExecution();
		}
	});

	(NotebookActions as any).executed.connect((_sender: unknown, payload: any) => {
		const cell = payload?.cell as Cell | null;
		if (!cell || !shouldGuardCell(cell)) {
			return;
		}
		if (!isSuccessfulExecution(payload)) {
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
