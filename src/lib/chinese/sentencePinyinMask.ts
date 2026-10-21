/**
 * Hide the target word's pinyin inside the sentence pinyin.
 * Returns null unless the target matches exactly once, so a caller never shows
 * pinyin it could not mask without counting it as a hint.
 */
export function maskTargetPinyin(
	sentencePinyin: string | undefined,
	wordPinyin: string | undefined,
): string | null {
	if (!sentencePinyin || !wordPinyin) return null;
	const target = wordPinyin.normalize('NFC').toLowerCase().replace(/[\s'’]/g, '');
	if (!target) return null;

	const chars = [...sentencePinyin.normalize('NFC')];
	const kept: string[] = [];
	const origin: number[] = [];
	chars.forEach((char, index) => {
		if (/[\s'’]/.test(char)) return;
		kept.push(char.toLowerCase());
		origin.push(index);
	});
	const haystack = kept.join('');

	const first = haystack.indexOf(target);
	if (first < 0 || haystack.indexOf(target, first + 1) >= 0) return null;

	const start = origin[first];
	const end = origin[first + [...target].length - 1];
	if (start === undefined || end === undefined) return null;
	return `${chars.slice(0, start).join('')}____${chars.slice(end + 1).join('')}`;
}
