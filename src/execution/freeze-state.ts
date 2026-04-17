export interface IFreezeSnapshot {
	executionCount: unknown;
	outputs: unknown[];
}

export type ExecutionStatus = 'success' | 'error' | 'cancelled' | 'unknown' | 'blocked';

export interface IExecutionState {
	status: ExecutionStatus;
	success: boolean;
	executionCount: number | null;
	outputCount: number;
	updatedAt: string;
}

interface IOutputLike {
	output_type?: string;
	type?: string;
}

/**
 * Normalize a kernel execution count to a finite number or null.
 */
export function normalizeExecutionCount(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Return true when any output entry represents an error output.
 */
export function hasErrorOutputItems(outputs: readonly unknown[]): boolean {
	for (const item of outputs) {
		const candidate = item as IOutputLike;
		const outputType = candidate?.output_type ?? candidate?.type;
		if (outputType === 'error') {
			return true;
		}
	}
	return false;
}

/**
 * Return true when a snapshot should be treated as a successful execution.
 */
export function hasSuccessfulExecutionSnapshot(snapshot: IFreezeSnapshot): boolean {
	if (hasErrorOutputItems(snapshot.outputs)) {
		return false;
	}
	return normalizeExecutionCount(snapshot.executionCount) !== null || snapshot.outputs.length > 0;
}

/**
 * Return true when a cell is already frozen as executed.
 */
export function isAlreadyExecutedSnapshot(
	metadataValue: unknown,
	stateValue?: unknown,
): boolean {
	if (metadataValue === true) {
		return true;
	}
	const state = stateValue as Partial<IExecutionState> | undefined;
	return state?.success === true;
}

/**
 * Create a serializable metadata record for a single execution attempt.
 */
export function buildExecutionState(snapshot: IFreezeSnapshot, status: ExecutionStatus): IExecutionState {
	return {
		status,
		success: status === 'success',
		executionCount: normalizeExecutionCount(snapshot.executionCount),
		outputCount: snapshot.outputs.length,
		updatedAt: new Date().toISOString(),
	};
}