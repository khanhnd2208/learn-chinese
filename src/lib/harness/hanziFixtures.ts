import type { HanziAiDraftResult, HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import {
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
} from '@/services/chinese/hanziAi/hanziTrustRegistry';

export function draftCharRow(
	char: string,
	position: number,
	overrides: Partial<HanziAiDraftResult['characters'][0]> = {},
): HanziAiDraftResult['characters'][0] {
	return {
		position,
		char,
		pinyin: 'yōu',
		dictionaryReadings: ['yōu'],
		hanViet: 'ƯU',
		meaningVi: 'lo âu',
		radical: { char: '心', nameVi: 'tâm', meaningVi: 'lòng' },
		structureType: 'top_bottom',
		components: [],
		structureExplanationVi: 'Cấu tạo trên dưới.',
		mnemonicVi: 'Liên tưởng nhớ mặt chữ.',
		etymologyStatus: 'not_provided',
		etymologyNoteVi: null,
		similarCharacters: [],
		...overrides,
	};
}

export function baseDraft(
	term: string,
	characters: HanziAiDraftResult['characters'],
	extra: Partial<HanziAiDraftResult> = {},
): HanziAiDraftResult {
	return {
		schemaVersion: 1,
		term,
		normalizedTerm: term,
		script: 'traditional',
		simplified: term,
		traditional: term,
		pinyin: 'yōuyù',
		hanViet: 'ƯU UẤT',
		primaryMeaningVi: 'buồn bã, u sầu',
		otherMeaningsVi: [],
		wordClasses: ['tính từ'],
		usageNoteVi: 'Dùng cho tâm trạng u sầu; 憂鬱症 là thuật ngữ y khoa.',
		overallExplanationVi: 'Từ chỉ trạng thái tâm lý.',
		overallMnemonicVi: 'Hai chữ gợi lo âu và u ám.',
		characters,
		examples: [{ chinese: `他很${term}。`, pinyin: 'Tā hěn yōuyù.', meaningVi: 'Anh ấy rất buồn bã.', usageNoteVi: null }],
		warnings: [],
		...extra,
	};
}

export const validV2Result: HanziAnalysisResult = {
	schemaVersion: 2,
	policyVersion: HANZI_TRUST_POLICY_VERSION,
	registryVersion: HANZI_TRUST_REGISTRY_VERSION,
	requestedTerm: '学习',
	displayTerm: '学习',
	canonicalTerm: '学习',
	term: '学习',
	normalizedTerm: '学习',
	script: 'simplified',
	simplified: '学习',
	traditional: '學習',
	pinyin: 'xuéxí',
	hanViet: 'HỌC TẬP',
	primaryMeaningVi: 'học tập',
	otherMeaningsVi: [],
	wordClasses: ['động từ'],
	usageNoteVi: null,
	overallExplanationVi: 'x',
	overallMnemonicVi: null,
	lexicalStatus: 'ready',
	decompositionStatus: 'hidden',
	exampleStatus: 'ready',
	characters: [
		{
			position: 0, char: '学', pinyin: 'xué', dictionaryReadings: ['xué'], hanViet: 'HỌC', meaningVi: 'học',
			radical: null, structureType: 'single', structureKind: 'unknown', decompositionDisplayMode: 'hidden',
			components: [], structureExplanationVi: 'Chưa có phân tích cấu tạo đáng tin cậy.', mnemonicVi: null,
			etymologyStatus: 'not_provided', etymologyNoteVi: null, similarCharacters: [],
		},
		{
			position: 1, char: '习', pinyin: 'xí', dictionaryReadings: ['xí'], hanViet: 'TẬP', meaningVi: 'tập',
			radical: null, structureType: 'single', structureKind: 'unknown', decompositionDisplayMode: 'hidden',
			components: [], structureExplanationVi: 'Chưa có phân tích cấu tạo đáng tin cậy.', mnemonicVi: null,
			etymologyStatus: 'not_provided', etymologyNoteVi: null, similarCharacters: [],
		},
	],
	examples: [{ chinese: '我每天学习中文。', pinyin: 'Wǒ měitiān xuéxí Zhōngwén.', meaningVi: 'Tôi học tiếng Trung mỗi ngày.', usageNoteVi: null }],
	warnings: [],
};

/** Terms used for live batch eval and cache introspection scripts */
export const HANZI_LIVE_CORPUS_TERMS = [
	'休息',
	'媽媽',
	'清楚',
	'葡萄',
	'磨練',
	'憂鬱',
	'鑲嵌',
	'廢寢忘食',
] as const;

export type HanziLiveCorpusTerm = (typeof HANZI_LIVE_CORPUS_TERMS)[number];
