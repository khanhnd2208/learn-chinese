import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
	const { pathname } = req.nextUrl;

	if (pathname === '/login') {
		if (req.auth?.user) {
			return NextResponse.redirect(new URL('/', req.url));
		}
		return NextResponse.next();
	}

	if (pathname.startsWith('/admin')) {
		if (!req.auth?.user) {
			return NextResponse.redirect(new URL('/login', req.url));
		}
		if (req.auth.user.role !== 'admin') {
			return NextResponse.redirect(new URL('/', req.url));
		}
	}

	const protectedPaths = ['/', '/sets', '/shared-sets', '/review', '/hht', '/inferno', '/dashboard', '/practice', '/words'];
	const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
	if (isProtected && !req.auth?.user && pathname !== '/login') {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
