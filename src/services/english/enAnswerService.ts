import { Prisma, type EnAnswerSkill, type EnWordSkill } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { EN_DISPUTES_PER_DAY } from '@/lib/english/constants';
import {
	decisionForStoredResult,
	gradeEnglishAnswer,
	gradeMessage,
	skipAllowed,
	type GradeResultName,
} from '@/lib/english/grade';
import { replaySkill, type SkillReplayState } from '@/lib/english/progress';
import { englishScheduleLabel, promptStage, type EnglishSkillName } from '@/lib/english/stage';
import { shouldSuspendQuestion } from '@/lib/english/suspend';
import { normalizeLearnerText, studyDayKey, uniqueTexts } from '@/lib/english/text';

type Tx = Prisma.TransactionClient | typeof prisma;

export interface EnglishAnswerView {
	duplicate: boolean;
	result: GradeResultName;
	message: string;
	displayCorrect: boolean;
	promoted: boolean;
	scheduleLabel: string;
	intervalIdx: number;
	stage: ReturnType<typeof promptStage>;
	skill: EnglishSkillName;
	expected: string;
}

function isWordSkill(skill: EnAnswerSkill): skill is EnWordSkill {
	return skill === 'meaning' || skill === 'sound' || skill === 'usage';
}

function startOfStudyDay(now: Date): Date {
	return new Date(`${studyDayKey(now)}T00:00:00+07:00`);
}

function viewFrom(
	skill: EnglishSkillName,
	expected: string,
	decision: ReturnType<typeof decisionForStoredResult>,
	state: SkillReplayState,
	duplicate: boolean,
	now: Date,
): EnglishAnswerView {
	return {
		duplicate,
		result: decision.result,
		message: gradeMessage(decision),
		displayCorrect: decision.displayCorrect,
		promoted: decision.promotes,
		scheduleLabel: englishScheduleLabel(state.dueAt, now, !decision.holdsSchedule, decision.promotes),
		intervalIdx: state.intervalIdx,
		stage: promptStage(skill, state.intervalIdx),
		skill,
		expected,
	};
}

async function skillState(tx: Tx, userId: string, skill: EnAnswerSkill, senseId: string | null, patternId: string | null, now: Date): Promise<SkillReplayState> {
	if (isWordSkill(skill) && senseId) {
		const logs = await tx.enAnswerLog.findMany({
			where: { userId, senseId, skill },
			orderBy: { createdAt: 'asc' },
		});
		return replaySkill(logs.map((log) => ({
			createdAt: log.createdAt,
			result: log.result,
			audioOpened: log.audioOpened,
			skill: log.skill,
			exampleId: log.exampleId,
		})), now);
	}
	if (skill === 'pattern' && patternId) {
		const logs = await tx.enAnswerLog.findMany({
			where: { userId, patternId, skill: 'pattern' },
			orderBy: { createdAt: 'asc' },
		});
		return replaySkill(logs.map((log) => ({
			createdAt: log.createdAt,
			result: log.result,
			audioOpened: log.audioOpened,
			skill: log.skill,
			exampleId: log.exampleId,
		})), now);
	}
	return replaySkill([], now);
}

async function saveSkill(
	tx: Tx,
	userId: string,
	skill: EnAnswerSkill,
	senseId: string | null,
	patternId: string | null,
	state: SkillReplayState,
) {
	if (isWordSkill(skill) && senseId) {
		const existing = await tx.enSenseSkill.findUnique({
			where: { userId_senseId_skill: { userId, senseId, skill } },
		});
		const data = {
			intervalIdx: state.intervalIdx,
			dueAt: state.dueAt,
			state: state.state,
			lastReviewedAt: state.lastReviewedAt,
			correctCount: state.correctCount,
			totalCount: state.totalCount,
			longGapRecallAt: state.longGapRecallAt,
			usageExampleIds: state.usageExampleIds,
			lastExampleId: state.lastExampleId,
		};
		await tx.enSenseSkill.upsert({
			where: { userId_senseId_skill: { userId, senseId, skill } },
			create: {
				userId,
				senseId,
				skill,
				introducedAt: existing?.introducedAt ?? new Date(),
				...data,
			},
			update: data,
		});
		return;
	}
	if (skill === 'pattern' && patternId) {
		const existing = await tx.enPatternProgress.findUnique({
			where: { userId_patternId: { userId, patternId } },
		});
		const data = {
			intervalIdx: state.intervalIdx,
			dueAt: state.dueAt,
			state: state.state,
			lastReviewedAt: state.lastReviewedAt,
			credits: state.credits as unknown as Prisma.InputJsonValue,
			lastExampleId: state.lastExampleId,
		};
		await tx.enPatternProgress.upsert({
			where: { userId_patternId: { userId, patternId } },
			create: {
				userId,
				patternId,
				introducedAt: existing?.introducedAt ?? new Date(),
				...data,
			},
			update: data,
		});
	}
}

async function intervalBefore(tx: Tx, userId: string, skill: EnAnswerSkill, senseId: string | null, patternId: string | null): Promise<number> {
	if (isWordSkill(skill) && senseId) {
		const row = await tx.enSenseSkill.findUnique({
			where: { userId_senseId_skill: { userId, senseId, skill } },
			select: { intervalIdx: true },
		});
		return row?.intervalIdx ?? 0;
	}
	if (patternId) {
		const row = await tx.enPatternProgress.findUnique({
			where: { userId_patternId: { userId, patternId } },
			select: { intervalIdx: true },
		});
		return row?.intervalIdx ?? 0;
	}
	return 0;
}

export async function suspendQuestionIfNeeded(questionId: string): Promise<boolean> {
	const [logs, disputes] = await Promise.all([
		prisma.enAnswerLog.findMany({
			where: { questionId },
			select: { result: true, audioOpened: true },
		}),
		prisma.enDispute.findMany({
			where: { questionId, status: { in: ['pending', 'accepted'] } },
			select: { userId: true },
		}),
	]);
	const decisive = logs.filter((log) => log.result !== 'skipped' && log.result !== 'pending_review');
	const suspend = shouldSuspendQuestion({
		attempts: decisive.length,
		audioOpens: decisive.filter((log) => log.audioOpened).length,
		validDisputeUsers: new Set(disputes.map((row) => row.userId)).size,
	});
	if (!suspend) return false;
	await prisma.enQuestion.update({ where: { id: questionId }, data: { status: 'suspended' } });
	return true;
}

export async function submitEnglishAnswer(userId: string, input: {
	questionId: string;
	clientAnswerId: string;
	answer?: string;
	skipped?: boolean;
}): Promise<EnglishAnswerView> {
	const clientAnswerId = input.clientAnswerId.trim();
	if (!clientAnswerId || clientAnswerId.length > 80) throw new AppError('Thiếu mã câu trả lời', 400);
	const now = new Date();
	try {
		return await prisma.$transaction(async (tx) => {
			const existing = await tx.enAnswerLog.findUnique({
				where: { userId_clientAnswerId: { userId, clientAnswerId } },
			});
			if (existing) {
				const state = await skillState(tx, userId, existing.skill, existing.senseId, existing.patternId, now);
				const decision = decisionForStoredResult(existing.result, existing.skill, existing.audioOpened);
				const question = await tx.enQuestion.findUnique({ where: { id: existing.questionId }, select: { answer: true } });
				return viewFrom(existing.skill, question?.answer ?? '', decision, state, true, now);
			}
			const question = await tx.enQuestion.findFirst({
				where: { id: input.questionId, status: 'published' },
			});
			if (!question) throw new AppError('Câu hỏi không còn trong phiên ôn', 400);
			if (input.skipped && !skipAllowed(question.skill)) throw new AppError('Câu này không bỏ qua được', 400);
			const opened = await tx.enAudioOpen.findUnique({
				where: { userId_clientAnswerId: { userId, clientAnswerId } },
			});
			const decision = gradeEnglishAnswer({
				skill: question.skill,
				answer: input.answer ?? '',
				expected: question.answer,
				acceptedAnswers: question.acceptedAnswers,
				audioOpened: Boolean(opened),
				skipped: Boolean(input.skipped),
			});
			const before = await intervalBefore(tx, userId, question.skill, question.senseId, question.patternId);
			await tx.enAnswerLog.create({
				data: {
					userId,
					questionId: question.id,
					senseId: question.senseId,
					patternId: question.patternId,
					exampleId: question.exampleId ?? question.patternExampleId,
					skill: question.skill,
					clientAnswerId,
					answer: (input.answer ?? '').slice(0, 500),
					result: decision.result,
					audioOpened: Boolean(opened),
					intervalIdxBefore: before,
				},
			});
			const state = await skillState(tx, userId, question.skill, question.senseId, question.patternId, now);
			await saveSkill(tx, userId, question.skill, question.senseId, question.patternId, state);
			return viewFrom(question.skill, question.answer, decision, state, false, now);
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			const existing = await prisma.enAnswerLog.findUnique({
				where: { userId_clientAnswerId: { userId, clientAnswerId } },
			});
			if (!existing) throw error;
			const state = await skillState(prisma, userId, existing.skill, existing.senseId, existing.patternId, now);
			const decision = decisionForStoredResult(existing.result, existing.skill, existing.audioOpened);
			const question = await prisma.enQuestion.findUnique({ where: { id: existing.questionId }, select: { answer: true } });
			return viewFrom(existing.skill, question?.answer ?? '', decision, state, true, now);
		}
		throw error;
	} finally {
		try {
			if (input.questionId) {
				const stillThere = await prisma.enQuestion.findUnique({ where: { id: input.questionId }, select: { id: true, status: true } });
				if (stillThere?.status === 'published') await suspendQuestionIfNeeded(stillThere.id);
			}
		} catch (error) {
			console.error('[english] suspend check failed', error);
		}
	}
}

export async function recordEnglishAudioOpen(userId: string, input: {
	questionId: string;
	clientAnswerId: string;
}): Promise<void> {
	const clientAnswerId = input.clientAnswerId.trim();
	if (!clientAnswerId || clientAnswerId.length > 80) throw new AppError('Thiếu mã câu trả lời', 400);
	const question = await prisma.enQuestion.findFirst({
		where: { id: input.questionId, status: 'published' },
		select: { id: true },
	});
	if (!question) throw new AppError('Không tìm thấy câu hỏi', 400);
	await prisma.enAudioOpen.upsert({
		where: { userId_clientAnswerId: { userId, clientAnswerId } },
		create: { userId, questionId: question.id, clientAnswerId },
		update: {},
	});
}

export async function fileEnglishDispute(userId: string, input: {
	questionId: string;
	clientAnswerId: string;
	answer: string;
}): Promise<{ status: string }> {
	const answer = input.answer.trim();
	if (!answer) throw new AppError('Chưa có đáp án để gửi duyệt', 400);
	const now = new Date();
	const filedToday = await prisma.enDispute.count({
		where: { userId, createdAt: { gte: startOfStudyDay(now) } },
	});
	const existing = await prisma.enDispute.findUnique({
		where: { userId_clientAnswerId: { userId, clientAnswerId: input.clientAnswerId } },
	});
	if (!existing && filedToday >= EN_DISPUTES_PER_DAY) {
		throw new AppError('Đã hết lượt báo đáp án trong hôm nay', 429);
	}
	const log = await prisma.enAnswerLog.findUnique({
		where: { userId_clientAnswerId: { userId, clientAnswerId: input.clientAnswerId } },
	});
	if (!log || log.questionId !== input.questionId) throw new AppError('Không tìm thấy lượt trả lời', 400);
	if (log.result === 'target_correct' && !(log.skill === 'usage' && log.audioOpened)) {
		throw new AppError('Lượt này đã được tính là đúng', 400);
	}
	await prisma.$transaction(async (tx) => {
		await tx.enDispute.upsert({
			where: { userId_clientAnswerId: { userId, clientAnswerId: input.clientAnswerId } },
			create: {
				userId,
				questionId: input.questionId,
				answer: answer.slice(0, 500),
				clientAnswerId: input.clientAnswerId,
			},
			update: {},
		});
		await tx.enAnswerLog.update({
			where: { id: log.id },
			data: { result: 'pending_review', answer: answer.slice(0, 500) },
		});
		const state = await skillState(tx, userId, log.skill, log.senseId, log.patternId, now);
		await saveSkill(tx, userId, log.skill, log.senseId, log.patternId, state);
	});
	return { status: 'pending' };
}

export async function resolveEnglishDispute(adminId: string, disputeId: string, decision: 'accepted' | 'rejected'): Promise<void> {
	const dispute = await prisma.enDispute.findUnique({
		where: { id: disputeId },
		include: { question: true },
	});
	if (!dispute || dispute.status !== 'pending') throw new AppError('Mục duyệt không còn chờ', 400);
	const log = await prisma.enAnswerLog.findUnique({
		where: { userId_clientAnswerId: { userId: dispute.userId, clientAnswerId: dispute.clientAnswerId } },
	});
	if (!log) throw new AppError('Không thấy lịch sử trả lời', 400);
	const now = new Date();
	const matchesTarget = normalizeLearnerText(dispute.answer) === normalizeLearnerText(dispute.question.answer);
	const nextResult: GradeResultName = decision === 'rejected'
		? 'wrong'
		: matchesTarget ? 'target_correct' : 'alternate_plausible';
	await prisma.$transaction(async (tx) => {
		if (nextResult === 'alternate_plausible') {
			await tx.enQuestion.update({
				where: { id: dispute.questionId },
				data: { acceptedAnswers: uniqueTexts([...dispute.question.acceptedAnswers, dispute.answer]) },
			});
		}
		await tx.enAnswerLog.update({ where: { id: log.id }, data: { result: nextResult } });
		await tx.enDispute.update({
			where: { id: dispute.id },
			data: {
				status: decision === 'accepted' ? 'accepted' : 'rejected',
				resolvedById: adminId,
				resolvedAt: now,
			},
		});
		const state = await skillState(tx, dispute.userId, log.skill, log.senseId, log.patternId, now);
		await saveSkill(tx, dispute.userId, log.skill, log.senseId, log.patternId, state);
	});
	await suspendQuestionIfNeeded(dispute.questionId);
}

export async function listPendingEnglishDisputes() {
	const rows = await prisma.enDispute.findMany({
		where: { status: 'pending' },
		orderBy: { createdAt: 'asc' },
		take: 50,
		include: {
			question: { select: { id: true, answer: true, skill: true, prompt: true, acceptedAnswers: true } },
		},
	});
	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		answer: row.answer,
		expected: row.question.answer,
		skill: row.question.skill,
		createdAt: row.createdAt.toISOString(),
	}));
}
