import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
import { DeepSeekHanziProvider } from '../src/services/chinese/hanziAi/providers/deepseekHanziProvider';
import { validateHanziAnalysis } from '../src/services/chinese/hanziAi/hanziAnalysisValidator';
import type { HanziKnownFacts } from '../src/services/chinese/hanziAi/hanziAiTypes';

const TERMS = process.argv.slice(2);
const facts: HanziKnownFacts = { termLevel: {}, characterLevel: [] };

async function main() {
	const provider = new DeepSeekHanziProvider();
	for (const term of TERMS) {
		console.log('\n=== RAW + VALIDATION:', term, '===');
		const output = await provider.generateAnalysis({ term, knownFacts: facts, signal: AbortSignal.timeout(60000) });
		console.log('RAW JSON:\n', output.rawText.slice(0, 8000));
		const validated = validateHanziAnalysis(output.parsedJson, term, facts);
		console.log('ERRORS:', validated.errors);
		if (validated.result) console.log('POST-PEDAGOGY OK');
		await new Promise((r) => setTimeout(r, 1500));
	}
}
main();
