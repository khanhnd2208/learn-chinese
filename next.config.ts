import type { NextConfig } from 'next';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const nextConfig: NextConfig = {
	turbopack: {
		root: dirname(fileURLToPath(import.meta.url)),
	},
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'lh3.googleusercontent.com' },
		],
	},
};

export default nextConfig;
