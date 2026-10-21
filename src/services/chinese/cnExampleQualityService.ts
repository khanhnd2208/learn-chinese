import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { addDays, CN_EXAMPLE_STATS_WINDOW_DAYS } from '@/config/constants';
import { normalizeGradedText } from '@/lib/chinese/answerGrade';
import { scoreExample, type ExampleQualityScore } from '@/lib/chinese/exampleQuality';
import { computeFillTarget } from '@/lib/chinese/fillExampleValidator';
import { refreshStickingPoint, syncProgressRollup } from '@/services/chinese/cnSrsService';

export interface ExampleQualityRow extends ExampleQualityScore {
	exampleId: string;
	hanzi: string;
	meaningVi: string;
	targetWord: string;
	wordId: string;
}

export async function computeExampleQuality(now = new Date()): Promise<ExampleQualityRow[]> {
	const since = addDays(now, -CN_EXAMPLE_STATS_WINDOW_DAYS);
	const [logs, disputes] = await Promise.all([
		prisma.cnAnswerLog.findMany({
			where: { exampleId: { not: null }, createdAt: { gte: since } },
			select: {
				exampleId: true,
				userId: true,
				createdAt: true,
				correct: true,
				hintUsed: true,
				answer: true,
			},
		}),
		prisma.cnExampleDispute.findMany({
			where: { status: { in: ['pending', 'accepted'] }, createdAt: { gte: since } },
			select: { exampleId: true, userId: true, createdAt: true },
		}),
	]);

	const exampleIds = [...new Set([
		...logs.map((log) => log.exampleId).filter((id): id is string => !!id),
		...disputes.map((row) => row.exampleId),
	])];
	if (!exampleIds.length) return [];

	const examples = await prisma.cnExample.findMany({
		where: { id: { in: exampleIds } },
		select: {
			id: true,
			hanzi: true,
			meaningVi: true,
			wordId: true,
			qualityReviewedAt: true,
			word: { select: { simplified: true } },
		},
	});
	const byId = new Map(examples.map((example) => [example.id, example]));
	const logsByExample = new Map<string, typeof logs>();
	for (const log of logs) {
		if (!log.exampleId) continue;
		const example = byId.get(log.exampleId);
		if (example?.qualityReviewedAt && log.createdAt <= example.qualityReviewedAt) continue;
		const list = logsByExample.get(log.exampleId) ?? [];
		list.push(log);
		logsByExample.set(log.exampleId, list);
	}
	const disputesByExample = new Map<string, string[]>();
	for (const row of disputes) {
		const example = byId.get(row.exampleId);
		if (example?.qualityReviewedAt && row.createdAt <= example.qualityReviewedAt) continue;
		const list = disputesByExample.get(row.exampleId) ?? [];
		list.push(row.userId);
		disputesByExample.set(row.exampleId, list);
	}

	return exampleIds.flatMap((exampleId) => {
		const example = byId.get(exampleId);
		if (!example) return [];
		const score = scoreExample(
			(logsByExample.get(exampleId) ?? []).map((log) => ({
				userId: log.userId,
				createdAt: log.createdAt,
				correct: log.correct,
				hintUsed: log.hintUsed,
				answer: log.answer,
			})),
			disputesByExample.get(exampleId) ?? [],
		);
		return [{
			...score,
			exampleId,
			hanzi: example.hanzi,
			meaningVi: example.meaningVi,
			targetWord: example.word.simplified,
			wordId: example.wordId,
		}];
	});
}

export interface SentenceRestoreLog {
	id: string;
	userId: string;
	wordId: string;
	exampleId: string | null;
	createdAt: Date;
	correct: boolean;
	disputed: boolean;
	source: string;
	questionType: string;
	channelIdxBefore: number | null;
	answer: string | null;
}

const SENTENCE_QUESTION_TYPES = new Set(['fill_sentence', 'fill_sentence_typed']);

/**
 * Latest wrong, undisputed review of this sentence per learner.
 * A later sentence answer on the same word means the learner has moved on.
 * When `acceptedAnswers` is set, only those answers are repaired.
 */
export function selectLogsToRestore(
	logs: SentenceRestoreLog[],
	exampleId: string,
	acceptedAnswers?: string[],
): SentenceRestoreLog[] {
	const allowed = acceptedAnswers?.map((answer) => normalizeGradedText(answer));
	const byLearner = new Map<string, SentenceRestoreLog[]>();
	for (const log of logs) {
		if (!SENTENCE_QUESTION_TYPES.has(log.questionType)) continue;
		const key = `${log.userId}\n${log.wordId}`;
		const list = byLearner.get(key) ?? [];
		list.push(log);
		byLearner.set(key, list);
	}

	const chosen: SentenceRestoreLog[] = [];
	for (const list of byLearner.values()) {
		const candidates = list.filter((log) =>
			log.source === 'review'
			&& !log.correct
			&& !log.disputed
			&& log.exampleId === exampleId
			&& log.channelIdxBefore != null
			&& (allowed == null || (log.answer != null && allowed.includes(normalizeGradedText(log.answer))))
		);
		if (!candidates.length) continue;
		const latest = candidates.reduce((best, log) => (log.createdAt > best.createdAt ? log : best));
		if (list.some((log) => log.createdAt > latest.createdAt)) continue;
		chosen.push(latest);
	}
	return chosen;
}

export async function restoreSentenceLevels(input: {
	exampleId: string;
	wordId: string;
	now?: Date;
	acceptedAnswers?: string[];
}): Promise<number> {
	const now = input.now ?? new Date();
	const since = addDays(now, -CN_EXAMPLE_STATS_WINDOW_DAYS);
	const logs = await prisma.cnAnswerLog.findMany({
		where: {
			wordId: input.wordId,
			createdAt: { gte: since },
			questionType: { in: [...SENTENCE_QUESTION_TYPES] as Array<'fill_sentence' | 'fill_sentence_typed'> },
		},
		select: {
			id: true,
			userId: true,
			wordId: true,
			exampleId: true,
			createdAt: true,
			correct: true,
			disputed: true,
			source: true,
			questionType: true,
			channelIdxBefore: true,
			answer: true,
		},
	});
	const chosen = selectLogsToRestore(logs, input.exampleId, input.acceptedAnswers);
	if (!chosen.length) return 0;

	return prisma.$transaction(async (tx) => {
		let restored = 0;
		for (const log of chosen) {
			const before = log.channelIdxBefore;
			if (before == null) continue;
			const progress = await tx.cnWordProgress.findUnique({
				where: { userId_wordId: { userId: log.userId, wordId: log.wordId } },
			});
			if (!progress || progress.sentenceIntervalIdx >= before) continue;

			const next = { ...progress };
			next.sentenceIntervalIdx = before;
			const soon = addDays(now, 1);
			const currentDue = progress.sentenceDueAt ?? soon;
			next.sentenceDueAt = currentDue < soon ? currentDue : soon;
			next.sentenceHeavyLapses = Math.max(0, progress.sentenceHeavyLapses - 1);
			syncProgressRollup(next, now);
			refreshStickingPoint(next);
			await tx.cnWordProgress.update({
				where: { id: progress.id },
				data: {
					sentenceIntervalIdx: next.sentenceIntervalIdx,
					sentenceDueAt: next.sentenceDueAt,
					sentenceHeavyLapses: next.sentenceHeavyLapses,
					dueAt: next.dueAt,
					intervalIdx: next.intervalIdx,
					state: next.state,
					isStickingPoint: next.isStickingPoint,
				},
			});
			await tx.cnAnswerLog.update({ where: { id: log.id }, data: { disputed: true } });
			restored += 1;
		}
		return restored;
	});
}

export interface FlaggedExampleRow extends ExampleQualityRow {
	noFillExamplesLeft: boolean;
}

function usableFillWhere(wordId: string | { in: string[] }) {
	return {
		wordId,
		ownerUserId: null,
		naturalnessStatus: { in: ['auto', 'verified'] },
		targetWordStart: { not: null },
		targetWordEnd: { not: null },
	};
}

export async function listFlaggedExamples(now = new Date()): Promise<FlaggedExampleRow[]> {
	const rows = (await computeExampleQuality(now)).filter((row) => row.flagged);
	rows.sort((a, b) => (b.attempts * (1 - b.cleanRate)) - (a.attempts * (1 - a.cleanRate)));
	const wordIds = [...new Set(rows.map((row) => row.wordId))];
	if (!wordIds.length) return [];
	const usable = await prisma.cnExample.findMany({
		where: usableFillWhere({ in: wordIds }),
		select: { wordId: true },
	});
	const wordsWithFill = new Set(usable.map((row) => row.wordId));
	return rows.map((row) => ({ ...row, noFillExamplesLeft: !wordsWithFill.has(row.wordId) }));
}

function appendAcceptedAnswers(existing: string[], incoming: string[]): string[] {
	const next = [...existing];
	for (const answer of incoming) {
		const normalized = normalizeGradedText(answer);
		if (!normalized) continue;
		if (next.some((item) => normalizeGradedText(item) === normalized)) continue;
		next.push(normalized);
	}
	return next;
}

async function wordStillHasFillExample(wordId: string): Promise<boolean> {
	const count = await prisma.cnExample.count({
		where: usableFillWhere(wordId),
	});
	return count > 0;
}

export async function applyExampleQualityAction(input: {
	exampleId: string;
	action: 'retire' | 'dismiss' | 'edit' | 'accept-answers';
	hanzi?: string;
	pinyin?: string;
	meaningVi?: string;
	answers?: string[];
	now?: Date;
}): Promise<{ restored: number; noFillExamplesLeft: boolean }> {
	const now = input.now ?? new Date();
	const example = await prisma.cnExample.findUnique({
		where: { id: input.exampleId },
		select: {
			id: true,
			wordId: true,
			hanzi: true,
			sourceHanzi: true,
			meaningViTemplate: true,
			acceptedAnswers: true,
			word: { select: { simplified: true } },
		},
	});
	if (!example) throw new AppError('Không tìm thấy câu', 404);

	if (input.action === 'dismiss') {
		await prisma.cnExample.update({
			where: { id: example.id },
			data: { naturalnessStatus: 'verified', qualityReviewedAt: now },
		});
		return { restored: 0, noFillExamplesLeft: false };
	}

	if (input.action === 'retire') {
		await prisma.cnExample.update({
			where: { id: example.id },
			data: { naturalnessStatus: 'flagged' },
		});
		const restored = await restoreSentenceLevels({ exampleId: example.id, wordId: example.wordId, now });
		return { restored, noFillExamplesLeft: !(await wordStillHasFillExample(example.wordId)) };
	}

	if (input.action === 'edit') {
		const hanzi = input.hanzi?.trim() ?? '';
		const pinyin = input.pinyin?.trim() ?? '';
		const meaningVi = input.meaningVi?.trim() ?? '';
		if (!hanzi || !pinyin || !meaningVi) throw new AppError('Thiếu câu, pinyin hoặc nghĩa', 400);
		const offsets = computeFillTarget(hanzi, example.word.simplified);
		if (!offsets) throw new AppError('Câu phải chứa đúng một lần từ đích', 400);
		await prisma.cnExample.update({
			where: { id: example.id },
			data: {
				hanzi,
				// Keep the text the file knows, so a re-import finds this row again.
				sourceHanzi: example.sourceHanzi ?? example.hanzi,
				pinyin,
				meaningVi,
				meaningViTemplate: meaningVi.includes('__') ? example.meaningViTemplate : '',
				targetWordStart: offsets.start,
				targetWordEnd: offsets.end,
				naturalnessStatus: 'verified',
				qualityReviewedAt: now,
			},
		});
		const restored = await restoreSentenceLevels({ exampleId: example.id, wordId: example.wordId, now });
		return { restored, noFillExamplesLeft: !(await wordStillHasFillExample(example.wordId)) };
	}

	const incoming = (input.answers ?? []).map((answer) => answer.trim()).filter(Boolean);
	if (!incoming.length) throw new AppError('Thiếu đáp án cần chấp nhận', 400);
	const acceptedAnswers = appendAcceptedAnswers(example.acceptedAnswers, incoming);
	await prisma.cnExample.update({
		where: { id: example.id },
		data: { acceptedAnswers, qualityReviewedAt: now },
	});
	const restored = await restoreSentenceLevels({
		exampleId: example.id,
		wordId: example.wordId,
		now,
		acceptedAnswers: incoming,
	});
	return { restored, noFillExamplesLeft: false };
}
