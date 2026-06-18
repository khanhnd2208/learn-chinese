import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

import {
	getAuthSecret,
	getGoogleOAuthCredentials,
	isAuthLocalDev,
} from '@/lib/authEnv';

/**
 * Edge-safe Auth.js config — NO Node.js-only imports (no MongoDB, no mongoose).
 *
 * Used by proxy.ts (Node.js runtime) and as the base for auth.ts.
 * The full auth.ts config extends this with the MongoDB adapter.
 *
 * Auth.js v5 pattern: https://authjs.dev/guides/edge-compatibility
 */

const { clientId: googleClientId, clientSecret: googleClientSecret } =
	getGoogleOAuthCredentials();
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Detect local dev: secure cookies break on http://localhost
const isLocalDev = isAuthLocalDev();

if (process.env.NODE_ENV === 'production') {
	if (!getAuthSecret()) {
		console.error(
			'[auth] Missing AUTH_SECRET or NEXTAUTH_SECRET — sign-in will fail with Configuration error.'
		);
	}
	if (!googleClientId || !googleClientSecret) {
		console.error(
			'[auth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET — no OAuth providers configured.'
		);
	}
}

/** Custom page paths for Auth.js */
const pages = {
	signIn: '/login',
	error: '/login',
};

const secureCookieOptions = {
	httpOnly: true,
	sameSite: 'lax' as const,
	path: '/',
	secure: !isLocalDev,
};

const sessionTokenCookieOptions = {
	...secureCookieOptions,
	maxAge: SESSION_MAX_AGE_SECONDS,
};

export const authConfig: NextAuthConfig = {
	secret: getAuthSecret(),
	debug: process.env.AUTH_DEBUG === 'true',
	pages,
	session: {
		strategy: 'jwt',
		maxAge: SESSION_MAX_AGE_SECONDS,
		updateAge: 24 * 60 * 60,
	},
	jwt: {
		maxAge: SESSION_MAX_AGE_SECONDS,
	},
	trustHost: true,
	// Same cookie overrides as auth.ts — must match exactly so the middleware
	// can read the session cookie set by the full auth handler.
	cookies: {
		sessionToken: { name: 'authjs.session-token', options: sessionTokenCookieOptions },
		callbackUrl: { name: 'authjs.callback-url', options: secureCookieOptions },
		csrfToken: { name: 'authjs.csrf-token', options: secureCookieOptions },
		pkceCodeVerifier: { name: 'authjs.pkce.code_verifier', options: secureCookieOptions },
		state: { name: 'authjs.state', options: secureCookieOptions },
		nonce: { name: 'authjs.nonce', options: secureCookieOptions },
	},
	providers:
		googleClientId && googleClientSecret
			? [
				Google({
					clientId: googleClientId,
					clientSecret: googleClientSecret,
				}),
			]
			: [],
	callbacks: {
		// Edge-safe jwt: propagate role from user object into token.
		// The full server-side auth.ts overrides this to also fetch from DB.
		async jwt({ token, user }) {
			if (user) {
				const userRole = (user as { role?: string }).role;
				token.role = (userRole === 'admin' || userRole === 'teacher' || userRole === 'student')
					? userRole
					: 'student';
			} else if (!token.role) {
				token.role = 'student';
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				(session.user as unknown as Record<string, unknown>).id = token.sub;
				session.user.role = (token.role as 'admin' | 'teacher' | 'student' | undefined) ?? 'student';
			}
			return session;
		},
	},
};
