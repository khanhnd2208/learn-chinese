/**
 * Auth.js environment helpers — supports both v5 (AUTH_*) and legacy (NEXTAUTH_*) names.
 * Production VPS docs historically used NEXTAUTH_*; README uses AUTH_*.
 */
export function getAuthSecret(): string | undefined {
	return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export function getAuthUrl(): string | undefined {
	return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
}

/** True when running on plain HTTP (local dev). Secure cookies must be disabled. */
export function isAuthLocalDev(): boolean {
	return getAuthUrl()?.startsWith('http://') ?? false;
}

export function getGoogleOAuthCredentials(): { clientId?: string; clientSecret?: string } {
	return {
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	};
}
