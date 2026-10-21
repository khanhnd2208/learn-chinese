import { describe, expect, it } from 'vitest';
import { maskTargetPinyin } from '@/lib/chinese/sentencePinyinMask';

describe('maskTargetPinyin', () => {
	it('hides the target pinyin and keeps the rest', () => {
		expect(maskTargetPinyin('Wǒ xǐhuan xuéxí Hànyǔ.', 'xuéxí')).toBe('Wǒ xǐhuan ____ Hànyǔ.');
	});

	it('matches across different syllable spacing', () => {
		expect(maskTargetPinyin('Wǒ xǐ huān xué xí Hànyǔ', 'xuéxí')).toBe('Wǒ xǐ huān ____ Hànyǔ');
	});

	it('returns null when the target is missing', () => {
		expect(maskTargetPinyin('Wǒ hē chá', 'xuéxí')).toBeNull();
	});

	it('returns null when the target appears twice', () => {
		expect(maskTargetPinyin('Nǐ hǎo, nǐ hǎo', 'nǐ')).toBeNull();
	});

	it('returns null without inputs', () => {
		expect(maskTargetPinyin(undefined, 'wǒ')).toBeNull();
		expect(maskTargetPinyin('wǒ', undefined)).toBeNull();
	});
});
