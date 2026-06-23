import { describe, expect, it } from 'vitest';
import { channelRateQualitative } from '@/lib/chinese/channelRateLabels';

describe('channelRateQualitative', () => {
	it('returns Tốt for high rates', () => {
		expect(channelRateQualitative(85).label).toBe('Tốt');
	});

	it('returns Trung bình for mid rates', () => {
		expect(channelRateQualitative(70).label).toBe('Trung bình');
	});

	it('returns Yếu for low rates', () => {
		expect(channelRateQualitative(40).label).toBe('Yếu');
	});

	it('returns dash for zero', () => {
		expect(channelRateQualitative(0).label).toBe('—');
	});
});
