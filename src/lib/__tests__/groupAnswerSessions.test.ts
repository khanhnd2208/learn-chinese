import { describe, expect, it } from 'vitest';
import { ANSWER_SESSION_GAP_MS, groupLogsIntoSessions } from '@/lib/chinese/groupAnswerSessions';

describe('groupLogsIntoSessions', () => {
	it('returns empty for no logs', () => {
		expect(groupLogsIntoSessions([])).toEqual([]);
	});

	it('groups consecutive answers within gap into one session', () => {
		const base = new Date('2026-06-18T14:00:00Z');
		const logs = [
			{ createdAt: new Date(base.getTime()), correct: true },
			{ createdAt: new Date(base.getTime() + 60_000), correct: false },
			{ createdAt: new Date(base.getTime() + 120_000), correct: true },
		];
		const sessions = groupLogsIntoSessions(logs);
		expect(sessions).toHaveLength(1);
		expect(sessions[0].itemCount).toBe(3);
		expect(sessions[0].correctCount).toBe(2);
		expect(sessions[0].accuracy).toBe(67);
	});

	it('splits sessions when gap exceeds threshold', () => {
		const base = new Date('2026-06-18T14:00:00Z');
		const logs = [
			{ createdAt: new Date(base.getTime()), correct: true },
			{ createdAt: new Date(base.getTime() - ANSWER_SESSION_GAP_MS - 1), correct: false },
		];
		const sessions = groupLogsIntoSessions(logs);
		expect(sessions).toHaveLength(2);
		expect(sessions[0].itemCount).toBe(1);
		expect(sessions[1].itemCount).toBe(1);
	});
});
