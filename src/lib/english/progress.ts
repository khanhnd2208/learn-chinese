import { EN_LONG_GAP_MS, EN_USAGE_MIN_GRADE_EXAMPLES } from '@/lib/english/constants';
import type { GradeResultName } from '@/lib/english/grade';
import { maintainMinIdx, type EnglishSkillName } from '@/lib/english/stage';
import { studyDayKey } from '@/lib/english/text';
import { SRS_LADDER, computeNextReviewStep, type SrsProgressState } from '@/lib/srs/schedule';

export interface ReplayLog {
	createdAt: Date;
	result: GradeResultName;
	audioOpened: boolean;
	skill: EnglishSkillName;
	exampleId: string | null;
}

export interface PatternCredit {
	exampleId: string;
	dayKey: string;
}

export interface SkillReplayState {
	intervalIdx: number;
	dueAt: Date;
	state: SrsProgressState;
	lastReviewedAt: Date | null;
	correctCount: number;
	totalCount: number;
	longGapRecallAt: Date | null;
	usageExampleIds: string[];
	credits: PatternCredit[];
	lastExampleId: string | null;
}

export function emptySkill(now: Date): SkillReplayState {
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
	};
}

/** Audio on a usage item proves the learner heard the sentence, not that they recalled the word. */
export function effectOfLog(log: ReplayLog): 'promote' | 'penalize' | 'hold' {
	if (log.result === 'wrong') return 'penalize';
	if (log.result === 'target_correct' && !(log.skill === 'usage' && log.audioOpened)) return 'promote';
	return 'hold';
}

export function applySkillLog(state: SkillReplayState, log: ReplayLog): SkillReplayState {
	const next: SkillReplayState = {
		...state,
		usageExampleIds: [...state.usageExampleIds],
		credits: [...state.credits],
		lastExampleId: log.exampleId ?? state.lastExampleId,
	};
	const effect = effectOfLog(log);
	if (effect === 'hold') return next;

	if (effect === 'promote' && next.lastReviewedAt) {
		const gap = log.createdAt.getTime() - next.lastReviewedAt.getTime();
		if (gap >= EN_LONG_GAP_MS) next.longGapRecallAt = log.createdAt;
	}
	const stepped = computeNextReviewStep({
		intervalIdx: next.intervalIdx,
		correct: effect === 'promote',
		now: log.createdAt,
		ladder: SRS_LADDER,
	});
	next.intervalIdx = stepped.intervalIdx;
	next.dueAt = stepped.dueAt;
	next.state = stepped.state;
	next.lastReviewedAt = log.createdAt;
	next.totalCount += 1;
	if (effect === 'promote') {
		next.correctCount += 1;
		if (log.skill === 'usage' && log.exampleId && !next.usageExampleIds.includes(log.exampleId)) {
			next.usageExampleIds.push(log.exampleId);
		}
		if (log.skill === 'pattern' && log.exampleId) {
			next.credits.push({ exampleId: log.exampleId, dayKey: studyDayKey(log.createdAt) });
		}
	}
	return next;
}

export function replaySkill(logs: ReplayLog[], now: Date): SkillReplayState {
	const ordered = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return ordered.reduce((state, log) => applySkillLog(state, log), emptySkill(now));
}

export function usageUnlocked(gradeExampleCount: number): boolean {
	return gradeExampleCount >= EN_USAGE_MIN_GRADE_EXAMPLES;
}

export function senseMastered(skills: {
	meaning: SkillReplayState;
	sound: SkillReplayState;
	usage: SkillReplayState;
}): boolean {
	const maintain = (skill: SkillReplayState) => skill.intervalIdx >= maintainMinIdx();
	const longGap = [skills.meaning, skills.sound, skills.usage].some((skill) => skill.longGapRecallAt != null);
	return maintain(skills.meaning)
		&& maintain(skills.sound)
		&& maintain(skills.usage)
		&& skills.usage.usageExampleIds.length >= 2
		&& longGap;
}

export function patternMastered(state: SkillReplayState): boolean {
	const examples = new Set(state.credits.map((credit) => credit.exampleId));
	const days = new Set(state.credits.map((credit) => credit.dayKey));
	return state.intervalIdx >= maintainMinIdx() && examples.size >= 2 && days.size >= 2;
}
