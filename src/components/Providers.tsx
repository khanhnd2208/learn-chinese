'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@teispace/next-themes';
import { ToastProvider } from '@/components/ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
				<ToastProvider>{children}</ToastProvider>
			</ThemeProvider>
		</SessionProvider>
	);
}
