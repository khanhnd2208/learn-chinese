'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
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
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when modal opens
		void loadSets();
	}, [open, loadSets]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	const activeCount = sets.filter((s) => s.srsActive).length;

	const handleToggleChanged = (setId: string, active: boolean) => {
		setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, srsActive: active } : s)));
		onUpdated?.();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="srs-vocab-manager-title"
			onClick={onClose}
		>
			<div
				className="card-paper flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b border-border p-4">
					<div>
						<h2 id="srs-vocab-manager-title" className="text-lg font-black text-foreground">
							Quản lí từ vựng SRS
						</h2>
						<p className="mt-1 text-sm text-muted">
							Bật/tắt bộ từ trong hàng đợi ôn hằng ngày tại{' '}
							<strong className="text-foreground-secondary">/review</strong>.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
						aria-label="Đóng"
					>
						<MaterialIcon name="close" size={22} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{loading && (
						<p className="py-8 text-center text-sm text-muted">Đang tải bộ từ...</p>
					)}
					{error && (
						<div className="space-y-3 py-4 text-center">
							<p className="text-sm text-warning">{error}</p>
							<button type="button" className="btn-secondary" onClick={() => { void loadSets(); }}>
								Thử lại
							</button>
						</div>
					)}
					{!loading && !error && sets.length === 0 && (
						<div className="space-y-3 py-6 text-center">
							<MaterialIcon name="menu_book" className="mx-auto text-muted" size={40} />
							<p className="text-sm text-muted">Chưa có bộ từ nào.</p>
							<Link href="/sets/import" className="btn-primary inline-flex" onClick={onClose}>
								<MaterialIcon name="upload_file" size={16} />
								Import từ
							</Link>
						</div>
					)}
					{!loading && !error && sets.length > 0 && (
						<ul className="space-y-2">
							{sets.map((set) => (
								<li
									key={set.id}
									className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
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

				<div className="flex items-center justify-between gap-3 border-t border-border p-4">
					<p className="text-xs text-muted">
						{activeCount}/{sets.length} bộ đang trong SRS
					</p>
					<div className="flex gap-2">
						<Link href="/sets" className="btn-secondary text-sm" onClick={onClose}>
							Quản lí bộ từ
						</Link>
						<button type="button" className="btn-primary text-sm" onClick={onClose}>
							Xong
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
