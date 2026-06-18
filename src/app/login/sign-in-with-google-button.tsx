'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useInAppBrowserBlocked } from './in-app-browser-notice';

function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 48 48"
			aria-hidden="true"
			className={className}
			focusable="false"
		>
			<path
				fill="#FFC107"
				d="M43.611 20.083H42V20H24v8h11.303C33.682 32.657 29.188 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
			/>
			<path
				fill="#FF3D00"
				d="M6.306 14.691 12.88 19.51C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.166 0-9.65-3.319-11.168-7.946l-6.53 5.03C9.612 39.556 16.227 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
			/>
		</svg>
	);
}

export default function SignInWithGoogleButton({ callbackUrl }: { callbackUrl: string }) {
	const [loading, setLoading] = useState(false);
	const inAppBrowserBlocked = useInAppBrowserBlocked();

	const handleSignIn = async () => {
		if (inAppBrowserBlocked) return;

		setLoading(true);
		try {
			await signIn('google', { callbackUrl }, { prompt: 'select_account' });
		} catch {
			// signIn redirects on success, so errors here are genuine failures
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			disabled={loading || inAppBrowserBlocked}
			onClick={handleSignIn}
			className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold uppercase tracking-wider text-foreground transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
		>
			<GoogleIcon className="h-5 w-5" />
			<span>
				{inAppBrowserBlocked
					? 'Cần mở Safari / Chrome trước'
					: loading
						? 'Đang chuyển hướng...'
						: 'Tiếp tục với Google'}
			</span>
		</button>
	);
}
