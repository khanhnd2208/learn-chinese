import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Học Hán Ngữ',
		short_name: 'Hán Ngữ',
		description: 'Học từ vựng Hán ngữ thông minh cho người Việt',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#f7f4ef',
		theme_color: '#9e0027',
		orientation: 'portrait',
		icons: [
			{
				src: '/app-icon-192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable',
			},
			{
				src: '/app-icon-512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
	};
}
