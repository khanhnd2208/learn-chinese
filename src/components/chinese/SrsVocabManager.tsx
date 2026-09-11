'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import Skeleton from '@/components/ui/Skeleton';
import SetSrsToggle from '@/app/(app)/sets/SetSrsToggle';
import type { CnWordSetListItemDTO } from '@/types/chinese';

interface Props {
	open: boolean;
	onClose: () => void;
	onUpdated?: () => void;
}

export default function SrsVocabManager({ open, onClose, onUpdated }: Props) {
	const [sets, setSets] = useState<CnWordSetListItemDTO[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadSets = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/sets');
			const json = await res.json() as {
				ok: boolean;
				error?: string;
				data?: { items: CnWordSetListItemDTO[] };
			};
			if (!json.ok || !json.data) throw new Error(json.error ?? 'Không tải được danh sách bộ từ');
			setSets(json.data.items);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when sheet opens
		void loadSets();
	}, [open, loadSets]);

	const activeCount = sets.filter((s) => s.srsActive).length;

	const handleToggleChanged = (setId: string, active: boolean) => {
		setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, srsActive: active } : s)));
		onUpdated?.();
	};

	return (
		<Sheet open={open} onClose={onClose} title="Quản lí từ vựng SRS" className="flex max-h-[85vh] flex-col p-0">
			<p className="-mt-2 mb-4 text-sm text-muted">
				Bật/tắt bộ từ trong hàng đợi ôn hằng ngày tại{' '}
				<strong className="text-foreground-secondary">/review</strong>.
			</p>

			<div className="flex-1 overflow-y-auto">
				{loading && (
					<div className="space-y-3 py-4">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				)}
				{error && (
					<div className="space-y-3 py-4 text-center">
						<p className="text-sm text-warning">{error}</p>
						<Button variant="secondary" onClick={() => { void loadSets(); }}>
							Thử lại
						</Button>
					</div>
				)}
				{!loading && !error && sets.length === 0 && (
					<div className="space-y-3 py-6 text-center">
						<MaterialIcon name="menu_book" className="mx-auto text-muted" size={40} />
						<p className="text-sm text-muted">Chưa có bộ từ nào.</p>
						<Link href="/sets/import" onClick={onClose}>
							<Button leftIcon={<MaterialIcon name="upload_file" size={16} />}>
								Import từ
							</Button>
						</Link>
					</div>
				)}
				{!loading && !error && sets.length > 0 && (
					<ul className="space-y-2">
						{sets.map((set) => (
							<li
								key={set.id}
								className="flex items-center justify-between gap-3 rounded-card border border-border p-3"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-bold text-foreground">{set.title}</p>
									<p className="mt-0.5 text-xs text-muted">
										{set.itemCount} từ
										{set.srsActive && set.dueCount > 0 && (
											<span className="text-accent"> · {set.dueCount} mục đến hạn</span>
										)}
									</p>
								</div>
								<SetSrsToggle
									setId={set.id}
									srsActive={set.srsActive}
									title={set.title}
									compact
									onChanged={(active) => handleToggleChanged(set.id, active)}
								/>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
				<p className="text-xs text-muted">
					{activeCount}/{sets.length} bộ đang trong SRS
				</p>
				<div className="flex gap-2">
					<Link href="/sets" onClick={onClose}>
						<Button variant="secondary" size="sm">Quản lí bộ từ</Button>
					</Link>
					<Button size="sm" onClick={onClose}>Xong</Button>
				</div>
			</div>
		</Sheet>
	);
}
