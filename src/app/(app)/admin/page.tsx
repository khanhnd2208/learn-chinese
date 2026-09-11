"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CnImportPreview } from '@/lib/chinese/parseChineseFile';
import type { CnWordDTO } from '@/types/chinese';
import UserMessageAdminPanel from '@/components/admin/UserMessageAdminPanel';

export default function AdminChinesePage() {
	const [words, setWords] = useState<CnWordDTO[]>([]);
	const [preview, setPreview] = useState<CnImportPreview | null>(null);
	const [importType, setImportType] = useState<'words' | 'hanzi'>('words');
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/admin/import');
			const json = await res.json() as { ok: boolean; data?: { words: CnWordDTO[] } };
			if (json.ok) setWords(json.data?.words ?? []);
		})();
	}, []);

	const handleFile = async (file: File, action: 'preview' | 'publish') => {
		setLoading(true);
		setMessage(null);
		const form = new FormData();
		form.append('file', file);
		form.append('type', importType);
		form.append('action', action);
		try {
			const res = await fetch('/api/admin/import', { method: 'POST', body: form });
			const json = await res.json() as { ok: boolean; data?: { preview?: CnImportPreview; result?: { count: number } }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			if (action === 'preview') setPreview(json.data?.preview ?? null);
			else {
				setMessage(`Đã publish ${json.data?.result?.count ?? 0} mục`);
				setPreview(null);
				const listRes = await fetch('/api/admin/import');
				const listJson = await listRes.json() as { ok: boolean; data?: { words: CnWordDTO[] } };
				if (listJson.ok) setWords(listJson.data?.words ?? []);
			}
		} catch (e) {
			setMessage(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-8">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-black uppercase">Quản lý nội dung Tiếng Trung</h1>
					<p className="mt-2 text-sm text-muted">Import CSV/XLSX — validate, preview, publish. Mnemonic lưu dạng draft/published.</p>
				</div>
				<Link href="/admin/analytics" className="btn-secondary">
					Theo dõi luyện tập
				</Link>
			</div>

			<div className="mt-8 rounded-xl border border-border p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="font-bold">Import dữ liệu</h2>
					<a href="/api/admin/export" className="btn-secondary">
						Export Excel
					</a>
				</div>
				<div className="mt-4 flex gap-4">
					<label className="flex items-center gap-2 text-sm">
						<input type="radio" checked={importType === 'words'} onChange={() => setImportType('words')} /> Từ vựng
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="radio" checked={importType === 'hanzi'} onChange={() => setImportType('hanzi')} /> Chữ Hán
					</label>
				</div>
				<input
					type="file"
					accept=".csv,.xlsx,.xls"
					className="mt-4 block text-sm"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void handleFile(file, 'preview');
					}}
				/>
				{preview && (
					<div className="mt-4 space-y-2 text-sm">
						<p>{importType === 'words' ? preview.words.length : preview.hanzi.length} dòng hợp lệ</p>
						{preview.errors.length > 0 && <p className="text-accent">{preview.errors.length} lỗi</p>}
						{preview.warnings.map((w) => <p key={w} className="text-warning">{w}</p>)}
						<button
							type="button"
							disabled={loading || preview.errors.length > 0}
							onClick={() => {
								const input = document.querySelector<HTMLInputElement>('input[type=file]');
								const file = input?.files?.[0];
								if (file) void handleFile(file, 'publish');
							}}
							className="btn-primary disabled:opacity-50"
						>
							Publish
						</button>
					</div>
				)}
				{message && <p className="mt-4 text-sm">{message}</p>}
			</div>

			<div className="mt-8">
				<h2 className="font-bold">Từ đã publish ({words.length})</h2>
				<div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-border">
					<table className="w-full text-sm">
						<thead className="border-b border-border bg-surface">
							<tr>
								<th className="px-4 py-2 text-left">Từ</th>
								<th className="px-4 py-2 text-left">Pinyin</th>
								<th className="px-4 py-2 text-left">Nghĩa</th>
								<th className="px-4 py-2 text-left">HSK</th>
							</tr>
						</thead>
						<tbody>
							{words.map((w) => (
								<tr key={w.id} className="border-b border-border">
									<td className="px-4 py-2 font-bold">{w.simplified}</td>
									<td className="px-4 py-2">{w.pinyin}</td>
									<td className="px-4 py-2">{w.meaningVi}</td>
									<td className="px-4 py-2">{w.hskLevel ?? '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<UserMessageAdminPanel />
		</div>
	);
}
