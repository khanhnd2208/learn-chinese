"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnWordSetDTO, CnWordSetItemDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
	otherSets: Array<{ id: string; title: string }>;
	/** Only admins may edit or fill in word content. */
	canEditWords?: boolean;
	onMessage?: (message: { success?: string; error?: string }) => void;
}

interface WordFormFields {
	pinyin: string;
	meaningVi: string;
	hanViet: string;
	partOfSpeech: string;
	ghiChu: string;
	mnemonicVi: string;
}

function emptyForm(): WordFormFields {
	return {
		pinyin: '',
		meaningVi: '',
		hanViet: '',
		partOfSpeech: '',
		ghiChu: '',
		mnemonicVi: '',
	};
}

function formFromItem(item: CnWordSetItemDTO): WordFormFields {
	return {
		pinyin: item.word?.pinyin ?? '',
		meaningVi: item.word?.meaningVi ?? '',
		hanViet: item.word?.hanViet ?? '',
		partOfSpeech: item.word?.partOfSpeech ?? '',
		ghiChu: item.word?.ghiChu ?? '',
		mnemonicVi: item.word?.mnemonicVi ?? '',
	};
}

async function confirmBulkRemove(items: CnWordSetItemDTO[]): Promise<boolean> {
	if (!items.length) return false;
	if (items.length === 1) {
		return confirm(`Xóa "${items[0]!.rawTerm}" khỏi bộ từ?`);
	}
	return confirm(`Xóa ${items.length} từ khỏi bộ từ?`);
}

async function confirmBulkMove(
	toSet: { title: string },
	count: number,
): Promise<boolean> {
	return confirm(`Chuyển ${count} từ sang bộ "${toSet.title}"?`);
}

function cellInput(
	value: string,
	onChange: (v: string) => void,
	placeholder?: string,
	mono = false,
) {
	return (
		<input
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className={`w-full min-w-28 rounded border border-border bg-background px-2 py-1 text-sm ${mono ? 'font-mono' : ''}`}
		/>
	);
}

export default function SetWordsTable({ set, otherSets, canEditWords = false, onMessage }: Props) {
	const router = useRouter();
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<WordFormFields>(emptyForm());
	const [loading, setLoading] = useState(false);
	const [bulkMoveTarget, setBulkMoveTarget] = useState('');

	const allSelected = set.items.length > 0 && selectedIds.size === set.items.length;
	const selectedItems = useMemo(
		() => set.items.filter((i) => selectedIds.has(i.id)),
		[set.items, selectedIds],
	);

	const toggleAll = () => {
		if (allSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(set.items.map((i) => i.id)));
		}
	};

	const toggleOne = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const startEdit = (item: CnWordSetItemDTO) => {
		setEditingId(item.id);
		setForm(formFromItem(item));
	};

	const cancelEdit = () => {
		setEditingId(null);
		setForm(emptyForm());
	};

	const updateField = (key: keyof WordFormFields, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const saveEdit = async (item: CnWordSetItemDTO) => {
		if (!form.pinyin.trim() || !form.meaningVi.trim()) {
			onMessage?.({ error: 'Pinyin và nghĩa tiếng Việt là bắt buộc' });
			return;
		}
		setLoading(true);
		onMessage?.({});
		try {
			if (item.wordId) {
				const res = await fetch(`/api/words/${item.wordId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(form),
				});
				const json = await res.json() as { ok: boolean; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Không lưu được');
				onMessage?.({ success: `Đã cập nhật "${item.rawTerm}"` });
			} else {
				const res = await fetch(`/api/sets/${set.id}/items`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ itemId: item.id, wordFields: form }),
				});
				const json = await res.json() as { ok: boolean; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Không bổ sung được dữ liệu');
				onMessage?.({ success: `Đã bổ sung dữ liệu cho "${item.rawTerm}"` });
			}
			cancelEdit();
			router.refresh();
		} catch (e) {
			onMessage?.({ error: e instanceof Error ? e.message : 'Lỗi' });
		} finally {
			setLoading(false);
		}
	};

	const removeItems = async (items: CnWordSetItemDTO[]) => {
		const ok = await confirmBulkRemove(items);
		if (!ok) return;
		setLoading(true);
		onMessage?.({});
		try {
			if (items.length === 1) {
				const item = items[0]!;
				const res = await fetch(`/api/sets/${set.id}/items`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ itemId: item.id }),
				});
				const json = await res.json() as { ok: boolean };
				if (!json.ok) throw new Error('Không xóa được');
				onMessage?.({ success: `Đã xóa "${item.rawTerm}" khỏi bộ` });
			} else {
				const res = await fetch(`/api/sets/${set.id}/items`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ itemIds: items.map((i) => i.id) }),
				});
				const json = await res.json() as {
					ok: boolean;
					data?: { removedCount?: number };
				};
				if (!json.ok) throw new Error('Không xóa được');
				const removed = json.data?.removedCount ?? items.length;
				onMessage?.({ success: `Đã xóa ${removed} từ khỏi bộ` });
			}
			setSelectedIds(new Set());
			router.refresh();
		} catch (e) {
			onMessage?.({ error: e instanceof Error ? e.message : 'Lỗi' });
		} finally {
			setLoading(false);
		}
	};

	const moveItems = async (items: CnWordSetItemDTO[], toSetId: string) => {
		const toSet = otherSets.find((s) => s.id === toSetId);
		if (!toSet) return;
		const ok = await confirmBulkMove(toSet, items.length);
		if (!ok) return;
		setLoading(true);
		onMessage?.({});
		try {
			for (const item of items) {
				const res = await fetch(`/api/sets/${set.id}/items`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ itemId: item.id, toSetId }),
				});
				const json = await res.json() as { ok: boolean };
				if (!json.ok) throw new Error(`Không chuyển được "${item.rawTerm}"`);
			}
			onMessage?.({ success: `Đã chuyển ${items.length} từ sang bộ "${toSet.title}"` });
			setSelectedIds(new Set());
			setBulkMoveTarget('');
			router.refresh();
		} catch (e) {
			onMessage?.({ error: e instanceof Error ? e.message : 'Lỗi' });
		} finally {
			setLoading(false);
		}
	};

	const renderDataCells = (item: CnWordSetItemDTO, isEditing: boolean) => {
		if (isEditing) {
			return (
				<>
					<td className="px-3 py-2">{cellInput(form.pinyin, (v) => updateField('pinyin', v), 'pinyin', true)}</td>
					<td className="px-3 py-2">{cellInput(form.meaningVi, (v) => updateField('meaningVi', v), 'nghĩa')}</td>
					<td className="px-3 py-2">{cellInput(form.hanViet, (v) => updateField('hanViet', v), 'Hán Việt')}</td>
					<td className="px-3 py-2">{cellInput(form.partOfSpeech, (v) => updateField('partOfSpeech', v), 'từ loại')}</td>
					<td className="px-3 py-2">{cellInput(form.ghiChu, (v) => updateField('ghiChu', v), 'ghi chú')}</td>
				</>
			);
		}
		return (
			<>
				<td className="px-3 py-2 font-mono text-sm">{item.word?.pinyin ?? '—'}</td>
				<td className="px-3 py-2 text-sm">{item.word?.meaningVi ?? '—'}</td>
				<td className="px-3 py-2 text-sm text-foreground-secondary">{item.word?.hanViet || '—'}</td>
				<td className="px-3 py-2 text-sm text-foreground-secondary">{item.word?.partOfSpeech || '—'}</td>
				<td className="px-3 py-2 text-sm text-foreground-secondary">{item.word?.ghiChu || '—'}</td>
			</>
		);
	};

	return (
		<section className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3 className="text-lg font-extrabold text-foreground">
					Danh sách từ ({set.items.length})
				</h3>
				<p className="text-xs text-muted">
					Các cột giống file Excel import — chỉnh sửa trực tiếp tại đây
				</p>
			</div>

			{selectedIds.size > 0 && (
				<div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-surface p-3 shadow-sm">
					<span className="text-sm font-semibold text-foreground">
						Đã chọn {selectedIds.size} từ
					</span>
					<button
						type="button"
						onClick={() => void removeItems(selectedItems)}
						disabled={loading}
						className="btn-secondary text-sm text-accent"
					>
						<MaterialIcon name="delete" size={16} />
						Xóa {selectedIds.size} từ
					</button>
					{otherSets.length > 0 && (
						<div className="flex items-center gap-2">
							<select
								value={bulkMoveTarget}
								onChange={(e) => setBulkMoveTarget(e.target.value)}
								className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
								disabled={loading}
							>
								<option value="">Chuyển sang...</option>
								{otherSets.map((s) => (
									<option key={s.id} value={s.id}>
										{s.title}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => {
									if (bulkMoveTarget) void moveItems(selectedItems, bulkMoveTarget);
								}}
								disabled={loading || !bulkMoveTarget}
								className="btn-secondary text-sm"
							>
								Chuyển
							</button>
						</div>
					)}
					<button
						type="button"
						onClick={() => setSelectedIds(new Set())}
						className="ml-auto text-xs text-muted hover:text-foreground"
					>
						Bỏ chọn
					</button>
				</div>
			)}

			<div className="overflow-x-auto rounded-lg border border-border">
				<table className="w-full min-w-4xl text-left text-sm">
					<thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
						<tr>
							<th className="w-10 px-3 py-3">
								<input
									type="checkbox"
									checked={allSelected}
									onChange={toggleAll}
									aria-label="Chọn tất cả"
								/>
							</th>
							<th className="px-3 py-3">汉字</th>
							<th className="px-3 py-3">Pinyin</th>
							<th className="px-3 py-3">Nghĩa</th>
							<th className="px-3 py-3">Hán Việt</th>
							<th className="px-3 py-3">Từ loại</th>
							<th className="px-3 py-3">Ghi chú</th>
							<th className="px-3 py-3 text-right">Thao tác</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{set.items.length === 0 && (
							<tr>
								<td colSpan={8} className="px-3 py-8 text-center text-muted">
									Chưa có từ trong bộ — thêm từ ở phía trên
								</td>
							</tr>
						)}
						{set.items.map((item) => {
							const isEditing = editingId === item.id;
							return (
								<tr key={item.id} className={selectedIds.has(item.id) ? 'bg-accent-subtle/30' : 'bg-background'}>
									<td className="px-3 py-2 align-top">
										<input
											type="checkbox"
											checked={selectedIds.has(item.id)}
											onChange={() => toggleOne(item.id)}
											aria-label={`Chọn ${item.rawTerm}`}
										/>
									</td>
									<td className="px-3 py-2 align-top">
										{item.wordId ? (
											<Link
												href={`/words/${item.wordId}?setId=${set.id}`}
												className="hanzi-lg font-black transition-colors hover:text-accent"
											>
												{item.rawTerm}
											</Link>
										) : (
											<span className="hanzi-lg font-black text-warning">{item.rawTerm}</span>
										)}
										{!item.wordId && (
											<p className="mt-0.5 text-xs text-warning">Chờ bổ sung dữ liệu</p>
										)}
									</td>
									{renderDataCells(item, isEditing)}
									<td className="px-3 py-2 align-top">
										<div className="flex justify-end gap-1">
											{isEditing ? (
												<>
													<button
														type="button"
														onClick={() => void saveEdit(item)}
														disabled={loading}
														className="btn-primary px-2 py-1 text-xs"
													>
														Lưu
													</button>
													<button
														type="button"
														onClick={cancelEdit}
														disabled={loading}
														className="btn-secondary px-2 py-1 text-xs"
													>
														Hủy
													</button>
												</>
											) : (
												<>
													{canEditWords && (
														<button
															type="button"
															onClick={() => startEdit(item)}
															disabled={loading || editingId !== null}
															className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
															aria-label="Sửa từ"
														>
															<MaterialIcon name="edit" size={16} />
														</button>
													)}
													<button
														type="button"
														onClick={() => void removeItems([item])}
														disabled={loading}
														className="rounded-full p-1.5 text-muted transition-colors hover:bg-accent-subtle hover:text-accent"
														aria-label="Xóa từ"
													>
														<MaterialIcon name="close" size={16} />
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
