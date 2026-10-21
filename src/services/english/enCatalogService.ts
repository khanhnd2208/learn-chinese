import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_NEW_PATTERNS_DEFAULT, EN_NEW_PATTERNS_MAX, EN_NEW_WORDS_DEFAULT, EN_NEW_WORDS_MAX } from '@/lib/english/constants';
import { patternMastered, senseMastered, usageUnlocked, type SkillReplayState } from '@/lib/english/progress';
import { promptStage, stageLabel } from '@/lib/english/stage';
import { studyDayKey } from '@/lib/english/text';

function onDay(date: Date | null, day: string): boolean {
	return date != null && studyDayKey(date) === day;
}

function asCredits(value: unknown): Array<{ exampleId: string; dayKey: string }> {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const row = item as { exampleId?: unknown; dayKey?: unknown };
		if (typeof row.exampleId !== 'string' || typeof row.dayKey !== 'string') return [];
		return [{ exampleId: row.exampleId, dayKey: row.dayKey }];
	});
}

function skillView(row: {
	intervalIdx: number;
	dueAt: Date;
	state: string;
	lastReviewedAt: Date | null;
	lastExampleId: string | null;
	correctCount?: number;
	totalCount?: number;
	longGapRecallAt?: Date | null;
	usageExampleIds?: string[];
} | undefined, now: Date): SkillReplayState {
	if (!row) {
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
	const known = row.state === 'weak' || row.state === 'mastered' || row.state === 'familiar' || row.state === 'strong' || row.state === 'new' || row.state === 'learning'
		? row.state
		: 'learning';
	return {
		intervalIdx: row.intervalIdx,
		dueAt: row.dueAt,
		state: known,
		lastReviewedAt: row.lastReviewedAt,
		correctCount: row.correctCount ?? 0,
		totalCount: row.totalCount ?? 0,
		longGapRecallAt: row.longGapRecallAt ?? null,
		usageExampleIds: row.usageExampleIds ?? [],
		credits: [],
		lastExampleId: row.lastExampleId,
	};
}

async function enrolledContent(userId: string) {
	return prisma.enEnrollment.findMany({
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
									examples: { where: { status: 'published', role: 'grade' } },
									skills: { where: { userId } },
								},
							},
							pattern: {
								include: {
									progress: { where: { userId } },
								},
							},
						},
					},
				},
			},
		},
	});
}

export async function getEnglishHome(userId: string) {
	const now = new Date();
	const today = studyDayKey(now);
	const enrollments = await enrolledContent(userId);
	const senses = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => (
		item.sense?.status === 'published' ? [item.sense] : []
	)));
	const patterns = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => (
		item.pattern?.status === 'published' ? [item.pattern] : []
	)));
	const introducedToday = senses.filter((sense) => sense.skills.some((skill) => skill.skill === 'meaning' && onDay(skill.introducedAt, today))).length;
	const unintroduced = senses.filter((sense) => !sense.skills.some((skill) => skill.skill === 'meaning' && skill.introducedAt)).length;
	const patternsToday = patterns.filter((pattern) => pattern.progress.some((row) => onDay(row.introducedAt, today))).length;
	const newPatterns = patterns.filter((pattern) => !pattern.progress.some((row) => row.introducedAt)).length;
	let due = 0;
	let weak = 0;
	for (const sense of senses) {
		const gradeCount = sense.examples.length;
		for (const skill of sense.skills) {
			if (!skill.introducedAt) continue;
			if (skill.skill === 'usage' && !usageUnlocked(gradeCount)) continue;
			if (skill.state === 'weak') weak += 1;
			if (skill.dueAt.getTime() <= now.getTime()) due += 1;
		}
	}
	for (const pattern of patterns) {
		const row = pattern.progress[0];
		if (!row?.introducedAt) continue;
		if (row.state === 'weak') weak += 1;
		if (row.dueAt.getTime() <= now.getTime()) due += 1;
	}
	return {
		enrolledSets: enrollments.length,
		newWords: Math.min(unintroduced, Math.max(0, EN_NEW_WORDS_MAX - introducedToday), EN_NEW_WORDS_DEFAULT),
		newPatterns: Math.min(newPatterns, Math.max(0, EN_NEW_PATTERNS_MAX - patternsToday), EN_NEW_PATTERNS_DEFAULT),
		due,
		weak,
	};
}

export async function listEnglishSets(userId: string, includeDrafts: boolean) {
	const sets = await prisma.enSet.findMany({
		where: includeDrafts ? {} : { status: 'published' },
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
		include: {
			items: { select: { senseId: true, patternId: true } },
			enrollments: { where: { userId }, select: { id: true } },
		},
	});
	return sets.map((set) => ({
		id: set.id,
		title: set.title,
		description: set.description,
		status: set.status,
		words: set.items.filter((item) => item.senseId).length,
		patterns: set.items.filter((item) => item.patternId).length,
		enrolled: set.enrollments.length > 0,
	}));
}

export async function enrollEnglishSet(userId: string, setId: string) {
	const set = await prisma.enSet.findFirst({ where: { id: setId, status: 'published' } });
	if (!set) throw new AppError('Bộ học chưa xuất bản', 404);
	await prisma.enEnrollment.upsert({
		where: { userId_setId: { userId, setId } },
		create: { userId, setId },
		update: {},
	});
}

export async function getEnglishProgress(userId: string) {
	const now = new Date();
	const enrollments = await enrolledContent(userId);
	const words = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => {
		const sense = item.sense;
		if (!sense || sense.status !== 'published') return [];
		const meaning = skillView(sense.skills.find((skill) => skill.skill === 'meaning'), now);
		const sound = skillView(sense.skills.find((skill) => skill.skill === 'sound'), now);
		const usage = skillView(sense.skills.find((skill) => skill.skill === 'usage'), now);
		const gradeCount = sense.examples.length;
		return [{
			senseId: sense.id,
			lemma: sense.word.lemma,
			meaningVi: sense.meaningVi,
			usageOpen: usageUnlocked(gradeCount),
			mastered: senseMastered({ meaning, sound, usage }),
			skills: (['meaning', 'sound', 'usage'] as const).map((name) => {
				const state = name === 'meaning' ? meaning : name === 'sound' ? sound : usage;
				const stage = promptStage(name, state.intervalIdx);
				return {
					skill: name,
					label: name === 'meaning' ? 'Nghĩa' : name === 'sound' ? 'Âm và chữ' : 'Dùng từ',
					stage: stageLabel(stage),
					intervalIdx: state.intervalIdx,
					open: name === 'usage' ? usageUnlocked(gradeCount) : Boolean(sense.skills.find((skill) => skill.skill === name)?.introducedAt),
				};
			}),
			contexts: usage.usageExampleIds.length,
			longGap: [meaning, sound, usage].some((skill) => skill.longGapRecallAt != null),
		}];
	}));
	const patterns = enrollments.flatMap((enrollment) => enrollment.set.items.flatMap((item) => {
		const pattern = item.pattern;
		if (!pattern || pattern.status !== 'published') return [];
		const row = pattern.progress[0];
		const state: SkillReplayState = {
			...skillView(row, now),
			credits: asCredits(row?.credits),
		};
		const examples = new Set(state.credits.map((credit) => credit.exampleId));
		const days = new Set(state.credits.map((credit) => credit.dayKey));
		return [{
			patternId: pattern.id,
			purposeVi: pattern.purposeVi,
			frame: pattern.frame,
			stage: stageLabel(promptStage('pattern', state.intervalIdx)),
			examples: examples.size,
			days: days.size,
			mastered: patternMastered(state),
		}];
	}));
	return { words, patterns };
}
