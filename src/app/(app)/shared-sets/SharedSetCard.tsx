"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CnSharedWordSetDTO } from '@/types/chinese';

interface Props {
	set: CnSharedWordSetDTO;
}

export default function SharedSetCard({ set }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const duplicate = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/sets/shared/${set.id}/duplicate`, { method: 'POST' });
			const json = await res.json() as { ok: boolean; data?: { set: { id: string } }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi nhân bản');
			if (json.data?.set.id) {
				router.push(`/sets/${json.data.set.id}`);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi nhân bản');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="flex h-full flex-col gap-3 p-4">
			<div className="min-w-0">
				<h3 className="text-lg font-extrabold text-foreground">{set.title}</h3>
				<p className="mt-1 line-clamp-2 text-sm text-muted">{set.description || 'Không có mô tả'}</p>
				<p className="mt-2 text-sm text-foreground-secondary">{set.itemCount} từ</p>
			</div>
			{error && <p className="text-sm text-error">{error}</p>}
			<Button
				className="mt-auto"
				fullWidth
				loading={loading}
				onClick={duplicate}
				leftIcon={<MaterialIcon name="content_copy" size={16} />}
			>
				Nhân bản
			</Button>
		</Card>
	);
}
