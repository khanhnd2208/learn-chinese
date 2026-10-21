export function normalizeLearnerText(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[.,!?;:'"“”‘’]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function normalizeSequence(value: string): string {
	return value
		.split('|')
		.map((part) => normalizeLearnerText(part))
		.filter(Boolean)
		.join('|');
}

export function studyDayKey(date: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

export function isFullVietnameseMeaning(meaningVi: string, gloss: string): boolean {
	const text = meaningVi.trim();
	if (text.length < 12 || !text.includes(' ')) return false;
	return text.toLowerCase() !== gloss.trim().toLowerCase();
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function blankReport(english: string, target: string): { ok: boolean; code?: 'one_blank' | 'target_once' } {
	const blanks = english.split('___').length - 1;
	if (blanks !== 1) return { ok: false, code: 'one_blank' };
	const filled = english.replace('___', target);
	const flags = 'gi';
	const re = new RegExp(`\\b${escapeRegExp(target)}\\b`, flags);
	const matches = filled.match(re);
	if (!matches || matches.length !== 1) return { ok: false, code: 'target_once' };
	return { ok: true };
}

export function splitBlank(english: string): { before: string; after: string } | null {
	const parts = english.split('___');
	if (parts.length !== 2) return null;
	return { before: parts[0] ?? '', after: parts[1] ?? '' };
}

export function fixedPartsInOrder(english: string, fixedParts: string[]): boolean {
	let from = 0;
	const lower = english.toLowerCase();
	for (const part of fixedParts) {
		const needle = part.trim().toLowerCase();
		if (!needle) return false;
		const idx = lower.indexOf(needle, from);
		if (idx < 0) return false;
		from = idx + needle.length;
	}
	return true;
}

export function uniqueTexts(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const text = value.trim();
		const key = text.toLowerCase();
		if (!text || seen.has(key)) continue;
		seen.add(key);
		result.push(text);
	}
	return result;
}
