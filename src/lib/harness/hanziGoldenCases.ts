import type { HanziAiDraftResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import type { HanziKnownFacts } from '@/services/chinese/hanziAi/hanziAiTypes';
import { resultRequiresPedagogyReview } from '@/services/chinese/hanziAi/hanziPedagogy';
import {
	assertArrayEqual,
	assertContains,
	assertEqual,
	assertGreaterThan,
	assertNotEqual,
	assertNotMatch,
	assertTruthy,
} from './hanziAssert';
import { baseDraft, draftCharRow, HANZI_LIVE_CORPUS_TERMS } from './hanziFixtures';

export type HanziGoldenCaseMode = 'validate' | 'trustPolicy' | 'pedagogyPolicy';

export interface HanziGoldenRunContext {
	term: string;
	draft: HanziAiDraftResult;
	facts: HanziKnownFacts;
	validated: ReturnType<typeof import('@/services/chinese/hanziAi/hanziAnalysisValidator').validateHanziAnalysis>;
	trustResult: ReturnType<typeof import('@/services/chinese/hanziAi/hanziTrustPolicy').applyHanziTrustPolicy> | null;
	pedagogyResult: ReturnType<typeof import('@/services/chinese/hanziAi/hanziPedagogy').applyPedagogyPolicy> | null;
}

export interface HanziGoldenCase {
	id: string;
	term: string;
	buildDraft: () => HanziAiDraftResult;
	facts?: HanziKnownFacts;
	mode: HanziGoldenCaseMode;
	tags?: string[];
	assert: (ctx: HanziGoldenRunContext) => void;
}

const emptyFacts: HanziKnownFacts = { termLevel: {}, characterLevel: [] };

export const HANZI_GOLDEN_CASES: HanziGoldenCase[] = [
	{
		id: 'xiu-semantic-wood',
		term: '休',
		mode: 'validate',
		buildDraft: () => baseDraft('休', [
			draftCharRow('休', 0, {
				pinyin: 'xiū',
				hanViet: 'Hưu',
				meaningVi: 'nghỉ',
				structureType: 'left_right',
				radical: { char: '亻', nameVi: 'nhân', meaningVi: 'người' },
				components: [
					{ char: '亻', position: 0, role: 'semantic', meaningVi: 'người', explanationVi: 'Bộ nhân.', isMainRadical: true },
					{ char: '木', position: 1, role: 'form', meaningVi: 'cây', explanationVi: 'Biểu thị âm gần xiū.', isMainRadical: false },
				],
				mnemonicVi: '亻 + 木 → người dựa cây nghỉ.',
			}),
		], {
			term: '休', pinyin: 'xiū', hanViet: 'Hưu', primaryMeaningVi: 'nghỉ',
			examples: [{ chinese: '我们休息一下。', pinyin: 'Wǒmen xiūxi yīxià.', meaningVi: 'Chúng ta nghỉ một chút.', usageNoteVi: null }],
		}),
		tags: ['trust', 'phonetic-strip'],
		assert: ({ validated }) => {
			assertArrayEqual(validated.errors, []);
			const wood = validated.result!.characters[0].components.find((c) => c.char === '木');
			assertNotEqual(wood?.relation, 'phonetic');
			assertTruthy(wood?.publishExplanationVi);
			assertContains(wood!.publishExplanationVi!, 'gợi ý nghĩa');
			assertEqual(validated.result!.characters[0].structureKind, 'associative_compound');
			assertTruthy(validated.result!.characters[0].mnemonicVi);
			assertContains(validated.result!.characters[0].mnemonicVi!, '→');
		},
	},
	{
		id: 'qing-qing-modern-phonetic',
		term: '清楚',
		mode: 'trustPolicy',
		buildDraft: () => baseDraft('清楚', [
			draftCharRow('清', 0, {
				pinyin: 'qīng', hanViet: 'Thanh', meaningVi: 'trong',
				radical: { char: '氵', nameVi: 'thủy', meaningVi: 'nước' },
				components: [
					{ char: '氵', position: 0, role: 'semantic', meaningVi: 'nước', explanationVi: 'Bộ thủy.', isMainRadical: true },
					{ char: '青', position: 1, role: 'form', meaningVi: 'xanh', explanationVi: 'Phần bên phải.', isMainRadical: false },
				],
			}),
			draftCharRow('楚', 1, { pinyin: 'chǔ', hanViet: 'Sở', meaningVi: 'rõ', components: [] }),
		], {
			term: '清楚', pinyin: 'qīngchu', primaryMeaningVi: 'rõ ràng',
			examples: [{ chinese: '这个问题很清楚。', pinyin: 'Zhège wèntí hěn qīngchu.', meaningVi: 'Vấn đề rất rõ.', usageNoteVi: null }],
		}),
		tags: ['trust', 'phonetic'],
		assert: ({ trustResult }) => {
			const qing = trustResult!.result.characters[0].components.find((c) => c.char === '青');
			assertEqual(qing?.claimTrust, 'curated');
			assertEqual(qing?.phoneticKind, 'modern');
			assertTruthy(qing?.publishExplanationVi);
			assertContains(qing!.publishExplanationVi!, 'gợi âm');
		},
	},
	{
		id: 'ma-ma-phonetic-allowlist',
		term: '媽',
		mode: 'trustPolicy',
		buildDraft: () => baseDraft('媽', [
			draftCharRow('媽', 0, {
				pinyin: 'mā', hanViet: 'Mụ', meaningVi: 'mẹ',
				components: [
					{ char: '女', position: 0, role: 'semantic', meaningVi: 'nữ', explanationVi: 'Bộ nữ.', isMainRadical: true },
					{ char: '馬', position: 1, role: 'form', meaningVi: 'ngựa', explanationVi: 'Phần phải.', isMainRadical: false },
				],
			}),
		], {
			term: '媽', pinyin: 'mā', hanViet: 'Mụ', primaryMeaningVi: 'mẹ',
			examples: [{ chinese: '我愛媽媽。', pinyin: 'Wǒ ài māma.', meaningVi: 'Tôi yêu mẹ.', usageNoteVi: null }],
		}),
		tags: ['trust', 'phonetic'],
		assert: ({ trustResult }) => {
			const ma = trustResult!.result.characters[0].components.find((c) => c.char === '馬');
			assertEqual(ma?.relation, 'phonetic');
			assertEqual(ma?.claimTrust, 'curated');
		},
	},
	{
		id: 'qin-forbidden-decomposition',
		term: '寢',
		mode: 'validate',
		buildDraft: () => baseDraft('寢', [
			draftCharRow('寢', 0, {
				pinyin: 'qǐn', hanViet: 'Tẩm', meaningVi: 'ngủ',
				components: [
					{ char: '宀', position: 0, role: 'semantic', meaningVi: 'mái', explanationVi: 'Bộ miên.', isMainRadical: true },
					{ char: '侵', position: 1, role: 'semantic', meaningVi: 'ngủ cổ', explanationVi: '侵 nghĩa ngủ.', isMainRadical: false },
				],
			}),
		], {
			term: '寢', pinyin: 'qǐn', primaryMeaningVi: 'ngủ',
			examples: [{ chinese: '他在寢室。', pinyin: 'Tā zài qǐnshì.', meaningVi: 'Anh ở phòng ngủ.', usageNoteVi: null }],
		}),
		tags: ['trust', 'forbidden'],
		assert: ({ validated }) => {
			assertGreaterThan(validated.errors.length, 0);
		},
	},
	{
		id: 'qin-similar-characters-allowed',
		term: '寢',
		mode: 'validate',
		buildDraft: () => baseDraft('寢', [
			draftCharRow('寢', 0, {
				pinyin: 'qǐn',
				components: [{ char: '宀', position: 0, role: 'form', meaningVi: null, explanationVi: 'Mái nhà.', isMainRadical: true }],
				similarCharacters: [{ char: '侵', differenceVi: 'Khác nghĩa — không liên quan trực tiếp.' }],
			}),
		], {
			term: '寢', pinyin: 'qǐn', primaryMeaningVi: 'ngủ',
			examples: [{ chinese: '他在寢室。', pinyin: 'x', meaningVi: 'y', usageNoteVi: null }],
		}),
		tags: ['trust'],
		assert: ({ validated }) => {
			assertArrayEqual(validated.errors, []);
			assertEqual(validated.result!.characters[0].similarCharacters[0].char, '侵');
		},
	},
	{
		id: 'yu-visual-shallow',
		term: '鬱',
		mode: 'trustPolicy',
		buildDraft: () => baseDraft('鬱', [
			draftCharRow('鬱', 0, {
				pinyin: 'yù',
				components: [
					{ char: '木', position: 0, role: 'form', meaningVi: null, explanationVi: 'Cây.', isMainRadical: false },
					{ char: '缶', position: 1, role: 'form', meaningVi: null, explanationVi: 'Vò.', isMainRadical: false },
					{ char: '鬯', position: 2, role: 'form', meaningVi: null, explanationVi: 'Rượu.', isMainRadical: true },
				],
			}),
		], {
			term: '鬱', pinyin: 'yù', primaryMeaningVi: 'u sầu',
			examples: [{ chinese: '他很鬱。', pinyin: 'Tā hěn yù.', meaningVi: 'Anh rất u sầu.', usageNoteVi: null }],
		}),
		tags: ['trust', 'visual'],
		assert: ({ trustResult }) => {
			assertEqual(trustResult!.result.characters[0].decompositionDisplayMode, 'visual_only');
		},
	},
	{
		id: 'xiuxi-overlap-warns',
		term: '休息',
		mode: 'validate',
		buildDraft: () => baseDraft('休息', [
			draftCharRow('休', 0, { pinyin: 'xiū', meaningVi: 'nghỉ', hanViet: 'Hưu', components: [
				{ char: '亻', position: 0, role: 'semantic', meaningVi: 'người', explanationVi: 'Người.', isMainRadical: true },
				{ char: '木', position: 1, role: 'semantic', meaningVi: 'cây', explanationVi: 'Cây.', isMainRadical: false },
			] }),
			draftCharRow('息', 1, { pinyin: 'xī', meaningVi: 'hơi thở', hanViet: 'Tức', components: [] }),
		], {
			term: '休息', pinyin: 'xiūxi', primaryMeaningVi: 'nghỉ ngơi', otherMeaningsVi: ['nghỉ'],
			examples: [{ chinese: '我们休息一下。', pinyin: 'Wǒmen xiūxi.', meaningVi: 'Nghỉ chút.', usageNoteVi: null }],
		}),
		tags: ['corpus'],
		assert: ({ validated }) => {
			assertArrayEqual(validated.errors, []);
			assertEqual(validated.result!.warnings.some((w) => w.includes('otherMeaningsVi')), true);
		},
	},
	{
		id: 'chu-zhi-historical-phonetic',
		term: '楚',
		mode: 'trustPolicy',
		buildDraft: () => baseDraft('楚', [
			draftCharRow('楚', 0, {
				pinyin: 'chǔ', hanViet: 'Sở', meaningVi: 'nước Sở',
				components: [
					{ char: '林', position: 0, role: 'semantic', meaningVi: 'rừng', explanationVi: 'Bộ lâm.', isMainRadical: true },
					{ char: '疋', position: 1, role: 'form', meaningVi: null, explanationVi: 'Phần dưới.', isMainRadical: false },
				],
			}),
		], {
			term: '楚', pinyin: 'chǔ', primaryMeaningVi: 'nước Sở',
			examples: [{ chinese: '他是楚国人。', pinyin: 'Tā shì Chǔguó rén.', meaningVi: 'Anh là người nước Sở.', usageNoteVi: null }],
		}),
		tags: ['trust', 'phonetic'],
		assert: ({ trustResult }) => {
			const zhi = trustResult!.result.characters[0].components.find((c) => c.char === '疋');
			assertEqual(zhi?.phoneticKind, 'historical');
			assertTruthy(zhi?.publishExplanationVi);
			assertContains(zhi!.publishExplanationVi!, 'lịch sử');
			assertNotMatch(zhi!.publishExplanationVi!, /đọc chǔ/i);
		},
	},
	{
		id: 'you-ye-form-not-phonetic',
		term: '憂',
		mode: 'trustPolicy',
		buildDraft: () => baseDraft('憂', [
			draftCharRow('憂', 0, {
				pinyin: 'yōu',
				components: [
					{ char: '頁', position: 0, role: 'form', meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false },
					{ char: '心', position: 1, role: 'semantic', meaningVi: 'lòng', explanationVi: 'Bộ tâm.', isMainRadical: true },
				],
			}),
		], {
			term: '憂', pinyin: 'yōu', primaryMeaningVi: 'lo âu',
			examples: [{ chinese: '他很憂。', pinyin: 'Tā hěn yōu.', meaningVi: 'Anh lo.', usageNoteVi: null }],
		}),
		tags: ['trust', 'pedagogy'],
		assert: ({ trustResult }) => {
			const page = trustResult!.result.characters[0].components.find((c) => c.char === '頁');
			assertNotEqual(page?.relation, 'phonetic');
		},
	},
	{
		id: 'you-pedagogy-page-form',
		term: '憂',
		mode: 'validate',
		buildDraft: () => baseDraft('憂', [
			draftCharRow('憂', 0, {
				pinyin: 'yōu',
				components: [
					{ char: '頁', position: 0, role: 'form', meaningVi: null, explanationVi: 'Gợi âm từ yè → yōu.', isMainRadical: false },
					{ char: '夂', position: 1, role: 'form', meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false },
					{ char: '心', position: 2, role: 'semantic', meaningVi: 'lòng', explanationVi: 'Gợi nghĩa lo âu.', isMainRadical: true },
				],
				etymologyStatus: 'not_provided',
			}),
		], {
			term: '憂', pinyin: 'yōu', primaryMeaningVi: 'lo âu',
			examples: [{ chinese: '他很憂。', pinyin: 'Tā hěn yōu.', meaningVi: 'Anh lo.', usageNoteVi: null }],
		}),
		tags: ['pedagogy'],
		assert: ({ validated, facts }) => {
			assertArrayEqual(validated.errors, []);
			const page = validated.result!.characters[0].components.find((c) => c.char === '頁');
			assertEqual(page?.role, 'form');
			assertEqual(resultRequiresPedagogyReview(validated.result!, facts), false);
		},
	},
	{
		id: 'yu-pedagogy-visual-only',
		term: '鬱',
		mode: 'pedagogyPolicy',
		buildDraft: () => baseDraft('鬱', [
			draftCharRow('鬱', 0, {
				pinyin: 'yù',
				components: [
					{ char: '林', position: 0, role: 'form', meaningVi: null, explanationVi: 'Gợi âm yù.', isMainRadical: false },
					{ char: '鬯', position: 1, role: 'form', meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false },
				],
				etymologyStatus: 'uncertain',
			}),
		], {
			term: '鬱', pinyin: 'yù', primaryMeaningVi: 'u sầu',
			examples: [{ chinese: '他很鬱。', pinyin: 'Tā hěn yù.', meaningVi: 'Anh u sầu.', usageNoteVi: null }],
		}),
		tags: ['pedagogy', 'corpus'],
		assert: ({ pedagogyResult }) => {
			assertEqual(pedagogyResult!.result.characters[0].components.every((c) => c.role !== 'phonetic'), true);
			assertEqual(pedagogyResult!.result.characters[0].decompositionDisplayMode, 'visual_only');
		},
	},
	{
		id: 'youyu-script-metadata',
		term: '憂鬱',
		mode: 'validate',
		buildDraft: () => baseDraft('憂鬱', [
			draftCharRow('憂', 0, {
				pinyin: 'yōu',
				components: [
					{ char: '夂', position: 0, role: 'form', meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false },
					{ char: '心', position: 1, role: 'form', meaningVi: 'lòng', explanationVi: 'Phần dưới.', isMainRadical: true },
				],
			}),
			draftCharRow('鬱', 1, {
				pinyin: 'yù',
				components: [
					{ char: '林', position: 0, role: 'form', meaningVi: null, explanationVi: 'Phần giữa.', isMainRadical: false },
					{ char: '鬯', position: 1, role: 'form', meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false },
					{ char: '冖', position: 2, role: 'form', meaningVi: null, explanationVi: 'Mái.', isMainRadical: false },
					{ char: '彡', position: 3, role: 'form', meaningVi: null, explanationVi: 'Bên phải.', isMainRadical: false },
				],
			}),
		], { script: 'traditional', simplified: '忧郁', traditional: '憂鬱' }),
		tags: ['corpus', 'pedagogy'],
		assert: ({ validated }) => {
			assertArrayEqual(validated.errors, []);
			assertTruthy(validated.result!.usageNoteVi);
			assertContains(validated.result!.usageNoteVi!, '憂鬱症');
			assertEqual(validated.result!.script, 'traditional');
		},
	},
	{
		id: 'an-simple-semantic',
		term: '安',
		mode: 'validate',
		buildDraft: () => baseDraft('安', [
			draftCharRow('安', 0, {
				pinyin: 'ān',
				hanViet: 'AN',
				meaningVi: 'yên',
				structureType: 'top_bottom',
				components: [
					{ char: '宀', position: 0, role: 'semantic', meaningVi: 'mái nhà', explanationVi: 'Gợi nghĩa nơi ở.', isMainRadical: true },
					{ char: '女', position: 1, role: 'form', meaningVi: null, explanationVi: 'Người dưới mái nhà.', isMainRadical: false },
				],
				etymologyStatus: 'supported',
				etymologyNoteVi: 'Hình tượng người dưới mái nhà — giải thích từ nguyên phổ biến.',
			}),
		], {
			term: '安', pinyin: 'ān', hanViet: 'AN', primaryMeaningVi: 'yên ổn',
			script: 'simplified', simplified: '安', traditional: '安',
			examples: [{ chinese: '很安。', pinyin: 'Hěn ān.', meaningVi: 'Rất yên.', usageNoteVi: null }],
		}),
		tags: ['pedagogy', 'regression'],
		assert: ({ validated, facts }) => {
			assertArrayEqual(validated.errors, []);
			assertEqual(validated.result!.characters[0].components.find((c) => c.char === '女')?.role, 'form');
			assertEqual(resultRequiresPedagogyReview(validated.result!, facts), false);
		},
	},
];

export function getHanziGoldenCaseIds(): string[] {
	return HANZI_GOLDEN_CASES.map((c) => c.id);
}

export function getHanziCorpusTerms(): readonly string[] {
	const fromCases = new Set(HANZI_GOLDEN_CASES.map((c) => c.term));
	for (const term of HANZI_LIVE_CORPUS_TERMS) fromCases.add(term);
	return [...fromCases].sort();
}

export { emptyFacts as HANZI_EMPTY_FACTS };
