import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
	it('joins truthy class names', () => {
		expect(cn('a', 'b', false && 'c', undefined, 'd')).toBe('a b d');
	});

	it('returns empty string when no classes', () => {
		expect(cn(false, null, undefined)).toBe('');
	});
});
