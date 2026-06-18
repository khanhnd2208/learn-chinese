/**
 * API Utilities — Shared helpers for Next.js API route handlers.
 *
 * Centralizes authentication checks, error handling, and response formatting
 * to eliminate ~80+ lines of repetitive boilerplate across 27 API routes.
 *
 * Usage:
 *   export const GET = withAuth(async (request, user) => {
 *     const data = await someService(user.id);
 *     return apiSuccess(data);
 *   });
 *
 *   export const POST = withAdmin(async (request, user) => {
 *     const body = await request.json();
 *     const created = await createSomething(body);
 *     return apiSuccess(created, 201);
 *   });
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getApiUser, type ApiUser } from '@/lib/apiAuth';

// ─── Response Helpers ──────────────────────────────────────────────────────────

/**
 * Standard success response.
 * All API routes MUST use this format: `{ ok: true, data: T }`
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
	return NextResponse.json({ ok: true, data }, { status });
}

/**
 * Standard error response.
 * All API routes MUST use this format: `{ ok: false, error: string }`
 */
export function apiError(message: string, status = 400, code?: string): NextResponse {
	return NextResponse.json({ ok: false, error: message, ...(code ? { code } : {}) }, { status });
}

import { AppError } from '@/lib/appError';

export { AppError };

/**
 * Maps a caught error to the appropriate API response.
 * - AppError → use its message + status (safe, expected)
 * - Unknown error → log server-side, return generic 500 (never leak internals)
 */
function handleCaughtError(error: unknown): NextResponse {
	if (error instanceof AppError) {
		return apiError(error.message, error.status, error.code);
	}
	console.error('[API Error]', error);
	return apiError('Internal server error', 500);
}

// ─── Auth Wrapper Types ────────────────────────────────────────────────────────

/** Handler that receives the authenticated user. */
type AuthenticatedHandler = (
	request: NextRequest,
	user: ApiUser,
	context?: RouteContext
) => Promise<NextResponse>;

/** Handler that does NOT require authentication. */
type PublicHandler = (
	request: NextRequest,
	context?: RouteContext
) => Promise<NextResponse>;

/**
 * Next.js App Router dynamic route context.
 * `params` is a Promise in Next.js 16+.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<any> };

// ─── Wrapper Functions ─────────────────────────────────────────────────────────

/**
 * Wraps a route handler with authentication + error handling.
 *
 * - Checks for a valid session (via `getApiUser`).
 * - Returns 401 if unauthenticated.
 * - Catches errors and returns a standardized error response.
 *
 * Supports both simple routes and dynamic routes with params:
 *   export const GET = withAuth(async (req, user) => { ... });
 *   export const GET = withAuth(async (req, user, ctx) => { ... });
 */
export function withAuth(handler: AuthenticatedHandler) {
	return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
		try {
			const user = await getApiUser(request);
			if (!user) {
				return apiError('Unauthorized', 401);
			}
			return await handler(request, user, context);
		} catch (error) {
			return handleCaughtError(error);
		}
	};
}

/**
 * Wraps a route handler with admin-only authentication + error handling.
 *
 * - Checks for a valid session AND admin role.
 * - Returns 401 if unauthenticated, 403 if not admin.
 * - Catches errors and returns a standardized error response.
 */
export function withAdmin(handler: AuthenticatedHandler) {
	return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
		try {
			const user = await getApiUser(request);
			if (!user) {
				return apiError('Unauthorized', 401);
			}
			if (user.role !== 'admin') {
				return apiError('Forbidden', 403);
			}
			return await handler(request, user, context);
		} catch (error) {
			return handleCaughtError(error);
		}
	};
}

/**
 * Wraps a public route handler with error handling only (no auth).
 *
 * Useful for routes like GET /api/posts that are accessible to everyone.
 */
export function withErrorHandling(handler: PublicHandler) {
	return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
		try {
			return await handler(request, context);
		} catch (error) {
			return handleCaughtError(error);
		}
	};
}
