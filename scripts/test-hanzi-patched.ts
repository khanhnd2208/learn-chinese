import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });
import { DeepSeekHanziProvider } from '../src/services/chinese/hanziAi/providers/deepseekHanziProvider';
import { validateHanziAnalysis } from '../src/services/chinese/hanziAi/hanziAnalysisValidator';
import { resultRequiresPedagogyReview } from '../src/services/chinese/hanziAi/hanziPedagogy';
import {
	formatHanziComponentRole,
	formatHanziEtymologyStatus,
	formatHanziStructureType,
} from '../src/lib/chinese/hanziAiDisplay';
import type { HanziKnownFacts } from '../src/services/chinese/hanziAi/hanziAiTypes';
import type { HanziAnalysisResult } from '../src/services/chinese/hanziAi/hanziAnalysisSchema';

const TERMS = process.argv.slice(2);
const facts: HanziKnownFacts = { termLevel: {}, characterLevel: [] };

const STRUCTURE_MAP: Record<string, HanziAnalysisResult['characters'][0]['structureType']> = {
	semi_encircling: 'partial_enclosure',
	surround: 'enclosure',
};

function patchForValidation(raw: Record<string, unknown>, term: string) {
	const r = structuredClone(raw) as HanziAnalysisResult;
	r.normalizedTerm = term;
	r.term = term;
	if (Array.isArray(r.characters)) {
		for (const c of r.characters) {
			if (typeof c.structureType === 'string' && STRUCTURE_MAP[c.structureType]) {
				c.structureType = STRUCTURE_MAP[c.structureType];
			}
		}
	}
	return r;
}

function formatChar(char: HanziAnalysisResult['characters'][0]) {
	const lines: string[] = [];
	lines.push(`  Chữ: ${char.char} | pinyin: ${char.pinyin} | Hán Việt: ${char.hanViet} | nghĩa: ${char.meaningVi}`);
	if (char.radical) lines.push(`  Bộ thủ: ${char.radical.char} · ${char.radical.nameVi} — gợi ý: ${char.radical.meaningVi}`);
	lines.push(`  Kiểu ghép: ${formatHanziStructureType(char.structureType)}`);
	lines.push(`  Từ nguyên: ${formatHanziEtymologyStatus(char.etymologyStatus)}${char.etymologyNoteVi ? ` — ${char.etymologyNoteVi}` : ''}`);
	for (const c of char.components.filter((x) => x.role !== 'phonetic')) {
		const role = formatHanziComponentRole(c.role);
		lines.push(`  [${c.char}] ${role.label}${c.isMainRadical ? ' (bộ chính)' : ''}${c.meaningVi ? ` — gợi ý: ${c.meaningVi}` : ''}: ${c.explanationVi}`);
	}
	for (const c of char.components.filter((x) => x.role === 'phonetic')) {
		lines.push(`  [${c.char}] Gợi âm (đã kiểm chứng): ${c.explanationVi}`);
	}
	if (char.mnemonicVi) lines.push(`  Mẹo nhớ: ${char.mnemonicVi}`);
	return lines.join('\n');
}

async function main() {
	const provider = new DeepSeekHanziProvider();
	for (const term of TERMS) {
		console.log('\n' + '='.repeat(60));
		console.log('TERM:', term);
		const output = await provider.generateAnalysis({ term, knownFacts: facts, signal: AbortSignal.timeout(60000) });
		const patched = patchForValidation(output.parsedJson as Record<string, unknown>, term);
		const validated = validateHanziAnalysis(patched, term, facts);
		if (!validated.result) {
			console.log('STILL FAILED:', validated.errors);
			continue;
		}
		const r = validated.result;
		console.log('Pedagogy review:', resultRequiresPedagogyReview(r, facts) ? 'CÓ' : 'KHÔNG');
		if (r.warnings.length) console.log('Warnings:', r.warnings.join(' | '));
		for (const char of r.characters) console.log(formatChar(char));
		await new Promise((res) => setTimeout(res, 1500));
	}
}
main();
