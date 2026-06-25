import { describe, it, expect } from 'vitest';
import {
	computeFillTarget,
	enrichExampleForFill,
	MAX_FILL_SENTENCE_HAN_LENGTH,
} from '@/lib/chinese/fillExampleValidator';

describe('fillExampleValidator', () => {
	it('finds target at exact single occurrence', () => {
		expect(computeFillTarget('我是学生。', '学生')).toEqual({ start: 2, end: 4 });
	});

	it('rejects when target appears more than once', () => {
		expect(computeFillTarget('学生学习学习。', '学习')).toBeNull();
	});

	it('rejects when target not in sentence', () => {
		expect(computeFillTarget('他是老师。', '学生')).toBeNull();
	});

	it('rejects sentences exceeding Han length bound', () => {
		const long = '我'.repeat(MAX_FILL_SENTENCE_HAN_LENGTH + 1);
		expect(computeFillTarget(long, '我')).toBeNull();
	});

	it('classifies valid example as auto', () => {
		const meta = enrichExampleForFill('他是老师。', '老师');
		expect(meta.naturalnessStatus).toBe('auto');
		expect(meta.targetWordStart).toBe(2);
		expect(meta.targetWordEnd).toBe(4);
	});

	it('leaves invalid example as draft', () => {
		const meta = enrichExampleForFill('他是老师。', '学生');
		expect(meta.naturalnessStatus).toBe('draft');
		expect(meta.targetWordStart).toBeNull();
	});

	it('does not downgrade verified status', () => {
		const meta = enrichExampleForFill('他是老师。', '老师', 'verified');
		expect(meta.naturalnessStatus).toBe('verified');
		expect(meta.targetWordStart).toBe(2);
		expect(meta.targetWordEnd).toBe(4);
	});
});
