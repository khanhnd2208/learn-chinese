import { prisma } from '@/lib/prisma';
import {
	EN_NEW_PATTERNS_DEFAULT,
	EN_NEW_PATTERNS_MAX,
	EN_NEW_WORDS_DEFAULT,
	EN_NEW_WORDS_MAX,
} from '@/lib/english/constants';
import { planEnglishSession, type PlanPattern, type PlanQuestion, type PlanSense } from '@/lib/english/sessionPlan';
import { studyDayKey } from '@/lib/english/text';

export interface EnglishSessionPayload {
	items: Array<{
		type: 'card' | 'pattern_card' | 'question';
		senseId: string | null;
		patternId: string | null;
		questionId: string | null;
		card: {
			lemma: string;
			ipa: string;
			stress: string;
			meaningVi: string;
			partOfSpeech: string;
			collocations: string[];
			pitfallVi: string;
			audioUrl: string | null;
			examples: Array<{ english: string; meaningVi: string; audioUrl: string | null }>;
		} | null;
		pattern: {
			purposeVi: string;
			frame: string;
			pitfallVi: string;
			examples: Array<{ english: string; meaningVi: string; audioUrl: string | null }>;
		} | null;
		question: {
			id: string;
			skill: string;
			kind: string;
			stage: string;
			prompt: unknown;
			hasAudio: boolean;
		} | null;
	}>;
}

function revealed(english: string, target: string): string {
	return english.includes('___') ? english.replace('___', target) : english;
}

function onDay(date: Date | null, day: string): boolean {
	return date != null && studyDayKey(date) === day;
}

async function introduceSense(userId: string, senseId: string, now: Date) {
	for (const skill of ['meaning', 'sound', 'usage'] as const) {
		const existing = await prisma.enSenseSkill.findUnique({
			where: { userId_senseId_skill: { userId, senseId, skill } },
		});
		if (!existing) {
			await prisma.enSenseSkill.create({
				data: { userId, senseId, skill, introducedAt: now, dueAt: now, state: 'learning' },
			});
		} else if (!existing.introducedAt) {
			await prisma.enSenseSkill.update({ where: { id: existing.id }, data: { introducedAt: now } });
		}
	}
}

async function introducePattern(userId: string, patternId: string, now: Date) {
	const existing = await prisma.enPatternProgress.findUnique({
		where: { userId_patternId: { userId, patternId } },
	});
	if (!existing) {
		await prisma.enPatternProgress.create({
			data: { userId, patternId, introducedAt: now, dueAt: now, state: 'learning' },
		});
	} else if (!existing.introducedAt) {
		await prisma.enPatternProgress.update({ where: { id: existing.id }, data: { introducedAt: now } });
	}
}

export async function buildEnglishSession(userId: string, input: {
	mode: 'learn' | 'review' | 'weak';
	words?: number;
	patterns?: number;
	lastQuestionId?: string | null;
}): Promise<EnglishSessionPayload> {
	const now = new Date();
	const today = studyDayKey(now);
	const enrollments = await prisma.enEnrollment.findMany({
		where: { userId, set: { status: 'published' } },
		include: {
			set: {
				include: {
					items: {
						orderBy: { position: 'asc' },
						include: {
							sense: {
								include: {
									word: true,
									examples: { where: { status: 'published' } },
									skills: { where: { userId } },
									questions: { where: { status: 'published' } },
								},
							},
							pattern: {
								include: {
									examples: { where: { status: 'published' } },
									senses: true,
									questions: { where: { status: 'published' } },
									progress: { where: { userId } },
								},
							},
						},
					},
				},
			},
		},
	});

	const senses = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => (
		item.sense?.status === 'published' ? [item.sense] : []
	)));
	const patterns = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => (
		item.pattern?.status === 'published' ? [item.pattern] : []
	)));
	const introducedWordsToday = senses.filter((sense) => sense.skills.some((skill) => skill.skill === 'meaning' && onDay(skill.introducedAt, today))).length;
	const introducedPatternsToday = patterns.filter((pattern) => pattern.progress.some((row) => onDay(row.introducedAt, today))).length;
	const wordRoom = Math.max(0, EN_NEW_WORDS_MAX - introducedWordsToday);
	const patternRoom = Math.max(0, EN_NEW_PATTERNS_MAX - introducedPatternsToday);

	const planSenses: PlanSense[] = senses.map((sense) => {
		const skillRow = (name: 'meaning' | 'sound' | 'usage') => sense.skills.find((skill) => skill.skill === name);
		const toPlan = (name: 'meaning' | 'sound' | 'usage') => {
			const row = skillRow(name);
			return {
				intervalIdx: row?.intervalIdx ?? 0,
				due: Boolean(row?.introducedAt && row.dueAt.getTime() <= now.getTime()),
				weak: row?.state === 'weak',
				lastExampleId: row?.lastExampleId ?? null,
			};
		};
		const questions: PlanQuestion[] = sense.questions.map((question) => ({
			id: question.id,
			skill: question.skill,
			stage: question.stage,
			exampleId: question.exampleId,
		}));
		return {
			senseId: sense.id,
			introduced: Boolean(skillRow('meaning')?.introducedAt),
			gradeExampleCount: sense.examples.filter((example) => example.role === 'grade').length,
			skills: { meaning: toPlan('meaning'), sound: toPlan('sound'), usage: toPlan('usage') },
			questions,
		};
	});
	const planPatterns: PlanPattern[] = patterns.map((pattern) => {
		const row = pattern.progress[0];
		return {
			patternId: pattern.id,
			introduced: Boolean(row?.introducedAt),
			intervalIdx: row?.intervalIdx ?? 0,
			due: Boolean(row?.introducedAt && row.dueAt.getTime() <= now.getTime()),
			weak: row?.state === 'weak',
			lastExampleId: row?.lastExampleId ?? null,
			linkedSenseIds: pattern.senses.map((link) => link.senseId),
			questions: pattern.questions.map((question) => ({
				id: question.id,
				skill: question.skill,
				stage: question.stage,
				exampleId: question.patternExampleId,
			})),
		};
	});

	const steps = planEnglishSession({
		mode: input.mode,
		senses: planSenses,
		patterns: planPatterns,
		wordLimit: Math.min(input.words ?? EN_NEW_WORDS_DEFAULT, wordRoom),
		patternLimit: Math.min(input.patterns ?? EN_NEW_PATTERNS_DEFAULT, patternRoom),
		lastQuestionId: input.lastQuestionId,
	});

	if (input.mode === 'learn') {
		for (const step of steps) {
			if (step.type === 'card') await introduceSense(userId, step.senseId, now);
			if (step.type === 'pattern_card') await introducePattern(userId, step.patternId, now);
		}
	}

	const senseById = new Map(senses.map((sense) => [sense.id, sense]));
	const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
	const questionById = new Map([
		...senses.flatMap((sense) => sense.questions.map((question) => [question.id, question] as const)),
		...patterns.flatMap((pattern) => pattern.questions.map((question) => [question.id, question] as const)),
	]);

	const items: EnglishSessionPayload['items'] = [];
	for (const step of steps) {
		if (step.type === 'card') {
			const sense = senseById.get(step.senseId);
			if (!sense) continue;
			items.push({
				type: 'card',
				senseId: sense.id,
				patternId: null,
				questionId: null,
				card: {
					lemma: sense.word.lemma,
					ipa: sense.word.ipa,
					stress: sense.word.stress,
					meaningVi: sense.meaningVi,
					partOfSpeech: sense.word.partOfSpeech,
					collocations: sense.collocations,
					pitfallVi: sense.pitfallVi,
					audioUrl: sense.word.audioPath ? `/api/english/audio?senseId=${sense.id}` : null,
					examples: sense.examples.map((example) => ({
						english: revealed(example.english, example.target),
						meaningVi: example.meaningVi,
						audioUrl: example.audioPath ? `/api/english/audio?exampleId=${example.id}` : null,
					})),
				},
				pattern: null,
				question: null,
			});
			continue;
		}
		if (step.type === 'pattern_card') {
			const pattern = patternById.get(step.patternId);
			if (!pattern) continue;
			items.push({
				type: 'pattern_card',
				senseId: null,
				patternId: pattern.id,
				questionId: null,
				card: null,
				pattern: {
					purposeVi: pattern.purposeVi,
					frame: pattern.frame,
					pitfallVi: pattern.pitfallVi,
					examples: pattern.examples.map((example) => ({
						english: example.english,
						meaningVi: example.meaningVi,
						audioUrl: example.audioPath ? `/api/english/audio?patternExampleId=${example.id}` : null,
					})),
				},
				question: null,
			});
			continue;
		}
		const question = questionById.get(step.questionId);
		if (!question) continue;
		items.push({
			type: 'question',
			senseId: step.senseId,
			patternId: step.patternId,
			questionId: question.id,
			card: null,
			pattern: null,
			question: {
				id: question.id,
				skill: question.skill,
				kind: question.kind,
				stage: question.stage,
				prompt: question.prompt,
				hasAudio: question.audioPath.length > 0,
			},
		});
	}

	return { items };
}
