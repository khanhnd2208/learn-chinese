import { describe, expect, it } from 'vitest';
import { BOTTOM_NAV, MAIN_NAV, experimentalModesVisible } from '@/config/navigation';

describe('primary navigation', () => {
	it('uses one learner menu on desktop and mobile', () => {
		const hrefs = MAIN_NAV.map((item) => item.href);
		expect(BOTTOM_NAV).toBe(MAIN_NAV);
		expect(hrefs).toEqual(['/', '/review', '/library', '/explore', '/dashboard']);
		expect(hrefs).not.toContain('/hht');
		expect(hrefs).not.toContain('/inferno');
		expect(hrefs).not.toContain('/learn');
	});

	it('shows the experimental entry unless the flag is 0', () => {
		expect(experimentalModesVisible()).toBe(true);
	});
});
