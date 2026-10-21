import { SRS_LADDER } from '@/lib/srs/schedule';
import { formatScheduleDistance } from '@/lib/srs/scheduleLabel';

export type EnglishStageName = 'new' | 'recall' | 'maintain';
export type EnglishSkillName = 'meaning' | 'sound' | 'usage' | 'pattern';

/** First ladder step whose interval is at least 7 days. That step is “ôn duy trì”. */
export function maintainMinIdx(): number {
	const idx = SRS_LADDER.intervalDays.findIndex((days) => days >= 7);
	return idx === -1 ? Math.max(SRS_LADDER.intervalDays.length - 1, 0) : idx;
}

export function promptStage(skill: EnglishSkillName, intervalIdx: number): EnglishStageName {
	void skill;
	if (intervalIdx >= maintainMinIdx()) return 'maintain';
	if (intervalIdx <= 0) return 'new';
	return 'recall';
}

export function stageLabel(stage: EnglishStageName): string {
	if (stage === 'new') return 'Mới học';
	if (stage === 'recall') return 'Truy hồi';
	return 'Ôn duy trì';
}

export function englishScheduleLabel(dueAt: Date, now: Date, moved: boolean, correct: boolean): string {
	if (!moved) return 'Chưa đổi lịch ôn';
	return formatScheduleDistance(dueAt, now, correct);
}
