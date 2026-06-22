/**
 * One-off batch test for Hanzi Lab pipeline (prompt + validator + pedagogy).
 * Usage: npx tsx scripts/test-hanzi-lab-batch.ts
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: false });
import { DeepSeekHanziProvider } from '../src/services/chinese/hanziAi/providers/deepseekHanziProvider';
import { validateHanziAnalysis } from '../src/services/chinese/hanziAi/hanziAnalysisValidator';
import { resultRequiresPedagogyReview } from '../src/services/chinese/hanziAi/hanziPedagogy';
import type { HanziKnownFacts } from '../src/services/chinese/hanziAi/hanziAiTypes';
import { formatHanziCharReport, HANZI_LIVE_CORPUS_TERMS } from '../src/lib/harness';

const TERMS = [...HANZI_LIVE_CORPUS_TERMS];

async function analyzeTerm(term: string) {
	const facts: HanziKnownFacts = { termLevel: {}, characterLevel: [] };
	const provider = new DeepSeekHanziProvider();
	provider.assertConfigured();

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 60_000);
	try {
		const output = await provider.generateAnalysis({ term, knownFacts: facts, signal: controller.signal });
		const validated = validateHanziAnalysis(output.parsedJson, term, facts);
		return {
			term,
			rawValid: !!validated.result,
			errors: validated.errors,
			result: validated.result,
			requiresReview: validated.result ? resultRequiresPedagogyReview(validated.result, facts) : null,
			latencyMs: output.latencyMs,
			model: output.model,
		};
	} finally {
		clearTimeout(timeout);
	}
}

async function main() {
	const provider = new DeepSeekHanziProvider();
	try {
		provider.assertConfigured();
	} catch {
		console.error('DEEPSEEK_API_KEY chưa cấu hình — không thể chạy test live.');
		process.exit(1);
	}

	for (const term of TERMS) {
		console.log('\n' + '='.repeat(72));
		console.log(`TERM: ${term}`);
		console.log('='.repeat(72));
		try {
			const { result, errors, requiresReview, latencyMs, model } = await analyzeTerm(term);
			if (!result) {
				console.log('VALIDATION FAILED:');
				errors.forEach((e) => console.log(`  - ${e}`));
				continue;
			}
			console.log(`Model: ${model} | Latency: ${latencyMs}ms | Cần review pedagogy: ${requiresReview ? 'CÓ' : 'KHÔNG'}`);
			console.log(`Pinyin: ${result.pinyin} | Hán Việt: ${result.hanViet}`);
			console.log(`Nghĩa chính: ${result.primaryMeaningVi}`);
			console.log(`Từ loại: ${result.wordClasses.join(', ') || '(trống)'}`);
			if (result.usageNoteVi) console.log(`Ghi chú dùng: ${result.usageNoteVi}`);
			console.log(`Giải thích tổng: ${result.overallExplanationVi}`);
			if (result.overallMnemonicVi) console.log(`Mẹo nhớ tổng: ${result.overallMnemonicVi}`);
			if (result.warnings.length) {
				console.log('Warnings:');
				result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
			}
			console.log('--- Từng chữ ---');
			for (const char of result.characters) {
				console.log(formatHanziCharReport(char));
				console.log('');
			}
			if (result.examples.length) {
				console.log('Ví dụ:');
				for (const ex of result.examples) {
					console.log(`  ${ex.chinese} (${ex.pinyin}) — ${ex.meaningVi}`);
				}
			}
		} catch (err) {
			console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
		}
		// small gap between API calls
		await new Promise((r) => setTimeout(r, 1500));
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
