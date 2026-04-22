/** Cell data used to infer execution state. */
export interface Snapshot {
	executionCount: unknown;
	outputs: unknown[];
}

/** Execution status persisted in notebook metadata. */
export type ExecutionStatus = 'success' | 'error' | 'cancelled' | 'unknown' | 'blocked';

/** Serializable notebook metadata for execution tracking. */
export interface ExecutionState {
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

/** Normalize a kernel execution count to a finite number or null. */
export function normalizeCount(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Return true when any output entry represents an error output. */
export function hasErrorOutputs(outputs: readonly unknown[]): boolean {
	for (const item of outputs) {
		const candidate = item as IOutputLike;
		const outputType = candidate?.output_type ?? candidate?.type;
		if (outputType === 'error') {
			return true;
		}
	}
	return false;
}

/** Return true when a snapshot should be treated as a successful execution. */
export function isSuccessfulSnapshot(snapshot: Snapshot): boolean {
	if (hasErrorOutputs(snapshot.outputs)) {
		return false;
	}
	return normalizeCount(snapshot.executionCount) !== null || snapshot.outputs.length > 0;
}

/** Derive an execution status from a snapshot. */
export function getStatus(snapshot: Snapshot): ExecutionStatus {
	if (hasErrorOutputs(snapshot.outputs)) {
		return 'error';
	}
	if (isSuccessfulSnapshot(snapshot)) {
		return 'success';
	}
	return 'unknown';
}

/** Return true when a cell is already frozen as executed. */
export function isExecutedSnapshot(metadataValue: unknown, stateValue?: unknown): boolean {
	if (metadataValue === true) {
		return true;
	}
	const state = stateValue as Partial<ExecutionState> | undefined;
	return state?.success === true;
}

/** Safely parse the extension execution state metadata payload. */
export function parseState(value: unknown): Partial<ExecutionState> | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	return value as Partial<ExecutionState>;
}

/** Create a serializable metadata record for a single execution attempt. */
export function buildState(
	snapshot: Snapshot,
	status: ExecutionStatus,
	previousState?: Partial<ExecutionState>,
): ExecutionState {
	const priorAttempts = Number.isFinite(previousState?.attempts) ? Number(previousState?.attempts) : 0;
	const priorBlockedCount = Number.isFinite(previousState?.blockedCount)
		? Number(previousState?.blockedCount)
		: 0;
	const attempts = status === 'blocked' ? priorAttempts : priorAttempts + 1;
	const blockedCount = status === 'blocked' ? priorBlockedCount + 1 : priorBlockedCount;

	return {
		status,
		success: status === 'success',
		executionCount: normalizeCount(snapshot.executionCount),
		outputCount: snapshot.outputs.length,
		attempts,
		blockedCount,
		updatedAt: new Date().toISOString(),
	};
}

// Backward-compatible API names used by tests and older call sites.
export const normalizeExecutionCount = normalizeCount;
export const hasErrorOutputItems = hasErrorOutputs;
export const hasSuccessfulExecutionSnapshot = isSuccessfulSnapshot;
export const isAlreadyExecutedSnapshot = isExecutedSnapshot;
export const parseExecutionState = parseState;
export const buildExecutionState = buildState;