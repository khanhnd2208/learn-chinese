/* ════════════════════════════════════════════════════════════════════════
   sampleFillExamples.ts — Generate 5 fill-example cells for sample vocabulary
   ════════════════════════════════════════════════════════════════════════ */
import { formatFillExampleCell } from '@/lib/chinese/parseFillExample';
import type { Hsk1SampleWord } from '@/lib/chinese/hsk1SampleSets';

function charsOf(word: string): Set<string> {
	return new Set([...word]);
}

function templateSafe(template: string, word: string): boolean {
	const outside = template.replace(/__/g, '');
	for (const ch of charsOf(word)) {
		if (outside.includes(ch)) return false;
	}
	return true;
}

interface TemplateTriple {
	hanzi: string;
	pinyin: string;
	vn: string;
}

const GENERIC_TEMPLATES: TemplateTriple[] = [
	{ hanzi: '我喜欢__。', pinyin: 'wǒ xǐhuān __.', vn: 'Tôi thích __.' },
	{ hanzi: '他有__。', pinyin: 'tā yǒu __.', vn: 'Anh ấy có __.' },
	{ hanzi: '__很好。', pinyin: '__ hěn hǎo.', vn: '__ rất tốt.' },
	{ hanzi: '你看__。', pinyin: 'nǐ kàn __.', vn: 'Bạn xem __.' },
	{ hanzi: '请说__。', pinyin: 'qǐng shuō __.', vn: 'Xin hãy nói __.' },
	{ hanzi: '那是__。', pinyin: 'nà shì __.', vn: 'Đó là __.' },
	{ hanzi: '我想__。', pinyin: 'wǒ xiǎng __.', vn: 'Tôi muốn __.' },
	{ hanzi: '今天学__。', pinyin: 'jīntiān xué __.', vn: 'Hôm nay học __.' },
];

/** Build 5 vi_du cell strings for a sample word (for Excel tu_vung import). */
export function buildFiveFillExampleCells(word: Hsk1SampleWord): string[] {
	const picked: string[] = [];
	const used = new Set<string>();

	for (const t of GENERIC_TEMPLATES) {
		if (picked.length >= 5) break;
		if (!templateSafe(t.hanzi, word.simplified)) continue;
		const key = t.hanzi;
		if (used.has(key)) continue;
		used.add(key);
		picked.push(formatFillExampleCell(t.hanzi, t.pinyin, t.vn));
	}

	while (picked.length < 5) {
		picked.push(formatFillExampleCell('请用__。', 'qǐng yòng __.', 'Hãy dùng __.'));
	}

	return picked.slice(0, 5);
}
