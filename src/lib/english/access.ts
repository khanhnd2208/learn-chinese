/** Learner-facing switch uses the public flag. Admins can prepare content before it is on. */
export function englishLearningEnabled(): boolean {
	return process.env.NEXT_PUBLIC_ENGLISH_ENABLED === '1' || process.env.ENGLISH_ENABLED === '1';
}

export function englishAreaOpenForRole(role: string | null | undefined): boolean {
	return englishLearningEnabled() || role === 'admin';
}

export function showEnglishSwitch(role: string | null | undefined): boolean {
	return process.env.NEXT_PUBLIC_ENGLISH_ENABLED === '1' || role === 'admin';
}
