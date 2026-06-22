/** Bộ từ demo tự seed cũ (6 buổi HSK1 + nâng cao) — xóa khỏi mọi user. */
export const LEGACY_DEMO_SET_TITLES = [
	'HSK1 — Buổi 1: Chào hỏi',
	'HSK1 — Buổi 2: Giới thiệu',
	'HSK1 — Buổi 3: Số & chỉ định',
	'HSK1 — Buổi 4: Hàng ngày',
	'HSK1 — Buổi 5: Cảm xúc & giao tiếp',
	'Nâng cao — Phân biệt chữ dễ nhầm',
] as const;

/** Mô tả bộ auto-seed từ code cũ (không phải import Excel thật). */
export const LEGACY_AUTO_SEED_DESCRIPTION =
	'Bộ mẫu HSK1 Bài 1 — chào hỏi và từ cơ bản (file import mẫu cho mọi tài khoản).';

export interface LegacyDemoSetCandidate {
	title: string;
	description: string | null;
	source: string;
}

export function isLegacyDemoSet(set: LegacyDemoSetCandidate): boolean {
	if (LEGACY_DEMO_SET_TITLES.includes(set.title as (typeof LEGACY_DEMO_SET_TITLES)[number])) {
		return true;
	}
	return set.source === 'textbook' && set.description === LEGACY_AUTO_SEED_DESCRIPTION;
}
