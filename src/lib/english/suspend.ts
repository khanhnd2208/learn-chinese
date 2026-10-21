import { EN_SUSPEND_AUDIO_RATE, EN_SUSPEND_DISPUTE_USERS, EN_SUSPEND_MIN_ATTEMPTS } from '@/lib/english/constants';

export function shouldSuspendQuestion(stats: {
	attempts: number;
	audioOpens: number;
	validDisputeUsers: number;
}): boolean {
	if (stats.validDisputeUsers >= EN_SUSPEND_DISPUTE_USERS) return true;
	if (stats.attempts >= EN_SUSPEND_MIN_ATTEMPTS && stats.audioOpens / stats.attempts >= EN_SUSPEND_AUDIO_RATE) {
		return true;
	}
	return false;
}
