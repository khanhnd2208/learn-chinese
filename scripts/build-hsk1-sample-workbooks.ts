#!/usr/bin/env npx tsx
/**
 * Generate HSK1 sample Excel files into assets/sample/
 * Run: npx tsx scripts/build-hsk1-sample-workbooks.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildSampleWorkbookFromSet } from '@/lib/chinese/buildSampleWorkbook';
import { HSK1_SAMPLE_SETS } from '@/lib/chinese/hsk1SampleSets';

const OUT_DIR = join(process.cwd(), 'assets/sample');

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });
	for (const set of HSK1_SAMPLE_SETS) {
		const buffer = await buildSampleWorkbookFromSet(set);
		const outPath = join(OUT_DIR, set.filename);
		writeFileSync(outPath, buffer);
		console.log(`  ✅ ${set.filename} (${set.words.length} từ)`);
	}
	console.log(`\nWrote ${HSK1_SAMPLE_SETS.length} files to assets/sample/`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
