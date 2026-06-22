#!/usr/bin/env npx tsx
/**
 * Offline Hanzi golden-case harness report.
 * Usage:
 *   npx tsx scripts/hanzi-harness-report.ts
 *   npx tsx scripts/hanzi-harness-report.ts --json
 */
import {
	buildHanziHarnessReport,
	formatHanziHarnessReportJson,
	formatHanziHarnessReportText,
	runAllHanziGoldenCases,
	countHanziGoldenFailures,
} from '../src/lib/harness';

const jsonMode = process.argv.includes('--json');
const results = runAllHanziGoldenCases();
const report = buildHanziHarnessReport(results);

if (jsonMode) {
	console.log(formatHanziHarnessReportJson(report));
} else {
	console.log(formatHanziHarnessReportText(report));
}

if (countHanziGoldenFailures(results) > 0) {
	process.exit(1);
}
