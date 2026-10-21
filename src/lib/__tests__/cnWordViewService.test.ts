import { describe, expect, it } from 'vitest';
import { applyOverride, examplesForUser } from '@/services/chinese/cnWordViewService';

describe('applyOverride', () => {
	const word = {
		pinyin: 'xuésheng',
		hanViet: 'học sinh',
		meaningVi: 'học sinh',
		partOfSpeech: 'n',
		ghiChu: '',
		mnemonicVi: '',
	};

	it('keeps canonical text when the learner has no overlay', () => {
		expect(applyOverride(word, null).meaningVi).toBe('học sinh');
	});

	it('replaces only the fields the learner set', () => {
		const merged = applyOverride(word, { meaningVi: 'X', pinyin: null });
		expect(merged.meaningVi).toBe('X');
		expect(merged.pinyin).toBe('xuésheng');
	});
});

describe('examplesForUser', () => {
	const canonical = { id: 'c', ownerUserId: null };
	const mine = { id: 'a', ownerUserId: 'user-a' };
	const theirs = { id: 'b', ownerUserId: 'user-b' };

	it('uses only the learner examples once they have replaced the shared ones', () => {
		expect(examplesForUser([canonical, mine, theirs], 'user-a')).toEqual([mine]);
	});

	it('falls back to canonical examples when the learner has none', () => {
		expect(examplesForUser([canonical, theirs], 'user-a')).toEqual([canonical]);
	});
});
