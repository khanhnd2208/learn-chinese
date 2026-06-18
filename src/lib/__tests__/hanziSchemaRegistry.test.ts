import { describe, expect, it } from 'vitest';
import { getCurrentHanziSchemaVersion, isHanziSchemaReadable, parseHanziRevisionResult } from '@/services/chinese/hanziAi/hanziSchemaRegistry';

describe('hanziSchemaRegistry', () => {
	it('reads schema version 1 results', () => {
		const result = {
			schemaVersion: 1,
			term: '学', normalizedTerm: '学', script: 'simplified',
			simplified: '学', traditional: '學', pinyin: 'xué', hanViet: 'HỌC',
			primaryMeaningVi: 'học', otherMeaningsVi: [], wordClasses: [], usageNoteVi: null,
			overallExplanationVi: 'x', overallMnemonicVi: null,
			characters: [{ position: 0, char: '学', pinyin: 'xué', dictionaryReadings: ['xué'], hanViet: 'HỌC', meaningVi: 'học', radical: null, structureType: 'single', components: [], structureExplanationVi: 'x', mnemonicVi: null, etymologyStatus: 'not_provided', similarCharacters: [] }],
			examples: [{ chinese: '我学中文。', pinyin: 'x', meaningVi: 'y', usageNoteVi: null }],
			warnings: [],
		};
		expect(getCurrentHanziSchemaVersion()).toBe(1);
		expect(isHanziSchemaReadable(1)).toBe(true);
		expect(isHanziSchemaReadable(99)).toBe(false);
		expect(parseHanziRevisionResult(result, 1).ok).toBe(true);
	});
});
