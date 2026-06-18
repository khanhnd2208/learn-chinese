"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HanziLabPanel from '@/components/chinese/HanziLabPanel';
import type { CnHanziAnalysisDTO } from '@/types/chinese';
import { MAX_HANZI_LAB_TERMS } from '@/config/constants';

export default function HanziLabClient() {
	const searchParams = useSearchParams();
	const initialTerm = searchParams.get('term') ?? '';
	const [input, setInput] = useState(initialTerm);
	const [analyses, setAnalyses] = useState<CnHanziAnalysisDTO[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const analyze = async () => {
		const terms = input.split(/[\n,，]/).map((t) => t.trim()).filter(Boolean);
		if (!terms.length) return;
		if (terms.length > MAX_HANZI_LAB_TERMS) {
			setError(`Tối đa ${MAX_HANZI_LAB_TERMS} từ mỗi lần`);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/hanzi/${encodeURIComponent(terms[0])}?terms=${terms.map(encodeURIComponent).join(',')}`);
			const json = await res.json() as { ok: boolean; data?: { analyses: CnHanziAnalysisDTO[] }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setAnalyses(json.data?.analyses ?? []);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<h1 className="text-4xl font-black text-foreground">Hanzi Lab</h1>
				<p className="mt-2 text-sm text-foreground-secondary">
					Phân tích cấu tạo và bộ thủ của chữ Hán — tối đa {MAX_HANZI_LAB_TERMS} từ/lần.
				</p>
			</section>

			<section className="card-paper space-y-4 p-6 shadow-sm">
				<label className="label-caps" htmlFor="hanzi-input">
					Nhập chữ Hán cần phân tích (tối đa {MAX_HANZI_LAB_TERMS} ký tự)
				</label>
				<textarea
					id="hanzi-input"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					rows={3}
					placeholder="Ví dụ: 折磨"
					className="hanzi-lg w-full resize-none rounded-lg border border-border bg-background p-4 text-2xl text-foreground placeholder:font-sans placeholder:text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
				/>
				<div className="flex justify-end">
					<button
						type="button"
						onClick={analyze}
						disabled={loading || !input.trim()}
						className="btn-primary px-8 disabled:opacity-50"
					>
						{loading ? 'Đang phân tích...' : 'Phân tích ngay'}
					</button>
				</div>
			</section>

			{error && <p className="text-sm text-accent">{error}</p>}

			<section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				{analyses.map((a) => <HanziLabPanel key={a.term} analysis={a} />)}
			</section>
		</div>
	);
}
