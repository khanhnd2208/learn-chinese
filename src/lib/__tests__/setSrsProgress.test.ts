import { describe, expect, it } from 'vitest';
import {
	formatIntroducedLabel,
	formatMasteredLabel,
	formatSetDueChannelsLabel,
	masteredSharePct,
} from '@/lib/chinese/setSrsProgress';

describe('setSrsProgress', () => {
	const snapshot = { introduced: 10, mastered: 4, total: 20, dueChannels: 3 };

	it('uses mastered words as the progress share', () => {
		expect(masteredSharePct(snapshot)).toBe(20);
		expect(masteredSharePct({ ...snapshot, total: 0 })).toBe(0);
		expect(masteredSharePct({ ...snapshot, mastered: 20 })).toBe(100);
	});

	it('labels introduced words, mastered words, and due channels separately', () => {
		expect(formatIntroducedLabel(snapshot)).toBe('Đã học 10/20 từ');
		expect(formatMasteredLabel(snapshot)).toBe('Đã nắm 4/20');
		expect(formatSetDueChannelsLabel(3)).toBe('3 kênh cần ôn');
	});
});
