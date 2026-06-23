'use client';

import { useState } from 'react';
import {
	detectInAppBrowser,
	getExternalBrowserUrl,
	type InAppBrowserKind,
} from '@/lib/detectInAppBrowser';

function noticeCopy(kind: InAppBrowserKind): { title: string; body: string } {
	if (kind === 'ios-standalone') {
		return {
			title: 'Mở bằng Safari để đăng nhập Google',
			body: 'App trên màn hình chính (PWA) không được Google cho phép đăng nhập. Sao chép link trang này, mở Safari và dán vào thanh địa chỉ, rồi đăng nhập lại.',
		};
	}

	return {
		title: 'Mở bằng trình duyệt hệ thống',
		body: 'Bạn đang mở app trong trình duyệt nhúng (Zalo, Messenger, Facebook…). Google chặn đăng nhập ở chế độ này. Nhấn ⋯ hoặc Share rồi chọn “Mở bằng Safari” / “Mở bằng Chrome”, hoặc sao chép link bên dưới.',
	};
}

function readInAppBrowserState(): {
	kind: InAppBrowserKind | null;
	pageUrl: string;
	externalUrl: string | null;
} {
	if (typeof window === 'undefined') {
		return { kind: null, pageUrl: '', externalUrl: null };
	}
	const pageUrl = window.location.href;
	return {
		kind: detectInAppBrowser(),
		pageUrl,
		externalUrl: getExternalBrowserUrl(pageUrl),
	};
}

export default function InAppBrowserNotice() {
	const [{ kind, pageUrl, externalUrl }] = useState(readInAppBrowserState);
	const [copied, setCopied] = useState(false);

	if (!kind) return null;

	const copy = noticeCopy(kind);

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(pageUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard may be blocked in some in-app browsers */
		}
	};

	return (
		<div
			role="alert"
			className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
		>
			<p className="font-bold text-amber-700 dark:text-amber-300">{copy.title}</p>
			<p className="mt-1 text-foreground-secondary">{copy.body}</p>
			<div className="mt-3 flex flex-wrap gap-2">
				{externalUrl ? (
					<a
						href={externalUrl}
						className="inline-flex rounded-full border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
					>
						Mở trong trình duyệt hệ thống
					</a>
				) : null}
				<button
					type="button"
					onClick={handleCopyLink}
					className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
				>
					{copied ? 'Đã sao chép link' : 'Sao chép link'}
				</button>
			</div>
		</div>
	);
}

export function useInAppBrowserBlocked(): boolean {
	const [blocked] = useState(
		() => typeof window !== 'undefined' && detectInAppBrowser() !== null,
	);
	return blocked;
}
