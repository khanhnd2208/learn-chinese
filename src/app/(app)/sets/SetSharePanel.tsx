"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	setId: string;
	title: string;
	itemCount: number;
	shared: boolean;
	variant?: 'hero' | 'card';
}

export default function SetSharePanel({ setId, title, itemCount, shared: initialShared, variant = 'hero' }: Props) {
	const router = useRouter();
	const [shared, setShared] = useState(initialShared);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const toggleShare = async () => {
		if (!shared && itemCount === 0) {
			setMessage({ type: 'error', text: 'Thêm ít nhất một từ vào bộ trước khi chia sẻ.' });
			return;
		}

		setLoading(true);
		setMessage(null);
		try {
			const res = await fetch(`/api/sets/${setId}/share`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shared: !shared }),
			});
			const json = await res.json() as { ok: boolean; error?: string; data?: { set: { shared: boolean } } };
			if (!json.ok) throw new Error(json.error ?? 'Không cập nhật được');
			const nextShared = json.data?.set.shared ?? !shared;
			setShared(nextShared);
			setMessage({
				type: 'success',
				text: nextShared
					? 'Đã chia sẻ — người dùng có thể nhân bản tại mục Chia sẻ bộ từ.'
					: 'Đã gỡ khỏi thư viện chia sẻ.',
			});
			router.refresh();
		} catch (e) {
			setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Lỗi' });
		} finally {
			setLoading(false);
		}
	};

	if (variant === 'card') {
		return (
			<div className="space-y-2 border-t border-border pt-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 text-xs">
						<MaterialIcon name="share" size={14} className="text-accent" />
						<span className="font-bold text-foreground">Thư viện chia sẻ</span>
						<span
							className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
								shared ? 'bg-success/15 text-success' : 'bg-surface-hover text-muted'
							}`}
						>
							{shared ? 'Đang chia sẻ' : 'Riêng tư'}
						</span>
					</div>
					<button
						type="button"
						onClick={toggleShare}
						disabled={loading}
						className={shared ? 'btn-secondary !py-1 !text-xs' : 'btn-primary !py-1 !text-xs'}
					>
						{loading ? '...' : shared ? 'Bỏ chia sẻ' : 'Chia sẻ'}
					</button>
				</div>
				{message && (
					<p className={`text-xs ${message.type === 'success' ? 'text-success' : 'text-accent'}`}>
						{message.text}
					</p>
				)}
			</div>
		);
	}

	return (
		<section className="card-paper space-y-4 border-l-4 border-l-accent p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="label-caps rounded-full bg-accent-subtle px-2.5 py-1 !text-[10px] text-accent">
							Admin
						</span>
						<span
							className={`label-caps rounded-full px-2.5 py-1 !text-[10px] ${
								shared ? 'bg-success/15 text-success' : 'bg-surface-hover text-muted'
							}`}
						>
							{shared ? 'Đang chia sẻ công khai' : 'Chưa chia sẻ'}
						</span>
					</div>
					<h2 className="text-lg font-extrabold text-foreground">Chia sẻ bộ từ cho người dùng</h2>
					<p className="max-w-2xl text-sm text-muted">
						Bật chia sẻ để bộ <strong className="text-foreground">{title}</strong> xuất hiện trong mục{' '}
						<Link href="/shared-sets" className="font-bold text-accent hover:underline">
							Chia sẻ bộ từ
						</Link>
						. Người học có thể nhân bản về tài khoản và học độc lập.
					</p>
				</div>
				<button
					type="button"
					onClick={toggleShare}
					disabled={loading}
					className={`shrink-0 ${shared ? 'btn-secondary' : 'btn-primary'}`}
				>
					<MaterialIcon name={shared ? 'link_off' : 'share'} size={18} />
					{loading ? 'Đang xử lý...' : shared ? 'Bỏ chia sẻ' : 'Chia sẻ lên thư viện'}
				</button>
			</div>

			<ol className="grid gap-2 text-sm text-foreground-secondary sm:grid-cols-3">
				<li className="flex gap-2 rounded-lg border border-border bg-surface-container/40 p-3">
					<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-black text-accent">
						1
					</span>
					<span>Thêm đủ từ vào bộ ({itemCount} từ hiện tại)</span>
				</li>
				<li className="flex gap-2 rounded-lg border border-border bg-surface-container/40 p-3">
					<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-black text-accent">
						2
					</span>
					<span>Bấm <strong className="text-foreground">Chia sẻ lên thư viện</strong></span>
				</li>
				<li className="flex gap-2 rounded-lg border border-border bg-surface-container/40 p-3">
					<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-black text-accent">
						3
					</span>
					<span>Người dùng nhân bản tại sidebar → Chia sẻ bộ từ</span>
				</li>
			</ol>

			{shared && (
				<p className="flex items-center gap-2 text-sm text-success">
					<MaterialIcon name="check_circle" size={18} />
					Đang hiển thị trên thư viện.{' '}
					<Link href="/shared-sets" className="font-bold underline underline-offset-2">
						Xem trang Chia sẻ bộ từ
					</Link>
				</p>
			)}

			{message && (
				<p
					className={`rounded-lg p-3 text-sm ${
						message.type === 'success'
							? 'border border-success/30 bg-success/10 text-foreground-secondary'
							: 'text-accent'
					}`}
				>
					{message.text}
				</p>
			)}
		</section>
	);
}
