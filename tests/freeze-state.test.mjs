import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildExecutionState,
	hasErrorOutputItems,
	hasSuccessfulExecutionSnapshot,
	isAlreadyExecutedSnapshot,
	normalizeExecutionCount,
	parseExecutionState,
} from '../lib/execution/freeze-state.js';

test('normalizeExecutionCount only accepts finite numbers', () => {
	assert.equal(normalizeExecutionCount(3), 3);
	assert.equal(normalizeExecutionCount(NaN), null);
	assert.equal(normalizeExecutionCount('3'), null);
});

test('hasErrorOutputItems detects notebook error outputs', () => {
	assert.equal(hasErrorOutputItems([{ output_type: 'stream' }]), false);
	assert.equal(hasErrorOutputItems([{ output_type: 'error' }]), true);
	assert.equal(hasErrorOutputItems([{ type: 'error' }]), true);
});

test('hasSuccessfulExecutionSnapshot matches freeze semantics', () => {
	assert.equal(
		hasSuccessfulExecutionSnapshot({ executionCount: 1, outputs: [] }),
		true,
	);
	assert.equal(
		hasSuccessfulExecutionSnapshot({ executionCount: null, outputs: [{ output_type: 'stream' }] }),
		true,
	);
	assert.equal(
		hasSuccessfulExecutionSnapshot({ executionCount: null, outputs: [{ output_type: 'error' }] }),
		false,
	);
});

test('isAlreadyExecutedSnapshot respects metadata override', () => {
	assert.equal(
		isAlreadyExecutedSnapshot(true, { success: false }),
		true,
	);
	assert.equal(
		isAlreadyExecutedSnapshot(false, { success: true }),
		true,
	);
	assert.equal(
		isAlreadyExecutedSnapshot(false, { success: false }),
		false,
	);
});

test('buildExecutionState creates stable metadata payload', () => {
	const state = buildExecutionState(
		{ executionCount: 7, outputs: [{ output_type: 'stream' }] },
		'success',
	);
	assert.equal(state.status, 'success');
	assert.equal(state.success, true);
	assert.equal(state.executionCount, 7);
	assert.equal(state.outputCount, 1);
	assert.equal(state.attempts, 1);
	assert.equal(state.blockedCount, 0);
	assert.equal(typeof state.updatedAt, 'string');
});

test('buildExecutionState increments counters with prior state', () => {
	const prior = { attempts: 2, blockedCount: 1 };
	const successState = buildExecutionState(
		{ executionCount: 8, outputs: [] },
		'success',
		prior,
	);
	assert.equal(successState.attempts, 3);
	assert.equal(successState.blockedCount, 1);

	const blockedState = buildExecutionState(
		{ executionCount: 8, outputs: [] },
		'blocked',
		successState,
	);
	assert.equal(blockedState.attempts, 3);
	assert.equal(blockedState.blockedCount, 2);
});

test('parseExecutionState returns undefined for non-object values', () => {
	assert.equal(parseExecutionState(undefined), undefined);
	assert.equal(parseExecutionState(null), undefined);
	assert.equal(parseExecutionState('state'), undefined);
	assert.deepEqual(parseExecutionState({ attempts: 1 }), { attempts: 1 });
});