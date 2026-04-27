import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve('tests');
const tapPath = path.join(testsDir, 'test-results.tap');
const outJsonPath = path.join(testsDir, 'ci-summary.json');
const outMdPath = path.join(testsDir, 'ci-summary.md');
const coveragePath = path.join(path.resolve('.'), 'coverage', 'coverage-summary.json');

function readText(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch {
		return '';
	}
}

function readJson(filePath) {
	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return null;
	}
}

function parseTap(content) {
	const lines = content.split(/\r?\n/);
	const passed = [];
	const failed = [];
	const skipped = [];

	for (const line of lines) {
		if (line.startsWith('ok ')) {
			if (line.includes('# SKIP')) {
				skipped.push(line.replace(/^ok\s+\d+\s*-\s*/, '').trim());
				continue;
			}
			passed.push(line.replace(/^ok\s+\d+\s*-\s*/, '').trim());
			continue;
		}
		if (line.startsWith('not ok ')) {
			failed.push(line.replace(/^not ok\s+\d+\s*-\s*/, '').trim());
		}
	}

	return {
		passed,
		failed,
		skipped,
		total: passed.length + failed.length + skipped.length,
	};
}

function extractCoverageSummary(coverageData) {
	if (!coverageData || !coverageData.total) {
		return null;
	}
	const total = coverageData.total;
	return {
		lines: total.lines?.pct || 0,
		statements: total.statements?.pct || 0,
		functions: total.functions?.pct || 0,
		branches: total.branches?.pct || 0,
	};
}

function buildMarkdown(summary, coverage) {
	const lines = [];
	lines.push('## Extension CI Summary');
	lines.push('');
	lines.push('| Metric | Value |');
	lines.push('|---|---:|');
	lines.push(`| Total tests | ${summary.total} |`);
	lines.push(`| Passed | ${summary.passed.length} |`);
	lines.push(`| Failed | ${summary.failed.length} |`);
	lines.push(`| Skipped | ${summary.skipped.length} |`);
	
	if (coverage) {
		lines.push(`| Coverage (lines) | ${coverage.lines.toFixed(1)}% |`);
		lines.push(`| Coverage (statements) | ${coverage.statements.toFixed(1)}% |`);
		lines.push(`| Coverage (functions) | ${coverage.functions.toFixed(1)}% |`);
		lines.push(`| Coverage (branches) | ${coverage.branches.toFixed(1)}% |`);
	}
	
	lines.push('');

	if (summary.failed.length > 0) {
		lines.push('### Failed Tests');
		lines.push('');
		for (const testName of summary.failed.slice(0, 25)) {
			lines.push(`- ${testName}`);
		}
		if (summary.failed.length > 25) {
			lines.push(`- ...and ${summary.failed.length - 25} more`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

const tapSummary = parseTap(readText(tapPath));
const coverageData = readJson(coveragePath);
const coverage = extractCoverageSummary(coverageData);

// Add coverage to the JSON summary if available
const jsonSummary = { ...tapSummary };
if (coverage) {
	jsonSummary.coverage = coverage;
}

fs.mkdirSync(testsDir, { recursive: true });
fs.writeFileSync(outJsonPath, JSON.stringify(jsonSummary, null, 2));
fs.writeFileSync(outMdPath, `${buildMarkdown(tapSummary, coverage)}\n`);

console.log(`Wrote ${outJsonPath}`);
console.log(`Wrote ${outMdPath}`);
if (coverage) {
	console.log(`Included coverage: lines=${coverage.lines.toFixed(1)}%, statements=${coverage.statements.toFixed(1)}%, functions=${coverage.functions.toFixed(1)}%, branches=${coverage.branches.toFixed(1)}%`);
}
