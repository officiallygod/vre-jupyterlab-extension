import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const extensionRoot = path.resolve(process.cwd());

test('smoke: TypeScript build output exists', () => {
	const indexPath = path.join(extensionRoot, 'lib', 'index.js');
	assert.equal(fs.existsSync(indexPath), true);
});

test('smoke: labextension bundle output exists', () => {
	const labPath = path.join(extensionRoot, 'labextension');
	assert.equal(fs.existsSync(labPath), true);

	const files = fs.readdirSync(path.join(labPath, 'static'));
	const hasRemoteEntry = files.some((name) => name.startsWith('remoteEntry.') && name.endsWith('.js'));
	assert.equal(hasRemoteEntry, true);
});
