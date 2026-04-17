import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const target of ['lib', 'labextension', 'tsconfig.tsbuildinfo']) {
	const targetPath = join(packageRoot, target);
	try {
		rmSync(targetPath, { force: true, recursive: true });
	} catch {
		// Ignore cleanup races and missing paths.
	}
}