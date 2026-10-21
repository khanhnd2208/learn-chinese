import type { NextConfig } from 'next';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
	turbopack: {
		root: dirname(fileURLToPath(import.meta.url)),
	},
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'lh3.googleusercontent.com' },
		],
	},
	async redirects() {
		return [
			{ source: '/sets', destination: '/library', permanent: false },
			{ source: '/shared-sets', destination: '/explore', permanent: false },
			{ source: '/sets/import', destination: '/admin/sets/new', permanent: false },
			{ source: '/sets/create', destination: '/admin/sets/new', permanent: false },
		];
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
