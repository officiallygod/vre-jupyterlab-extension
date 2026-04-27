import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMANDS, EXECUTION, LANGUAGE, PLUGIN_ID, SETTINGS } from '../lib/config/constants.js';
import { DEFAULT_LANGUAGE_OPTIONS } from '../lib/config/defaults.js';

test('constants expose stable plugin and command IDs', () => {
	assert.equal(typeof PLUGIN_ID, 'string');
	assert.ok(PLUGIN_ID.includes('vre-jupyterlab-extension'));
	assert.ok(COMMANDS.toggleReadonlyDesign.startsWith(PLUGIN_ID));
	assert.ok(COMMANDS.toggleExtension.startsWith(PLUGIN_ID));
	assert.equal(SETTINGS.enabled, 'enabled');
	assert.equal(SETTINGS.cellReadonlyDesignEnabled, 'cellReadonlyDesignEnabled');
});

test('language constants are aligned with extension assumptions', () => {
	assert.equal(LANGUAGE.mime, 'text/x-vre');
	assert.equal(LANGUAGE.defaultCodeMime, 'text/plain');
	assert.equal(LANGUAGE.kernelName, 'vre-language');
	assert.ok(LANGUAGE.extensionName.length > 0);
});

test('execution constants use VRE metadata namespace and classes', () => {
	assert.ok(EXECUTION.metadataKey.startsWith('vre.'));
	assert.ok(EXECUTION.stateMetadataKey.startsWith('vre.'));
	assert.ok(EXECUTION.executedCellClass.includes('__cell--executed'));
	assert.ok(EXECUTION.executedInputClass.includes('__input-editor--executed'));
	assert.ok(EXECUTION.executedEditorClass.includes('__cm-editor--executed'));
});

test('default language options include core DSL entries', () => {
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.keywords.includes('use'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.keywords.includes('task'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.builtins.includes('print'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.types.includes('Quantity'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.constants.includes('true'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.wordOperators.includes('and'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.specialProperties.includes('array'));
	assert.ok(DEFAULT_LANGUAGE_OPTIONS.units.includes('K'));
});
