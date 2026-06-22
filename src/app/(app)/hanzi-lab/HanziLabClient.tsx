"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HanziAiResultPanel from '@/components/chinese/HanziAiResultPanel';
import HanziLabPanel from '@/components/chinese/HanziLabPanel';
import type { CnHanziAnalysisDTO } from '@/types/chinese';
import type { HanziAiPublicAnalysis } from '@/services/chinese/hanziAi/hanziAiTypes';
import { HANZI_AI_POLL_INTERVAL_MS, HANZI_AI_POLL_MAX_MS } from '@/config/hanziAi';

const VALID_TERM = /^\p{Script=Han}{1,4}$/u;
const LOADING_COPY = [
	'Đang chuẩn bị phân tích…',
	'Đang phân tích cấu tạo từng chữ…',
	'Đang viết giải thích và ví dụ bằng tiếng Việt…',
];

export default function HanziLabClient() {
	const searchParams = useSearchParams();
	const initialTerm = searchParams.get('term')?.trim().normalize('NFKC') ?? '';
	const [input, setInput] = useState(initialTerm);
	const [analysis, setAnalysis] = useState<HanziAiPublicAnalysis | null>(null);
	const [curated, setCurated] = useState<CnHanziAnalysisDTO | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingStep, setLoadingStep] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);

	const normalized = input.trim().normalize('NFKC');
	const valid = VALID_TERM.test(normalized);

	const stopPolling = useCallback(() => {
		if (pollingRef.current) clearTimeout(pollingRef.current);
		pollingRef.current = null;
	}, []);

	const poll = useCallback(async function pollStatus(id: string, startedAt: number) {
		if (!mountedRef.current || Date.now() - startedAt >= HANZI_AI_POLL_MAX_MS) {
			setLoading(false);
			return setError('Phân tích đang mất nhiều thời gian. Bạn có thể kiểm tra lại sau.');
		}
		const response = await fetch(`/api/hanzi/analysis/${id}`);
		const json = await response.json() as { ok: boolean; data?: HanziAiPublicAnalysis; error?: string };
		if (!json.ok) { if (mountedRef.current) { setLoading(false); setError(json.error ?? 'Không kiểm tra được trạng thái'); } return; }
		if (!mountedRef.current) return;
		if (json.data?.status === 'generating') {
			pollingRef.current = setTimeout(() => void pollStatus(id, startedAt), HANZI_AI_POLL_INTERVAL_MS);
			return;
		}
		setAnalysis(json.data ?? null);
		setLoading(false);
	}, []);

	const runAnalyze = useCallback(async (termOverride?: string) => {
		const term = (termOverride ?? normalized).trim().normalize('NFKC');
		if (!VALID_TERM.test(term) || loading) return;
		stopPolling();
		setLoading(true); setLoadingStep(0); setError(null); setAnalysis(null);
		try {
			const response = await fetch('/api/hanzi/analyze', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ term }),
			});
			const json = await response.json() as { ok: boolean; data?: HanziAiPublicAnalysis; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Không thể phân tích');
			if (response.status === 202 && json.data) return void poll(json.data.id, Date.now());
			setAnalysis(json.data ?? null);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Không thể phân tích');
		} finally {
			if (!pollingRef.current) setLoading(false);
		}
	}, [normalized, loading, poll, stopPolling]);

	const loadCached = useCallback(async (term: string) => {
		if (!VALID_TERM.test(term)) return;
		const [aiResponse, curatedResponse] = await Promise.all([
			fetch(`/api/hanzi/analysis?term=${encodeURIComponent(term)}`),
			fetch(`/api/hanzi/${encodeURIComponent(term)}`),
		]);
		const aiJson = await aiResponse.json() as { ok: boolean; data?: { analysis: HanziAiPublicAnalysis | null } };
		const curatedJson = await curatedResponse.json() as { ok: boolean; data?: { term: CnHanziAnalysisDTO | null } };
		if (curatedJson.ok) setCurated(curatedJson.data?.term ?? null);
		const cached = aiJson.data?.analysis;
		if (cached?.status === 'generating') {
			setAnalysis(cached);
			setLoading(true);
			void poll(cached.id, Date.now());
			return;
		}
		if (cached?.status === 'stale') {
			// Bản cũ không còn dùng được — tự tạo lại, không hiện jargon kỹ thuật.
			void runAnalyze(term);
			return;
		}
		if (aiJson.ok) setAnalysis(cached ?? null);
	}, [poll, runAnalyze]);

	useEffect(() => {
		mountedRef.current = true;
		const timer = initialTerm && VALID_TERM.test(initialTerm)
			? setTimeout(() => void loadCached(initialTerm), 0)
			: null;
		return () => { if (timer) clearTimeout(timer); mountedRef.current = false; stopPolling(); };
	}, [initialTerm, loadCached, stopPolling]);

	useEffect(() => {
		if (!loading) return;
		const timer = setInterval(() => setLoadingStep((step) => (step + 1) % LOADING_COPY.length), 3500);
		return () => clearInterval(timer);
	}, [loading]);

	const analyze = () => void runAnalyze();

	return (
		<div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<h1 className="text-4xl font-black">Hanzi Lab</h1>
				<p className="mt-2 text-sm text-foreground-secondary">
					Nhập chữ hoặc từ tiếng Trung để xem cách đọc, nghĩa tiếng Việt và cách ghép từng nét chữ.
				</p>
			</section>
			<section className="card-paper p-6">
				<label htmlFor="hanzi-ai-input" className="label-caps">Chữ hoặc từ cần tra (1–4 chữ Hán)</label>
				<div className="mt-3 flex flex-col gap-3 sm:flex-row">
					<input id="hanzi-ai-input" value={input} onChange={(e) => { setInput(e.target.value); setError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') void analyze(); }} placeholder="Ví dụ: 折磨" className="hanzi-lg min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-2xl focus:border-accent focus:outline-none" />
					<button type="button" onClick={() => void analyze()} disabled={!valid || loading} className="btn-primary px-8 disabled:opacity-50">{loading ? 'Đang xử lý…' : 'Xem phân tích'}</button>
				</div>
				{input && !valid && <p className="mt-2 text-sm text-accent">Chỉ nhập từ 1 đến 4 chữ Hán, không dấu cách hay dấu câu.</p>}
				{loading && (
					<p className="mt-4 text-center text-sm font-bold text-accent">
						{LOADING_COPY[loadingStep]}
						<span className="mt-1 block text-xs font-normal text-muted">Thường mất khoảng 5–10 giây.</span>
					</p>
				)}
				{error && <p className="mt-3 text-sm text-accent">{error}</p>}
			</section>

			{analysis && ['ready', 'needs_review'].includes(analysis.status) && analysis.analysis && (
				<>
					{analysis.status === 'needs_review' && (
						<p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground-secondary">
							Một số phần cấu tạo hoặc từ nguyên đang chờ kiểm tra — bạn vẫn có thể đọc phần nghĩa và cách nhận diện mặt chữ bên dưới.
						</p>
					)}
					<HanziAiResultPanel value={analysis} />
				</>
			)}
			{analysis && ['blocked'].includes(analysis.status) && (
				<p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">Bản phân tích này đang được kiểm tra và tạm thời chưa hiển thị.</p>
			)}
			{analysis?.status === 'empty' && (
				<p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">Chưa có phân tích cho từ này. Bấm Xem phân tích để bắt đầu.</p>
			)}
			{analysis?.status === 'failed' && (
				<p className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">Không tạo được phân tích. Vui lòng thử lại sau.</p>
			)}
			{curated && (
				<details className="rounded-xl border border-border p-4">
					<summary className="cursor-pointer text-sm font-bold">Xem thêm: dữ liệu từ điển trong hệ thống</summary>
					<div className="mt-5"><HanziLabPanel analysis={curated} /></div>
				</details>
			)}
		</div>
	);
}
