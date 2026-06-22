'use client';

import { useEffect, useRef, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface UserMessageDTO {
	id: string;
	content: string;
}

export default function UserMessageModal() {
	const [message, setMessage] = useState<UserMessageDTO | null>(null);
	const [visible, setVisible] = useState(false);
	const [dismissing, setDismissing] = useState(false);
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		void (async () => {
			try {
				const res = await fetch('/api/user-messages/pending');
				const json = await res.json() as { ok: boolean; data?: { message: UserMessageDTO | null } };
				if (json.ok && json.data?.message) {
					setMessage(json.data.message);
					setVisible(true);
				}
			} catch {
				// silent — non-critical
			}
		})();
	}, []);

	useEffect(() => {
		if (visible) closeRef.current?.focus();
	}, [visible]);

	const handleDismiss = async () => {
		if (!message || dismissing) return;
		setDismissing(true);
		try {
			await fetch(`/api/user-messages/${message.id}/dismiss`, { method: 'POST' });
		} catch {
			// silent
		}
		setVisible(false);
		setMessage(null);
		setDismissing(false);
	};

	useEffect(() => {
		if (!visible) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') void handleDismiss();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	if (!visible || !message) return null;

	return (
		<div
			className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="user-msg-title"
			onClick={() => void handleDismiss()}
		>
			<div
				className="relative w-full max-w-sm rounded-3xl border border-pink-200/60 bg-gradient-to-b from-rose-50 to-white p-8 shadow-2xl dark:from-rose-950/40 dark:to-surface dark:border-pink-800/40"
				onClick={(e) => e.stopPropagation()}
			>
				{/* decorative icon */}
				<div className="mb-5 flex justify-center">
					<span className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-2xl dark:bg-rose-900/50">
						💌
					</span>
				</div>

				<h2
					id="user-msg-title"
					className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-rose-400 dark:text-rose-300"
				>
					Tin nhắn dành riêng cho bạn
				</h2>

				<p className="text-center text-base leading-relaxed text-foreground">
					{message.content}
				</p>

				<button
					ref={closeRef}
					type="button"
					disabled={dismissing}
					onClick={() => void handleDismiss()}
					className="mt-8 w-full rounded-2xl bg-rose-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
				>
					{dismissing ? 'Đang đóng…' : 'Đã nhận được 💗'}
				</button>

				<button
					type="button"
					onClick={() => void handleDismiss()}
					aria-label="Đóng"
					className="absolute right-4 top-4 rounded-lg p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
				>
					<MaterialIcon name="close" size={18} />
				</button>
			</div>
		</div>
	);
}
