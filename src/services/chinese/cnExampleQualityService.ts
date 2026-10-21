import { prisma } from '@/lib/prisma';
import { addDays, CN_EXAMPLE_STATS_WINDOW_DAYS } from '@/config/constants';
import { scoreExample, type ExampleQualityScore } from '@/lib/chinese/exampleQuality';

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
