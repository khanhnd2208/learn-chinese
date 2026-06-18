"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import CoverageReport from '@/components/chinese/CoverageReport';
import type { CnCoverageReportDTO } from '@/types/chinese';

export default function CreateChineseSetPage() {
	const router = useRouter();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [termsText, setTermsText] = useState('');
	const [coverage, setCoverage] = useState<CnCoverageReportDTO | null>(null);
	const [srsActive, setSrsActive] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const terms = termsText.split('\n').map((t) => t.trim()).filter(Boolean);

	const previewCoverage = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/lookup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ terms }),
			});
			const json = await res.json() as { ok: boolean; data?: { coverage: CnCoverageReportDTO }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setCoverage(json.data?.coverage ?? null);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const createSet = async (source: 'manual' | 'hsk' = 'manual', hskLevel?: number) => {
		if (!title.trim()) { setError('Cần tên bộ từ'); return; }
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/sets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, description, terms, source, hskLevel, srsActive }),
			});
			const json = await res.json() as { ok: boolean; data?: { set: { id: string } }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			router.push(`/sets/${json.data!.set.id}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
			<section>
				<Link href="/sets" className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
					<MaterialIcon name="arrow_back" size={16} />
					Bộ từ
				</Link>
				<h1 className="mt-4 text-3xl font-black text-foreground">Tạo bộ từ mới</h1>
			</section>

			<div className="card-paper p-8 text-center md:hidden">
				<MaterialIcon name="computer" className="mx-auto text-muted" size={48} />
				<p className="mt-4 text-sm text-foreground-secondary">
					Tính năng tạo bộ từ khuyên dùng trên máy tính để dễ dán danh sách từ sau buổi học.
				</p>
				<Link href="/sets" className="btn-primary mt-6">
					<MaterialIcon name="arrow_back" size={16} />
					Quay lại bộ từ
				</Link>
			</div>

			<div className="card-paper hidden space-y-6 p-6 md:block">
				<div>
					<label className="label-caps">Tên bộ từ</label>
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
						placeholder="Bài 1 - Giới thiệu bản thân"
					/>
				</div>
				<div>
					<label className="label-caps">Mô tả</label>
					<input
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
					/>
				</div>
				<div>
					<label className="label-caps">Dán danh sách từ (mỗi dòng một từ)</label>
					<textarea
						value={termsText}
						onChange={(e) => setTermsText(e.target.value)}
						rows={10}
						className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
						placeholder={'我\n你\n学生\n老师'}
					/>
				</div>

				<div className="rounded-lg border border-border bg-surface-container/50 p-4 space-y-3">
					<label className="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							checked={srsActive}
							onChange={(e) => setSrsActive(e.target.checked)}
							className="mt-1 h-4 w-4 accent-accent"
						/>
						<div>
							<p className="text-sm font-bold text-foreground">Đưa bộ này vào SRS (ôn tập hàng ngày)</p>
							<p className="mt-1 text-xs text-muted">
								Bật: từ sẽ vào <strong>/review</strong> và trộn với các bộ SRS khác.
								Tắt: chỉ luyện trong bộ, không ảnh hưởng tiến độ ôn. Có thể bật/tắt sau trong danh sách bộ từ.
							</p>
						</div>
					</label>
				</div>

				<div className="flex flex-wrap gap-3">
					<button type="button" onClick={previewCoverage} disabled={!terms.length || loading} className="btn-secondary disabled:opacity-50">
						Kiểm tra dữ liệu
					</button>
					<button type="button" onClick={() => createSet('manual')} disabled={!terms.length || !title.trim() || loading} className="btn-primary disabled:opacity-50">
						Bắt đầu học
					</button>
					<button type="button" onClick={() => createSet('hsk', 1)} disabled={loading} className="btn-secondary disabled:opacity-50">
						Thêm HSK 1
					</button>
				</div>

				{error && <p className="text-sm text-accent">{error}</p>}
				{coverage && <CoverageReport coverage={coverage} />}
			</div>
		</div>
	);
}
