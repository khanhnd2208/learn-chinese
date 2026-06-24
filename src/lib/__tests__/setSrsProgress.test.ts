import { describe, it, expect } from 'vitest';
import {
	computeSetChannelProgress,
	formatSetDueChannelsLabel,
	maxSrsChannelsForSet,
} from '@/lib/chinese/setSrsProgress';

describe('setSrsProgress', () => {
	it('computes channel progress without going negative', () => {
		expect(maxSrsChannelsForSet(31)).toBe(124);
		expect(computeSetChannelProgress(31, 35)).toBe(72);
		expect(computeSetChannelProgress(31, 124)).toBe(0);
		expect(computeSetChannelProgress(31, 0)).toBe(100);
	});

	it('formats due channel label', () => {
		expect(formatSetDueChannelsLabel(35)).toBe('35 kênh cần ôn');
	});
});
