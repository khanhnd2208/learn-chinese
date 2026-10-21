import type { EnglishSkillName } from '@/lib/english/stage';
import { normalizeLearnerText, normalizeSequence } from '@/lib/english/text';

export type GradeResultName =
	| 'target_correct'
	| 'alternate_plausible'
	| 'wrong'
	| 'pending_review'
	| 'skipped';

export interface GradeDecision {
	result: GradeResultName;
	promotes: boolean;
	penalizes: boolean;
	displayCorrect: boolean;
	holdsSchedule: boolean;
}

export function gradeEnglishAnswer(input: {
	skill: EnglishSkillName;
	answer: string;
	expected: string;
	acceptedAnswers: string[];
	audioOpened: boolean;
	skipped: boolean;
}): GradeDecision {
	if (input.skipped) {
		return { result: 'skipped', promotes: false, penalizes: false, displayCorrect: false, holdsSchedule: true };
	}
	const compare = input.skill === 'pattern' ? normalizeSequence : normalizeLearnerText;
	const given = compare(input.answer);
	const expected = compare(input.expected);
	const accepted = input.acceptedAnswers.map(compare);
	const target = given.length > 0 && given === expected;
	const alternate = !target && given.length > 0 && accepted.includes(given);
	if (!target && !alternate) {
		return { result: 'wrong', promotes: false, penalizes: true, displayCorrect: false, holdsSchedule: false };
	}
	if (alternate) {
		return {
			result: 'alternate_plausible',
			promotes: false,
			penalizes: false,
			displayCorrect: true,
			holdsSchedule: true,
		};
	}
	if (input.skill === 'usage' && input.audioOpened) {
		return {
			result: 'target_correct',
			promotes: false,
			penalizes: false,
			displayCorrect: true,
			holdsSchedule: true,
		};
	}
	return { result: 'target_correct', promotes: true, penalizes: false, displayCorrect: true, holdsSchedule: false };
}

export function gradeMessage(decision: GradeDecision): string {
	if (decision.result === 'skipped') return 'Đã bỏ qua câu này.';
	if (decision.result === 'pending_review') return 'Đã gửi duyệt. Lượt này chưa đổi lịch ôn.';
	if (decision.result === 'alternate_plausible') {
		return 'Cách này cũng hợp lý. Chưa tính là đã dùng đúng từ đang học.';
	}
	if (decision.result === 'target_correct' && decision.holdsSchedule) {
		return 'Đúng. Vì đã nghe cả câu nên kỹ năng dùng từ chưa tăng bậc.';
	}
	if (decision.result === 'target_correct') return 'Đúng.';
	return 'Chưa đúng.';
}

export function decisionForStoredResult(
	result: GradeResultName,
	skill: EnglishSkillName,
	audioOpened: boolean,
): GradeDecision {
	if (result === 'skipped') {
		return { result, promotes: false, penalizes: false, displayCorrect: false, holdsSchedule: true };
	}
	if (result === 'pending_review') {
		return { result, promotes: false, penalizes: false, displayCorrect: false, holdsSchedule: true };
	}
	if (result === 'wrong') {
		return { result, promotes: false, penalizes: true, displayCorrect: false, holdsSchedule: false };
	}
	if (result === 'alternate_plausible') {
		return { result, promotes: false, penalizes: false, displayCorrect: true, holdsSchedule: true };
	}
	if (skill === 'usage' && audioOpened) {
		return { result: 'target_correct', promotes: false, penalizes: false, displayCorrect: true, holdsSchedule: true };
	}
	return { result: 'target_correct', promotes: true, penalizes: false, displayCorrect: true, holdsSchedule: false };
}

export function skipAllowed(skill: EnglishSkillName): boolean {
	return skill === 'usage' || skill === 'sound';
}
