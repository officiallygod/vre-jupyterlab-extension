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
	attempts: number;
	blockedCount: number;
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
 * Derive an execution status from a snapshot.
 */
export function executionStatusFromSnapshot(snapshot: IFreezeSnapshot): ExecutionStatus {
	if (hasErrorOutputItems(snapshot.outputs)) {
		return 'error';
	}
	if (hasSuccessfulExecutionSnapshot(snapshot)) {
		return 'success';
	}
	return 'unknown';
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
 * Safely parse the extension execution state metadata payload.
 */
export function parseExecutionState(value: unknown): Partial<IExecutionState> | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	return value as Partial<IExecutionState>;
}

/**
 * Create a serializable metadata record for a single execution attempt.
 */
export function buildExecutionState(
	snapshot: IFreezeSnapshot,
	status: ExecutionStatus,
	previousState?: Partial<IExecutionState>,
): IExecutionState {
	const priorAttempts = Number.isFinite(previousState?.attempts)
		? Number(previousState?.attempts)
		: 0;
	const priorBlockedCount = Number.isFinite(previousState?.blockedCount)
		? Number(previousState?.blockedCount)
		: 0;
	const attempts = status === 'blocked' ? priorAttempts : priorAttempts + 1;
	const blockedCount = status === 'blocked' ? priorBlockedCount + 1 : priorBlockedCount;

	return {
		status,
		success: status === 'success',
		executionCount: normalizeExecutionCount(snapshot.executionCount),
		outputCount: snapshot.outputs.length,
		attempts,
		blockedCount,
		updatedAt: new Date().toISOString(),
	};
}