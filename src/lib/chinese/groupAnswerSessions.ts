/** Gap between answers that starts a new study session */
export const ANSWER_SESSION_GAP_MS = 30 * 60 * 1000;

export interface AnswerSessionSummary {
	startedAt: string;
	endedAt: string;
	itemCount: number;
	correctCount: number;
	accuracy: number;
}

interface AnswerLogLike {
	createdAt: Date;
	correct: boolean;
}

function summarizeChunk(logs: AnswerLogLike[]): AnswerSessionSummary {
	const sorted = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	const correctCount = sorted.filter((l) => l.correct).length;
	const itemCount = sorted.length;
	return {
		startedAt: sorted[0].createdAt.toISOString(),
		endedAt: sorted[sorted.length - 1].createdAt.toISOString(),
		itemCount,
		correctCount,
		accuracy: itemCount > 0 ? Math.round((correctCount / itemCount) * 100) : 0,
	};
}

/** Group answer logs into sessions by time gaps (newest sessions first). */
export function groupLogsIntoSessions(logs: AnswerLogLike[]): AnswerSessionSummary[] {
	if (!logs.length) return [];

	const sorted = [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	const sessions: AnswerSessionSummary[] = [];
	let chunk: AnswerLogLike[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const gap = sorted[i - 1].createdAt.getTime() - sorted[i].createdAt.getTime();
		if (gap > ANSWER_SESSION_GAP_MS) {
			sessions.push(summarizeChunk(chunk));
			chunk = [];
		}
		chunk.push(sorted[i]);
	}
	if (chunk.length) sessions.push(summarizeChunk(chunk));
	return sessions;
}
