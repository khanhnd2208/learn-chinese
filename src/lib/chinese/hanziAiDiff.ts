import type { HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';

export interface HanziAiFieldDiff {
	field: string;
	current: string;
	candidate: string;
}

function asText(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.map(asText).join(', ');
	return JSON.stringify(value);
}

export function diffHanziAnalysisResults(
	current: HanziAnalysisResult | null,
	candidate: HanziAnalysisResult | null,
): HanziAiFieldDiff[] {
	if (!current || !candidate) return [];
	const fields: Array<{ key: keyof HanziAnalysisResult; label: string }> = [
		{ key: 'pinyin', label: 'Pinyin' },
		{ key: 'hanViet', label: 'Âm Hán Việt' },
		{ key: 'primaryMeaningVi', label: 'Nghĩa chính' },
		{ key: 'overallExplanationVi', label: 'Giải thích' },
		{ key: 'overallMnemonicVi', label: 'Mẹo nhớ' },
	];
	const diffs: HanziAiFieldDiff[] = [];
	for (const { key, label } of fields) {
		const a = asText(current[key]);
		const b = asText(candidate[key]);
		if (a !== b) diffs.push({ field: label, current: a, candidate: b });
	}
	if (JSON.stringify(current.examples) !== JSON.stringify(candidate.examples)) {
		diffs.push({
			field: 'Ví dụ',
			current: current.examples.map((e) => e.chinese).join(' | ') || '—',
			candidate: candidate.examples.map((e) => e.chinese).join(' | ') || '—',
		});
	}
	const currentComponents = current.characters.map((c) => `${c.char}:${c.components.map((x) => x.char).join('')}`).join('; ');
	const candidateComponents = candidate.characters.map((c) => `${c.char}:${c.components.map((x) => x.char).join('')}`).join('; ');
	if (currentComponents !== candidateComponents) {
		diffs.push({ field: 'Thành phần', current: currentComponents, candidate: candidateComponents });
	}
	return diffs;
}
