"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetSrsToggle, { confirmDeleteSrsSet } from '@/app/(app)/sets/SetSrsToggle';
import SetSrsStatusBanner from '@/app/(app)/sets/SetSrsStatusBanner';
import type { CnWordSetDTO, CnWordSetListItemDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
	allSets: CnWordSetListItemDTO[];
}

async function confirmRemoveWord(
	setId: string,
	term: string,
	wordId: string | null,
	srsActive: boolean,
): Promise<boolean> {
	if (!srsActive || !wordId) {
		return confirm(`Xóa "${term}" khỏi bộ từ?`);
	}
	try {
		const res = await fetch(`/api/sets/${setId}/items?preview=remove&wordId=${encodeURIComponent(wordId)}`);
		const json = await res.json() as {
			ok: boolean;
			data?: { wouldPurgeProgress: boolean; inOtherActiveSet: boolean };
		};
		if (!json.ok || !json.data) return confirm(`Xóa "${term}" khỏi bộ từ?`);
		if (!json.data.wouldPurgeProgress) {
			return confirm(
				`Xóa "${term}" khỏi bộ từ?\n\nTừ vẫn còn trong bộ SRS khác — tiến độ ôn được giữ.`,
			);
		}
		return confirm(
			`Xóa "${term}" khỏi bộ SRS?\n\n`
			+ 'Từ không còn trong bộ SRS nào khác — tiến độ ôn sẽ bị xóa.\n'
			+ 'Lịch sử luyện tập vẫn được giữ.\n\n'
			+ 'Tiếp tục xóa?',
		);
	} catch {
		return confirm(`Xóa "${term}" khỏi bộ từ?`);
	}
}

async function confirmMoveWord(
	fromSet: CnWordSetDTO,
	toSet: CnWordSetListItemDTO,
	term: string,
	wordId: string | null,
): Promise<boolean> {
	if (!fromSet.srsActive || !wordId) {
		return confirm(`Chuyển "${term}" sang bộ "${toSet.title}"?`);
	}
	if (toSet.srsActive) {
		return confirm(
			`Chuyển "${term}" sang bộ SRS "${toSet.title}"?\n\nTiến độ ôn được giữ.`,
		);
	}
	try {
		const res = await fetch(
			`/api/sets/${fromSet.id}/items?preview=remove&wordId=${encodeURIComponent(wordId)}`,
		);
		const json = await res.json() as {
			ok: boolean;
			data?: { wouldPurgeProgress: boolean };
		};
		if (!json.ok || !json.data?.wouldPurgeProgress) {
			return confirm(`Chuyển "${term}" sang bộ "${toSet.title}"?`);
		}
		return confirm(
			`Chuyển "${term}" sang bộ không SRS?\n\n`
			+ 'Từ không còn trong bộ SRS nào — tiến độ ôn sẽ bị xóa.\n\n'
			+ 'Tiếp tục?',
		);
	} catch {
		return confirm(`Chuyển "${term}" sang bộ "${toSet.title}"?`);
	}
}

export default function SetManagePanel({ set, allSets }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(set.title);
	const [description, setDescription] = useState(set.description);
	const [newTerms, setNewTerms] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showAddTerms, setShowAddTerms] = useState(false);

	const otherSets = allSets.filter((s) => s.id !== set.id);
	const hasResolvedWords = set.items.some((i) => i.wordId);

	const purgeSrsProgress = async () => {
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const previewRes = await fetch(`/api/sets/${set.id}/srs?preview=deactivate`);
			const previewJson = await previewRes.json() as {
				ok: boolean;
				data?: { exclusiveWordCount: number; wouldLoseProgress: boolean };
			};
			if (!previewJson.ok || !previewJson.data) throw new Error('Không tải được thông tin');

			const { exclusiveWordCount, wouldLoseProgress } = previewJson.data;
			if (!wouldLoseProgress) {
				setSuccess('Không có tiến độ SRS riêng của bộ này để xóa (từ vẫn nằm trong bộ SRS khác).');
				return;
			}

			const ok = confirm(
				`Xóa tiến độ SRS của ${exclusiveWordCount} từ chỉ thuộc bộ "${set.title}"?\n\n`
				+ 'Lịch sử luyện tập vẫn được giữ.\n\n'
				+ 'Tiếp tục?',
			);
			if (!ok) return;

			const res = await fetch(`/api/sets/${set.id}/srs`, { method: 'DELETE' });
			const json = await res.json() as {
				ok: boolean;
				error?: string;
				data?: { purgedWordCount: number };
			};
			if (!json.ok) throw new Error(json.error ?? 'Không xóa được tiến độ');
			setSuccess(`Đã xóa tiến độ SRS của ${json.data?.purgedWordCount ?? 0} từ`);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const saveMeta = async () => {
		setLoading(true);
		setError(null);
		setSuccess(null);
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
		const ok = await confirmDeleteSrsSet(set.id, set.title, set.srsActive);
		if (!ok) return;
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
		setSuccess(null);
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
		setSuccess(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ terms }),
			});
			const json = await res.json() as {
				ok: boolean;
				error?: string;
				data?: { enrolledCount?: number };
			};
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			const enrolled = json.data?.enrolledCount ?? 0;
			setNewTerms('');
			setShowAddTerms(false);
			if (set.srsActive && enrolled > 0) {
				setSuccess(`Đã thêm ${terms.length} từ · ${enrolled} từ vào hàng đợi SRS`);
			} else {
				setSuccess(`Đã thêm ${terms.length} từ vào bộ`);
			}
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const removeItem = async (itemId: string, term: string, wordId: string | null) => {
		const ok = await confirmRemoveWord(set.id, term, wordId, set.srsActive);
		if (!ok) return;
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId }),
			});
			const json = await res.json() as { ok: boolean; data?: { purgedProgress?: boolean } };
			if (!json.ok) throw new Error('Không xóa được');
			if (json.data?.purgedProgress) {
				setSuccess(`Đã xóa "${term}" · tiến độ SRS của từ đã bị xóa`);
			} else {
				setSuccess(`Đã xóa "${term}" khỏi bộ`);
			}
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const moveItem = async (itemId: string, toSetId: string, term: string, wordId: string | null) => {
		const toSet = otherSets.find((s) => s.id === toSetId);
		if (!toSet) return;
		const ok = await confirmMoveWord(set, toSet, term, wordId);
		if (!ok) return;
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId, toSetId }),
			});
			const json = await res.json() as { ok: boolean };
			if (!json.ok) throw new Error('Không chuyển được');
			setSuccess(`Đã chuyển "${term}" sang bộ "${toSet.title}"`);
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
				<div className="mb-4 space-y-3">
					<SetSrsStatusBanner srsActive={set.srsActive} variant="manage" />
					<SetSrsToggle setId={set.id} srsActive={set.srsActive} title={set.title} />
					{hasResolvedWords && (
						<button
							type="button"
							onClick={() => { void purgeSrsProgress(); }}
							disabled={loading}
							className="btn-secondary w-full text-sm text-accent"
						>
							<MaterialIcon name="delete_sweep" size={16} />
							Xóa tiến độ SRS của bộ này
						</button>
					)}
				</div>
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
					{set.srsActive && (
						<p className="text-xs text-foreground-secondary">
							Từ có dữ liệu trong DB sẽ tự vào hàng đợi SRS sau khi thêm.
						</p>
					)}
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

			{success && (
				<p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground-secondary">
					{success}
				</p>
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
											const toSetId = e.target.value;
											if (toSetId) {
												void moveItem(item.id, toSetId, item.rawTerm, item.wordId);
												e.target.value = '';
											}
										}}
										disabled={loading}
									>
										<option value="">Chuyển sang...</option>
										{otherSets.map((s) => (
											<option key={s.id} value={s.id}>
												{s.title}{s.srsActive ? ' (SRS)' : ''}
											</option>
										))}
									</select>
								)}
								<button
									type="button"
									onClick={() => void removeItem(item.id, item.rawTerm, item.wordId)}
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
