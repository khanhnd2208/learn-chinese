const HAN_TERM_RE = /^\p{Script=Han}{1,4}$/u;
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const HAS_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const UNSAFE_TEXT_RE = /<\/?[a-z][^>]*>|https?:\/\/|www\.|\[[^\]]+\]\([^)]+\)|```/iu;

export function normalizeHanziAiTerm(input: string): string {
	return input.trim().normalize('NFKC');
}

export function isValidHanziAiTerm(input: string): boolean {
	const normalized = normalizeHanziAiTerm(input);
	return HAN_TERM_RE.test(normalized) && Array.from(normalized).length <= 4;
}

export function cleanSafeText(input: string, maxLength: number): string | null {
	const cleaned = input.normalize('NFKC').replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim();
	if (!cleaned || cleaned.length > maxLength || UNSAFE_TEXT_RE.test(cleaned)) return null;
	return cleaned;
}

export function containsUnsafeAiText(input: string): boolean {
	return UNSAFE_TEXT_RE.test(input) || HAS_CONTROL_RE.test(input);
}
