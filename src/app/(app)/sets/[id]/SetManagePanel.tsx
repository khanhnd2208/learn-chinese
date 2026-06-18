"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnWordSetDTO, CnWordSetListItemDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
	allSets: CnWordSetListItemDTO[];
}

export default function SetManagePanel({ set, allSets }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(set.title);
	const [description, setDescription] = useState(set.description);
	const [newTerms, setNewTerms] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAddTerms, setShowAddTerms] = useState(false);

	const otherSets = allSets.filter((s) => s.id !== set.id);

	const saveMeta = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/sets/${set.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, description }),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setEditing(false);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const deleteSet = async () => {
		if (!confirm(`Xóa bộ từ "${set.title}"?`)) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/sets/${set.id}`, { method: 'DELETE' });
			const json = await res.json() as { ok: boolean };
			if (!json.ok) throw new Error('Không xóa được');
			router.push('/sets');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
			setLoading(false);
		}
	};

	const duplicateSet = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/duplicate`, { method: 'POST' });
			const json = await res.json() as { ok: boolean; data?: { set: { id: string } }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			router.push(`/sets/${json.data!.set.id}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
			setLoading(false);
		}
	};

	const addTerms = async () => {
		const terms = newTerms.split('\n').map((t) => t.trim()).filter(Boolean);
		if (!terms.length) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ terms }),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setNewTerms('');
			setShowAddTerms(false);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const removeItem = async (itemId: string, term: string) => {
		if (!confirm(`Xóa "${term}" khỏi bộ từ?`)) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId }),
			});
			const json = await res.json() as { ok: boolean };
			if (!json.ok) throw new Error('Không xóa được');
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const moveItem = async (itemId: string, toSetId: string) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId, toSetId }),
			});
			const json = await res.json() as { ok: boolean };
			if (!json.ok) throw new Error('Không chuyển được');
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="hidden space-y-6 border-t border-border pt-8 md:block">
			<section>
				<h2 className="label-caps mb-4">Quản lý bộ từ</h2>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex-1">
						{editing ? (
							<div className="space-y-3">
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="w-full rounded-lg border border-border bg-background px-4 py-2 text-2xl font-black"
								/>
								<input
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Mô tả"
									className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm"
								/>
								<div className="flex gap-2">
									<button type="button" onClick={saveMeta} disabled={loading} className="btn-primary">Lưu</button>
									<button type="button" onClick={() => setEditing(false)} className="btn-secondary">Hủy</button>
								</div>
							</div>
						) : (
							<p className="text-sm text-muted">Chỉnh sửa metadata, thêm/xóa từ trong bộ.</p>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{!editing && (
							<button type="button" onClick={() => setEditing(true)} className="btn-secondary">
								<MaterialIcon name="edit" size={16} />
								Sửa
							</button>
						)}
						<button type="button" onClick={duplicateSet} disabled={loading} className="btn-secondary">
							<MaterialIcon name="content_copy" size={16} />
							Nhân bản
						</button>
						<button type="button" onClick={deleteSet} disabled={loading} className="btn-secondary text-accent">
							<MaterialIcon name="delete" size={16} />
							Xóa bộ
						</button>
					</div>
				</div>
			</section>

			<section className="flex items-center justify-between">
				<h3 className="text-lg font-extrabold text-foreground">Thêm từ vào bộ</h3>
				<button type="button" onClick={() => setShowAddTerms(!showAddTerms)} className="btn-secondary">
					<MaterialIcon name="add" size={16} />
					Thêm từ
				</button>
			</section>

			{showAddTerms && (
				<div className="card-paper space-y-3 p-4">
					<textarea
						value={newTerms}
						onChange={(e) => setNewTerms(e.target.value)}
						rows={4}
						placeholder="Mỗi dòng một từ"
						className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
					/>
					<button type="button" onClick={addTerms} disabled={loading || !newTerms.trim()} className="btn-primary">
						Thêm vào bộ
					</button>
				</div>
			)}

			{error && <p className="text-sm text-accent">{error}</p>}

			<section>
				<h3 className="mb-3 text-lg font-extrabold text-foreground">Quản lý từng mục</h3>
				<div className="grid gap-3">
					{set.items.map((item) => (
						<div key={item.id} className="card-paper flex flex-wrap items-center justify-between gap-3 p-4">
							<div>
								{item.wordId ? (
									<Link href={`/words/${item.wordId}?setId=${set.id}`} className="hanzi-lg text-xl font-black transition-colors hover:text-accent">
										{item.rawTerm}
									</Link>
								) : (
									<p className="hanzi-lg text-xl font-black text-muted">{item.rawTerm}</p>
								)}
								{item.word ? (
									<p className="text-sm text-foreground-secondary">{item.word.pinyin} · {item.word.meaningVi}</p>
								) : (
									<p className="text-xs text-warning">Chờ bổ sung dữ liệu</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								{otherSets.length > 0 && (
									<select
										className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
										defaultValue=""
										onChange={(e) => {
											if (e.target.value) {
												void moveItem(item.id, e.target.value);
												e.target.value = '';
											}
										}}
										disabled={loading}
									>
										<option value="">Chuyển sang...</option>
										{otherSets.map((s) => (
											<option key={s.id} value={s.id}>{s.title}</option>
										))}
									</select>
								)}
								<button
									type="button"
									onClick={() => void removeItem(item.id, item.rawTerm)}
									disabled={loading}
									className="rounded-full p-1.5 text-muted transition-colors hover:bg-accent-subtle hover:text-accent"
									aria-label="Xóa từ"
								>
									<MaterialIcon name="close" size={18} />
								</button>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
