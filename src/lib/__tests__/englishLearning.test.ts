import { describe, expect, it } from 'vitest';
import { englishAnswerSchema } from '@/lib/english/schemas';
import { CN_SRS_INTERVAL_DAYS } from '@/config/constants';
import { computeNextReview } from '@/lib/chinese/srsSchedule';
import { ENGLISH_NAV, MAIN_NAV } from '@/config/navigation';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { gradeEnglishAnswer } from '@/lib/english/grade';
import { resolveAudioFile } from '@/lib/english/audioPath';
import { patternMastered, replaySkill, senseMastered, type SkillReplayState } from '@/lib/english/progress';
import { draftsForAssessedPack } from '@/lib/english/questions';
import { sampleEnglishPack } from '@/lib/english/samplePack';
import { clampIntroLimits, planEnglishSession, type PlanPattern, type PlanSense } from '@/lib/english/sessionPlan';
import { maintainMinIdx } from '@/lib/english/stage';
import { shouldSuspendQuestion } from '@/lib/english/suspend';
import { omitDuplicateAnswers } from '@/lib/srs/dedupe';
import { SRS_LADDER, computeNextReviewStep } from '@/lib/srs/schedule';

const now = new Date('2026-06-17T03:00:00Z');

function skill(partial: Partial<SkillReplayState> = {}): SkillReplayState {
	return {
		intervalIdx: 0,
		dueAt: now,
		state: 'learning',
		lastReviewedAt: null,
		correctCount: 0,
		totalCount: 0,
		longGapRecallAt: null,
		usageExampleIds: [],
		credits: [],
		lastExampleId: null,
		...partial,
	};
}

function planSense(partial: Partial<PlanSense> & Pick<PlanSense, 'senseId'>): PlanSense {
	const baseSkill = { intervalIdx: 0, due: false, weak: false, lastExampleId: null };
	return {
		introduced: false,
		gradeExampleCount: 2,
		skills: { meaning: { ...baseSkill }, sound: { ...baseSkill }, usage: { ...baseSkill } },
		questions: [
			{ id: `${partial.senseId}-meaning`, skill: 'meaning', stage: 'new', exampleId: null },
			{ id: `${partial.senseId}-sound`, skill: 'sound', stage: 'new', exampleId: null },
			{ id: `${partial.senseId}-usage-a`, skill: 'usage', stage: 'new', exampleId: 'ex-a' },
			{ id: `${partial.senseId}-usage-b`, skill: 'usage', stage: 'new', exampleId: 'ex-b' },
		],
		...partial,
	};
}

describe('shared review formula', () => {
	it('keeps the Chinese due dates when English uses the same ladder', () => {
		for (let intervalIdx = 0; intervalIdx < CN_SRS_INTERVAL_DAYS.length; intervalIdx++) {
			for (const correct of [true, false]) {
				for (const hintUsed of [false, true]) {
					const chinese = computeNextReview({ intervalIdx, correct, hintUsed, now });
					const shared = computeNextReviewStep({ intervalIdx, correct, hintUsed, now, ladder: SRS_LADDER });
					expect(shared).toEqual(chinese);
				}
			}
		}
	});

	it('stores one clientAnswerId once inside a batch', () => {
		const items = [
			{ clientAnswerId: 'a', answer: '1' },
			{ clientAnswerId: 'a', answer: '2' },
			{ clientAnswerId: 'b', answer: '3' },
		];
		const fresh = omitDuplicateAnswers(items, (item) => item.clientAnswerId, ['b']);
		expect(fresh.map((item) => item.answer)).toEqual(['1']);
	});
});

describe('english content gate', () => {
	const assessment = assessEnglishPack(sampleEnglishPack);

	it('keeps an ambiguous sentence out of graded questions', () => {
		expect(assessment.schemaError).toBeNull();
		const borrow = assessment.words[0];
		expect(borrow?.examples[2]?.gradeEligible).toBe(false);
		expect(borrow?.examples[2]?.issues.some((item) => item.code === 'ambiguous')).toBe(true);
		const drafts = draftsForAssessedPack(assessment);
		expect(drafts.some((draft) => draft.exampleKey === 'word:0:example:2')).toBe(false);
		expect(drafts.filter((draft) => draft.skill === 'usage' && draft.senseKey === 'word:0')).toHaveLength(6);
	});

	it('blocks a sentence that has no full Vietnamese meaning or audio', () => {
		const broken = structuredClone(sampleEnglishPack);
		broken.words[1]!.examples[0]!.meaningVi = 'cho mượn';
		broken.words[1]!.examples[1]!.audioFile = '';
		const result = assessEnglishPack(broken);
		expect(result.words[1]?.examples[0]?.gradeEligible).toBe(false);
		expect(result.words[1]?.examples[1]?.gradeEligible).toBe(false);
		const drafts = draftsForAssessedPack(result);
		expect(drafts.some((draft) => draft.exampleKey === 'word:1:example:0' || draft.exampleKey === 'word:1:example:1')).toBe(false);
	});

	it('builds pattern questions for two different examples', () => {
		const drafts = draftsForAssessedPack(assessment);
		const fills = drafts.filter((draft) => draft.kind === 'pattern_fill');
		expect(new Set(fills.map((draft) => draft.exampleKey)).size).toBe(2);
		expect(drafts.some((draft) => draft.kind === 'pattern_order')).toBe(true);
	});
});

describe('english grading and mastery', () => {
	it('grades on the server text, and audio does not promote usage', () => {
		const heard = gradeEnglishAnswer({
			skill: 'usage',
			answer: 'Borrow',
			expected: 'borrow',
			acceptedAnswers: [],
			audioOpened: true,
			skipped: false,
		});
		expect(heard.displayCorrect).toBe(true);
		expect(heard.promotes).toBe(false);
		expect(heard.penalizes).toBe(false);

		const recalled = gradeEnglishAnswer({
			skill: 'usage',
			answer: 'borrow',
			expected: 'borrow',
			acceptedAnswers: [],
			audioOpened: false,
			skipped: false,
		});
		expect(recalled.promotes).toBe(true);
	});

	it('accepts another plausible word without lowering the step', () => {
		const decision = gradeEnglishAnswer({
			skill: 'usage',
			answer: 'use',
			expected: 'borrow',
			acceptedAnswers: ['use'],
			audioOpened: false,
			skipped: false,
		});
		expect(decision.result).toBe('alternate_plausible');
		expect(decision.penalizes).toBe(false);
		const after = replaySkill([
			{ createdAt: now, result: 'target_correct', audioOpened: false, skill: 'usage', exampleId: 'ex-a' },
			{ createdAt: new Date(now.getTime() + 1000), result: 'alternate_plausible', audioOpened: false, skill: 'usage', exampleId: 'ex-a' },
		], now);
		expect(after.intervalIdx).toBe(1);
	});

	it('recalculates a disputed answer without the unfair drop', () => {
		const base = { audioOpened: false, skill: 'usage' as const, exampleId: 'ex-a' };
		const dropped = replaySkill([
			{ ...base, createdAt: now, result: 'target_correct' },
			{ ...base, createdAt: new Date(now.getTime() + 1000), result: 'wrong' },
		], now);
		const waiting = replaySkill([
			{ ...base, createdAt: now, result: 'target_correct' },
			{ ...base, createdAt: new Date(now.getTime() + 1000), result: 'pending_review' },
		], now);
		expect(dropped.intervalIdx).toBe(0);
		expect(waiting.intervalIdx).toBe(1);
	});

	it('does not treat a repeated sentence as a second context', () => {
		const logs = [1, 2].map((minute) => ({
			createdAt: new Date(now.getTime() + minute * 60_000),
			result: 'target_correct' as const,
			audioOpened: false,
			skill: 'usage' as const,
			exampleId: 'same-sentence',
		}));
		const repeated = replaySkill(logs, now);
		expect(repeated.usageExampleIds).toEqual(['same-sentence']);
		const two = replaySkill([
			logs[0]!,
			{ ...logs[1]!, exampleId: 'other-sentence' },
		], now);
		expect(two.usageExampleIds).toEqual(['same-sentence', 'other-sentence']);
	});

	it('masters a word only after maintain, two contexts, and a 7-day recall', () => {
		const maintain = maintainMinIdx();
		const ready = skill({ intervalIdx: maintain, longGapRecallAt: now });
		const usage = skill({ intervalIdx: maintain, usageExampleIds: ['a', 'b'] });
		expect(senseMastered({ meaning: ready, sound: ready, usage })).toBe(true);
		expect(senseMastered({
			meaning: ready,
			sound: ready,
			usage: skill({ intervalIdx: maintain, usageExampleIds: ['a'] }),
		})).toBe(false);
		expect(senseMastered({
			meaning: skill({ intervalIdx: maintain }),
			sound: skill({ intervalIdx: maintain }),
			usage,
		})).toBe(false);
	});

	it('masters a pattern only from two component sets on different days', () => {
		const maintain = maintainMinIdx();
		expect(patternMastered(skill({
			intervalIdx: maintain,
			credits: [
				{ exampleId: 'pen', dayKey: '2026-06-01' },
				{ exampleId: 'pen', dayKey: '2026-06-08' },
			],
		}))).toBe(false);
		expect(patternMastered(skill({
			intervalIdx: maintain,
			credits: [
				{ exampleId: 'pen', dayKey: '2026-06-01' },
				{ exampleId: 'charger', dayKey: '2026-06-01' },
			],
		}))).toBe(false);
		expect(patternMastered(skill({
			intervalIdx: maintain,
			credits: [
				{ exampleId: 'pen', dayKey: '2026-06-01' },
				{ exampleId: 'charger', dayKey: '2026-06-08' },
			],
		}))).toBe(true);
	});
});

describe('english session plan', () => {
	const pattern = (partial: Partial<PlanPattern> = {}): PlanPattern => ({
		patternId: 'p1',
		introduced: false,
		intervalIdx: 0,
		due: false,
		weak: false,
		lastExampleId: null,
		linkedSenseIds: ['s1'],
		questions: [
			{ id: 'order', skill: 'pattern', stage: 'new', exampleId: 'pen' },
			{ id: 'fill-pen', skill: 'pattern', stage: 'recall', exampleId: 'pen' },
			{ id: 'fill-charger', skill: 'pattern', stage: 'recall', exampleId: 'charger' },
		],
		...partial,
	});

	it('teaches words before a linked pattern and caps the daily introduction', () => {
		expect(clampIntroLimits(100, 9)).toEqual({ words: 10, patterns: 2 });
		const senses = Array.from({ length: 12 }, (_, index) => planSense({ senseId: `s${index}` }));
		const steps = planEnglishSession({
			mode: 'learn',
			senses,
			patterns: [pattern({ linkedSenseIds: ['s0'] }), pattern({ patternId: 'unrelated', linkedSenseIds: ['other'] })],
			wordLimit: 100,
			patternLimit: 9,
		});
		const cards = steps.filter((step) => step.type === 'card');
		expect(cards).toHaveLength(10);
		expect(steps.findIndex((step) => step.type === 'pattern_card')).toBeGreaterThan(steps.findIndex((step) => step.type === 'card'));
		expect(steps.some((step) => step.type === 'pattern_card' && step.patternId === 'unrelated')).toBe(false);
	});

	it('does not place the same question twice in a row and rotates examples', () => {
		const only = planSense({
			senseId: 's1',
			introduced: true,
			skills: {
				meaning: { intervalIdx: 0, due: true, weak: false, lastExampleId: null },
				sound: { intervalIdx: 0, due: false, weak: false, lastExampleId: null },
				usage: { intervalIdx: 0, due: false, weak: false, lastExampleId: null },
			},
			questions: [{ id: 'only', skill: 'meaning', stage: 'new', exampleId: null }],
		});
		expect(planEnglishSession({
			mode: 'review',
			senses: [only],
			patterns: [],
			lastQuestionId: 'only',
		})).toEqual([]);

		const rotated = planEnglishSession({
			mode: 'review',
			senses: [planSense({
				senseId: 's1',
				introduced: true,
				skills: {
					meaning: { intervalIdx: 0, due: false, weak: false, lastExampleId: null },
					sound: { intervalIdx: 0, due: false, weak: false, lastExampleId: null },
					usage: { intervalIdx: 0, due: true, weak: false, lastExampleId: 'ex-a' },
				},
			})],
			patterns: [],
		});
		expect(rotated.map((step) => step.type === 'question' ? step.questionId : step.type)).toEqual(['s1-usage-b']);
	});

	it('keeps usage closed until two graded sentences exist', () => {
		const steps = planEnglishSession({
			mode: 'learn',
			senses: [planSense({ senseId: 's1', gradeExampleCount: 1 })],
			patterns: [],
		});
		expect(steps.some((step) => step.type === 'question' && step.questionId.includes('usage'))).toBe(false);
	});

	it('reviews a pattern with the other example after the first one was credited', () => {
		const steps = planEnglishSession({
			mode: 'review',
			senses: [],
			patterns: [pattern({ introduced: true, due: true, intervalIdx: 2, lastExampleId: 'pen' })],
		});
		expect(steps).toEqual([{ type: 'question', questionId: 'fill-charger', senseId: null, patternId: 'p1' }]);
	});
});

describe('english area boundaries', () => {
	it('does not mix English links into the Chinese menu', () => {
		expect(MAIN_NAV.map((item) => item.href).some((href) => href.startsWith('/english'))).toBe(false);
		expect(ENGLISH_NAV.every((item) => item.href.startsWith('/english'))).toBe(true);
	});

	it('suspends a question after three valid reports or a high audio-open rate', () => {
		expect(shouldSuspendQuestion({ attempts: 2, audioOpens: 2, validDisputeUsers: 3 })).toBe(true);
		expect(shouldSuspendQuestion({ attempts: 8, audioOpens: 7, validDisputeUsers: 0 })).toBe(true);
		expect(shouldSuspendQuestion({ attempts: 8, audioOpens: 2, validDisputeUsers: 1 })).toBe(false);
	});

	it('rejects a client correct flag before grading', () => {
		const parsed = englishAnswerSchema.safeParse({
			questionId: 'q1',
			clientAnswerId: 'c1',
			answer: 'borrow',
			correct: true,
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects audio paths that leave the shared folder', () => {
		expect(resolveAudioFile('/var/learn-chinese/english-audio', '../release/secret.mp3')).toBeNull();
		expect(resolveAudioFile('/var/learn-chinese/english-audio', '/etc/passwd')).toBeNull();
		expect(resolveAudioFile('/var/learn-chinese/english-audio', 'borrow.mp3')).toBe('/var/learn-chinese/english-audio/borrow.mp3');
	});
});
