import { describe, expect, it } from 'vitest';
import { BOTTOM_NAV, MAIN_NAV, experimentalModesVisible } from '@/config/navigation';

describe('primary navigation', () => {
	it('keeps HHT and Inferno off the main and mobile menus', () => {
		const hrefs = [...MAIN_NAV, ...BOTTOM_NAV].map((item) => item.href);
		expect(hrefs).not.toContain('/hht');
		expect(hrefs).not.toContain('/inferno');
		expect(hrefs).toContain('/review');
		expect(hrefs).toContain('/learn');
	});

	it('shows the experimental entry unless the flag is 0', () => {
		expect(experimentalModesVisible()).toBe(true);
	});
});
