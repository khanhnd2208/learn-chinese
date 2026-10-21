"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import SetInfoPopover from '@/app/(app)/sets/SetInfoPopover';

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
					? 'Đã xuất bản. Người học thấy bộ này trong Khám phá.'
					: 'Đã chuyển về nháp.',
			});
			router.refresh();
		} catch (e) {
			setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Lỗi' });
		} finally {
			setLoading(false);
		}
	};

	const statusBadge = (
		<Badge variant={shared ? 'success' : 'default'}>
			{shared ? 'Đã xuất bản' : 'Nháp'}
		</Badge>
	);

	const actionButton = (
		<Button
			variant={shared ? 'secondary' : 'primary'}
			size={variant === 'card' ? 'sm' : 'md'}
			loading={loading}
			onClick={toggleShare}
			leftIcon={
				variant === 'hero'
					? <MaterialIcon name={shared ? 'link_off' : 'share'} size={16} />
					: undefined
			}
		>
			{shared ? 'Ngừng xuất bản' : 'Xuất bản'}
		</Button>
	);

	const messageLine = message ? (
		<p
			role="status"
			className={`text-xs ${message.type === 'success' ? 'text-success' : 'text-error'}`}
		>
			{message.text}
		</p>
	) : null;

	if (variant === 'card') {
		return (
			<div className="space-y-1">
				<div className="flex items-center justify-between gap-2">
					{statusBadge}
					{actionButton}
				</div>
				{messageLine}
			</div>
		);
	}

	return (
		<Card className="px-4 py-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="accent">Admin</Badge>
					{statusBadge}
					<SetInfoPopover title="Cách chia sẻ bộ từ" label="Hướng dẫn chia sẻ bộ từ">
						<p>
							Bật chia sẻ để bộ <strong className="text-foreground">{title}</strong> xuất hiện trong mục{' '}
							<Link href="/shared-sets" className="font-bold text-accent hover:underline">
								Chia sẻ bộ từ
							</Link>
							. Người học có thể nhân bản về tài khoản và học độc lập.
						</p>
						<ol className="list-decimal space-y-1 pl-5">
							<li>Thêm đủ từ vào bộ ({itemCount} từ hiện tại)</li>
							<li>
								Bấm <strong className="text-foreground">Chia sẻ lên thư viện</strong>
							</li>
							<li>Người dùng nhân bản tại sidebar → Chia sẻ bộ từ</li>
						</ol>
					</SetInfoPopover>
				</div>
				<div className="sm:shrink-0">{actionButton}</div>
			</div>
			{messageLine ? <div className="mt-2">{messageLine}</div> : null}
		</Card>
	);
}
