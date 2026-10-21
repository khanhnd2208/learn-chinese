import {
	EN_NEW_PATTERNS_DEFAULT,
	EN_NEW_PATTERNS_MAX,
	EN_NEW_WORDS_DEFAULT,
	EN_NEW_WORDS_MAX,
	EN_REVIEW_BATCH,
	EN_USAGE_MIN_GRADE_EXAMPLES,
} from '@/lib/english/constants';
import { promptStage, type EnglishSkillName, type EnglishStageName } from '@/lib/english/stage';

export interface PlanQuestion {
	id: string;
	skill: EnglishSkillName;
	stage: EnglishStageName;
	exampleId: string | null;
}

export interface PlanSkill {
	intervalIdx: number;
	due: boolean;
	weak: boolean;
	lastExampleId: string | null;
}

export interface PlanSense {
	senseId: string;
	introduced: boolean;
	gradeExampleCount: number;
	skills: {
		meaning: PlanSkill;
		sound: PlanSkill;
		usage: PlanSkill;
	};
	questions: PlanQuestion[];
}

export interface PlanPattern {
	patternId: string;
	introduced: boolean;
	intervalIdx: number;
	due: boolean;
	weak: boolean;
	lastExampleId: string | null;
	linkedSenseIds: string[];
	questions: PlanQuestion[];
}

export type SessionStep =
	| { type: 'card'; senseId: string }
	| { type: 'pattern_card'; patternId: string }
	| { type: 'question'; questionId: string; senseId: string | null; patternId: string | null };

export function clampIntroLimits(words?: number, patterns?: number): { words: number; patterns: number } {
	const wordCount = Number.isFinite(words) ? Math.floor(words ?? EN_NEW_WORDS_DEFAULT) : EN_NEW_WORDS_DEFAULT;
	const patternCount = Number.isFinite(patterns) ? Math.floor(patterns ?? EN_NEW_PATTERNS_DEFAULT) : EN_NEW_PATTERNS_DEFAULT;
	return {
		words: Math.min(Math.max(wordCount, 0), EN_NEW_WORDS_MAX),
		patterns: Math.min(Math.max(patternCount, 0), EN_NEW_PATTERNS_MAX),
	};
}

function pickQuestion(
	questions: PlanQuestion[],
	skill: EnglishSkillName,
	intervalIdx: number,
	lastQuestionId: string | null,
	lastExampleId: string | null,
): PlanQuestion | null {
	const stage = promptStage(skill, intervalIdx);
	const ranked = questions
		.filter((question) => question.skill === skill)
		.sort((a, b) => a.id.localeCompare(b.id));
	const staged = ranked.filter((question) => question.stage === stage);
	let pool = staged.length ? staged : ranked;
	if (lastExampleId) {
		const other = pool.filter((question) => question.exampleId && question.exampleId !== lastExampleId);
		if (other.length) pool = other;
	}
	return pool.find((question) => question.id !== lastQuestionId) ?? null;
}

function overlap(pattern: PlanPattern, senseIds: Set<string>): number {
	return pattern.linkedSenseIds.filter((id) => senseIds.has(id)).length;
}

export function planEnglishSession(input: {
	mode: 'learn' | 'review' | 'weak';
	senses: PlanSense[];
	patterns: PlanPattern[];
	wordLimit?: number;
	patternLimit?: number;
	lastQuestionId?: string | null;
}): SessionStep[] {
	let lastQuestionId = input.lastQuestionId ?? null;
	const steps: SessionStep[] = [];

	const pushQuestion = (question: PlanQuestion, senseId: string | null, patternId: string | null) => {
		steps.push({ type: 'question', questionId: question.id, senseId, patternId });
		lastQuestionId = question.id;
	};

	if (input.mode === 'learn') {
		const limits = clampIntroLimits(input.wordLimit, input.patternLimit);
		const fresh = input.senses.filter((sense) => !sense.introduced).slice(0, limits.words);
		for (const sense of fresh) {
			steps.push({ type: 'card', senseId: sense.senseId });
			for (const skill of ['meaning', 'sound', 'usage'] as const) {
				if (skill === 'usage' && sense.gradeExampleCount < EN_USAGE_MIN_GRADE_EXAMPLES) continue;
				const question = pickQuestion(
					sense.questions,
					skill,
					sense.skills[skill].intervalIdx,
					lastQuestionId,
					sense.skills[skill].lastExampleId,
				);
				if (question) pushQuestion(question, sense.senseId, null);
			}
		}
		const selected = new Set(fresh.map((sense) => sense.senseId));
		const known = new Set(input.senses.filter((sense) => sense.introduced).map((sense) => sense.senseId));
		const patterns = input.patterns
			.filter((pattern) => !pattern.introduced && pattern.linkedSenseIds.some((id) => selected.has(id) || known.has(id)))
			.sort((a, b) => overlap(b, selected) - overlap(a, selected) || a.patternId.localeCompare(b.patternId));
		for (const pattern of patterns.slice(0, limits.patterns)) {
			steps.push({ type: 'pattern_card', patternId: pattern.patternId });
			const question = pickQuestion(pattern.questions, 'pattern', pattern.intervalIdx, lastQuestionId, pattern.lastExampleId);
			if (question) pushQuestion(question, null, pattern.patternId);
		}
		return steps;
	}

	const want = input.mode === 'weak'
		? (skill: PlanSkill) => skill.weak
		: (skill: PlanSkill) => skill.due;

	for (const sense of input.senses.filter((item) => item.introduced)) {
		for (const skill of ['meaning', 'sound', 'usage'] as const) {
			if (skill === 'usage' && sense.gradeExampleCount < EN_USAGE_MIN_GRADE_EXAMPLES) continue;
			if (!want(sense.skills[skill])) continue;
			const question = pickQuestion(
				sense.questions,
				skill,
				sense.skills[skill].intervalIdx,
				lastQuestionId,
				sense.skills[skill].lastExampleId,
			);
			if (question) pushQuestion(question, sense.senseId, null);
		}
	}
	const patterns = input.patterns.filter((pattern) => pattern.introduced && (input.mode === 'weak' ? pattern.weak : pattern.due));
	for (const pattern of patterns) {
		const question = pickQuestion(pattern.questions, 'pattern', pattern.intervalIdx, lastQuestionId, pattern.lastExampleId);
		if (question) pushQuestion(question, null, pattern.patternId);
	}
	return steps.slice(0, EN_REVIEW_BATCH);
}
