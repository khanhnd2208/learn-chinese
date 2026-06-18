import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Source_Sans_3 } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

/* eslint-disable @next/next/no-page-custom-font */

const sans = Source_Sans_3({
	variable: '--font-sans',
	subsets: ['latin', 'vietnamese'],
	weight: ['400', '600', '700', '800', '900'],
});

const hanzi = Noto_Sans_SC({
	variable: '--font-hanzi',
	subsets: ['latin'],
	weight: ['400', '700', '900'],
});

export const viewport: Viewport = {
	themeColor: '#9e0027',
};

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3001'),
	title: 'Học Hán Ngữ — Vocabulary Mastery',
	description: 'Học từ vựng Hán ngữ thông minh cho người Việt',
	icons: {
		icon: '/app-icon.png',
		apple: '/app-icon.png',
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="vi" suppressHydrationWarning>
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={`${sans.variable} ${hanzi.variable} antialiased selection:bg-accent-subtle selection:text-accent`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
