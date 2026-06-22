import { describe, it, expect } from 'vitest';
import {
	computeSetChannelProgress,
	formatSetDueChannelsLabel,
	maxSrsChannelsForSet,
} from '@/lib/chinese/setSrsProgress';

describe('setSrsProgress', () => {
	it('computes channel progress without going negative', () => {
		expect(maxSrsChannelsForSet(31)).toBe(93);
		expect(computeSetChannelProgress(31, 35)).toBe(62);
		expect(computeSetChannelProgress(31, 93)).toBe(0);
		expect(computeSetChannelProgress(31, 0)).toBe(100);
	});

	it('formats due channel label', () => {
		expect(formatSetDueChannelsLabel(35)).toBe('35 kênh cần ôn');
	});
});
