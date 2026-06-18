"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnWordSetListItemDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetListItemDTO;
}

export default function SetCardActions({ set }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const duplicate = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setLoading(true);
		try {
			const res = await fetch(`/api/sets/${set.id}/duplicate`, { method: 'POST' });
			const json = await res.json() as { ok: boolean; data?: { set: { id: string } } };
			if (json.ok && json.data) router.push(`/sets/${json.data.set.id}`);
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const deleteSet = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm(`Xóa bộ từ "${set.title}"?`)) return;
		setLoading(true);
		try {
			await fetch(`/api/sets/${set.id}`, { method: 'DELETE' });
			router.refresh();
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	return (
		<div className="relative z-20">
			<button
				type="button"
				onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
				className="rounded-full p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
				aria-label="Tùy chọn"
			>
				<MaterialIcon name="more_vert" size={20} />
			</button>
			{open && (
				<div
					className="absolute right-0 top-8 z-30 min-w-[140px] rounded-lg border border-border bg-surface py-1 shadow-sm"
					onClick={(e) => e.preventDefault()}
				>
					<Link
						href={`/sets/${set.id}`}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover"
						onClick={() => setOpen(false)}
					>
						<MaterialIcon name="edit" size={16} />
						Chỉnh sửa
					</Link>
					<button
						type="button"
						disabled={loading}
						onClick={duplicate}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover"
					>
						<MaterialIcon name="content_copy" size={16} />
						Nhân bản
					</button>
					<button
						type="button"
						disabled={loading}
						onClick={deleteSet}
						className="flex w-full items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-surface-hover"
					>
						<MaterialIcon name="delete" size={16} />
						Xóa
					</button>
				</div>
			)}
		</div>
	);
}
