'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import SessionBriefingCard from '@/components/chinese/SessionBriefingCard';
import SessionSummaryCard from '@/components/chinese/SessionSummaryCard';
import {
	CN_INFERNO_PREFETCH_SIZE,
	INFERNO_FILL_CORRECT,
	INFERNO_MCQ_CORRECT,
	INFERNO_MIN_ENROLLED,
	INFERNO_WRONG_FLAT,
	INFERNO_WRONG_PCT,
} from '@/config/constants';
import { isTypedQuestion } from '@/lib/chinese/questionLabels';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnInfernoStatsDTO, CnPracticeQuestionDTO, CnPracticeSubmitItem } from '@/types/chinese';

type Phase = 'briefing' | 'loading' | 'gate' | 'review' | 'summary' | 'empty';

interface InfernoBatch {
	questions: CnPracticeQuestionDTO[];
	totalEnrolled: number;
	masteredCount: number;
	masteryByWordId: Record<string, number>;
	eligiblePairs: number;
}

function infernoDelta(
	questionType: CnPracticeQuestionDTO['type'],
	correct: boolean,
	currentScore: number,
): number {
	if (!correct) return -(INFERNO_WRONG_FLAT + Math.round(currentScore * INFERNO_WRONG_PCT));
	return isTypedQuestion(questionType) ? INFERNO_FILL_CORRECT : INFERNO_MCQ_CORRECT;
}

async function fetchInfernoBatch(recentWordIds: string[]): Promise<InfernoBatch> {
	const params = new URLSearchParams({ limit: String(CN_INFERNO_PREFETCH_SIZE) });
	if (recentWordIds.length) params.set('recentWordIds', recentWordIds.join(','));
	const res = await fetch(`/api/inferno?${params}`);
	const json = await res.json() as {
		ok: boolean;
		data?: InfernoBatch;
	};
	if (!json.ok || !json.data) throw new Error('Không tải được phiên Địa Ngục');
	return json.data;
}

async function fetchInfernoStats(): Promise<CnInfernoStatsDTO> {
	const res = await fetch('/api/inferno/stats');
	const json = await res.json() as { ok: boolean; data?: { stats: CnInfernoStatsDTO } };
	if (!json.ok || !json.data) throw new Error('Không tải được thống kê Địa Ngục');
	return json.data.stats;
}

export default function InfernoSessionClient() {
	const router = useRouter();
	const { enqueue, flushAndWait, sessionResult, isFlushing, resetSession } = useIncrementalSubmit({
		endpoint: '/api/inferno/submit',
	});

	const [phase, setPhase] = useState<Phase>('briefing');
	const [infernoStats, setInfernoStats] = useState<CnInfernoStatsDTO | null>(null);
	const [totalEnrolled, setTotalEnrolled] = useState(0);
	const [masteryByWordId, setMasteryByWordId] = useState<Record<string, number>>({});
	const [eligiblePairs, setEligiblePairs] = useState(0);
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [reviewedCount, setReviewedCount] = useState(0);
	const [rendererKey, setRendererKey] = useState(0);
	const [isExiting, setIsExiting] = useState(false);
	const [summaryReason, setSummaryReason] = useState<'exit' | 'complete'>('complete');
	const [lastDelta, setLastDelta] = useState<number | null>(null);
	const [currentWordId, setCurrentWordId] = useState<string | null>(null);

	const recentWordIdsRef = useRef<string[]>([]);
	const prefetchingRef = useRef(false);
	const prefetchPromiseRef = useRef<Promise<boolean> | null>(null);
	const batchSizeRef = useRef(0);
	const reviewedCountRef = useRef(0);
	const masteryRef = useRef<Record<string, number>>({});

	const showSummary = useCallback((reason: 'exit' | 'complete') => {
		setSummaryReason(reason);
		setPhase('summary');
	}, []);

	const trackQuestions = useCallback((batch: CnPracticeQuestionDTO[]) => {
		if (batch.length > 0) {
			setCurrentWordId(batch[0].wordId);
		}
	}, []);

	const appendQuestions = useCallback((newQuestions: CnPracticeQuestionDTO[]) => {
		if (!newQuestions.length) return false;
		trackQuestions(newQuestions);
		setQuestions((prev) => {
			const merged = [...prev, ...newQuestions];
			batchSizeRef.current = merged.length;
			return merged;
		});
		return true;
	}, [trackQuestions]);

	const prefetchMore = useCallback(async (): Promise<boolean> => {
		if (prefetchPromiseRef.current) return prefetchPromiseRef.current;

		prefetchPromiseRef.current = (async () => {
			if (prefetchingRef.current) return false;
			prefetchingRef.current = true;
			try {
				await flushAndWait();
				const data = await fetchInfernoBatch(recentWordIdsRef.current);
				setMasteryByWordId((prev) => {
					const merged = { ...prev, ...data.masteryByWordId };
					masteryRef.current = merged;
					return merged;
				});
				if (!data.questions.length) {
					showSummary('complete');
					return false;
				}
				return appendQuestions(data.questions);
			} finally {
				prefetchingRef.current = false;
			}
		})();

		try {
			return await prefetchPromiseRef.current;
		} finally {
			prefetchPromiseRef.current = null;
		}
	}, [flushAndWait, appendQuestions, showSummary]);

	const loadInitial = useCallback(async () => {
		recentWordIdsRef.current = [];
		setReviewedCount(0);
		reviewedCountRef.current = 0;
		batchSizeRef.current = 0;
		resetSession();
		setSummaryReason('complete');
		setIsExiting(false);
		setLastDelta(null);
		setPhase('loading');

		const data = await fetchInfernoBatch([]);
		setTotalEnrolled(data.totalEnrolled);
		setEligiblePairs(data.eligiblePairs);
		masteryRef.current = { ...data.masteryByWordId };
		setMasteryByWordId(data.masteryByWordId);

		if (data.totalEnrolled > 0 && data.totalEnrolled < INFERNO_MIN_ENROLLED) {
			setPhase('gate');
			return;
		}

		if (!data.questions.length) {
			setPhase('empty');
			return;
		}

		trackQuestions(data.questions);
		batchSizeRef.current = data.questions.length;
		setQuestions(data.questions);
		setRendererKey((k) => k + 1);
		setPhase('review');
	}, [resetSession, trackQuestions]);

	const loadBriefing = useCallback(async () => {
		setPhase('briefing');
		const stats = await fetchInfernoStats();
		setInfernoStats(stats);
		setTotalEnrolled(stats.totalEnrolled);

		if (stats.totalEnrolled > 0 && stats.totalEnrolled < INFERNO_MIN_ENROLLED) {
			setPhase('gate');
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			void loadBriefing().catch(() => setPhase('empty'));
		}, 0);
		return () => clearTimeout(timer);
	}, [loadBriefing]);

	const handleAnswer = useCallback((result: CnPracticeSubmitItem) => {
		enqueue(result);
		const prevScore = masteryRef.current[result.wordId] ?? 0;
		const delta = infernoDelta(result.questionType, result.correct, prevScore);
		const newScore = Math.max(0, prevScore + delta);
		masteryRef.current = { ...masteryRef.current, [result.wordId]: newScore };
		setMasteryByWordId({ ...masteryRef.current });
		setLastDelta(delta);
		setTimeout(() => setLastDelta(null), 1200);
		setCurrentWordId(result.wordId);
		recentWordIdsRef.current = [...recentWordIdsRef.current, result.wordId].slice(-20);

		reviewedCountRef.current += 1;
		setReviewedCount(reviewedCountRef.current);

		if (reviewedCountRef.current >= batchSizeRef.current - 2) {
			void prefetchMore();
		}
	}, [enqueue, prefetchMore]);

	const handleComplete = useCallback(async () => {
		await prefetchMore();
	}, [prefetchMore]);

	const handleExit = useCallback(async () => {
		if (isExiting) return;
		setIsExiting(true);
		try {
			await flushAndWait();
			if (reviewedCountRef.current > 0) showSummary('exit');
			else router.push('/dashboard?tab=inferno');
		} catch {
			setIsExiting(false);
		}
	}, [isExiting, flushAndWait, showSummary, router]);

	const currentMastery = currentWordId ? (masteryByWordId[currentWordId] ?? 0) : 0;
	const gatePct = INFERNO_MIN_ENROLLED > 0
		? Math.min(100, Math.round((totalEnrolled / INFERNO_MIN_ENROLLED) * 100))
		: 0;

	const statsLink = (
		<Link
			href="/dashboard?tab=inferno"
			className="inline-flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning transition-colors hover:bg-warning/20"
		>
			<MaterialIcon name="query_stats" size={14} />
			Thống kê
		</Link>
	);

	if (phase === 'briefing') {
		if (!infernoStats) {
			return (
				<div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-muted">
					<MaterialIcon name="local_fire_department" className="text-warning" size={40} filled />
					<p>Đang tải báo cáo Địa Ngục...</p>
				</div>
			);
		}

		const masteredPct = infernoStats.totalEnrolled > 0
			? Math.round((infernoStats.masteredCount / infernoStats.totalEnrolled) * 100)
			: 0;
		const stuckCount = infernoStats.stuckAtZero.length;

		return (
			<SessionBriefingCard
				title="Địa Ngục"
				icon="local_fire_department"
				theme="warning"
				heroValue={infernoStats.totalEnrolled}
				heroLabel="từ SRS trong chế độ thử thách"
				heroSub={`${infernoStats.masteredCount} từ đã chinh phục (≥300 điểm)`}
				stats={[
					{
						label: 'Điểm TB',
						value: infernoStats.avgMasteryScore,
					},
					{
						label: 'Tỷ lệ đúng',
						value: infernoStats.totalAnswered > 0 ? `${infernoStats.overallAccuracy}%` : '—',
					},
					...(stuckCount > 0 ? [{
						label: 'Kẹt ở 0',
						value: stuckCount,
						sub: 'Cần chinh phục',
						highlight: true,
					}] : []),
					{
						label: 'Tiến độ',
						value: `${masteredPct}%`,
						sub: 'từ đạt mastery',
					},
				]}
				insight={infernoStats.insights[0] ?? 'Chế độ khó — MCQ +30, điền +70, sai trừ điểm mạnh.'}
				primaryLabel="Vào Địa Ngục"
				onPrimary={() => { void loadInitial(); }}
				secondaryLinks={[
					{ href: '/dashboard?tab=inferno', label: 'Báo cáo học tập', icon: 'query_stats' },
					{ href: '/', label: 'Trang chủ', icon: 'home' },
				]}
				extra={(
					<div className="mx-auto max-w-xs">
						<ProgressBar value={masteredPct} className="h-2" />
						<p className="mt-1 text-center text-xs text-muted">
							{infernoStats.masteredCount} / {infernoStats.totalEnrolled} từ chinh phục
						</p>
					</div>
				)}
			/>
		);
	}

	if (phase === 'loading') {
		return (
			<div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-muted">
				<MaterialIcon name="local_fire_department" className="text-warning" size={40} filled />
				<p>Đang mở cổng Địa Ngục...</p>
			</div>
		);
	}

	if (phase === 'gate') {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8">
				<div className="card-paper w-full p-8 text-center">
					<MaterialIcon name="local_fire_department" className="mx-auto text-warning" size={48} filled />
					<h1 className="mt-4 text-xl font-extrabold text-foreground">Địa Ngục</h1>
					<p className="mt-2 text-sm text-muted">
						Cần ít nhất <strong>{INFERNO_MIN_ENROLLED} từ SRS</strong> để vào chế độ này.
					</p>
					<p className="mt-1 text-sm text-foreground-secondary">
						Bạn hiện có <strong>{totalEnrolled}</strong> / {INFERNO_MIN_ENROLLED} từ.
					</p>
					<div className="mx-auto mt-4 max-w-xs">
						<ProgressBar value={gatePct} className="h-2" />
					</div>
					<p className="mt-3 text-xs text-muted">
						Bật Ôn SRS trên thêm bộ từ để mở khóa Địa Ngục.
					</p>
					<Link href="/sets" className="btn-primary mt-6 inline-flex">
						<MaterialIcon name="menu_book" size={16} />
						Quản lý bộ từ
					</Link>
				</div>
			</div>
		);
	}

	if (phase === 'empty') {
		const noEnrolled = totalEnrolled === 0;
		const noQuestions = !noEnrolled && eligiblePairs === 0;
		return (
			<div className="mx-auto max-w-2xl px-4 py-8">
				<div className="card-paper w-full p-8 text-center">
					<MaterialIcon name="local_fire_department" className="mx-auto text-warning" size={48} filled />
					<h1 className="mt-4 text-xl font-extrabold text-foreground">Địa Ngục</h1>
					{noEnrolled ? (
						<>
							<p className="mt-2 text-sm text-muted">Chưa có từ nào trong SRS.</p>
							<p className="mt-1 text-sm text-foreground-secondary">
								Bật <strong>Ôn SRS</strong> trên bộ từ để bắt đầu.
							</p>
							<Link href="/sets" className="btn-primary mt-6 inline-flex">
								<MaterialIcon name="menu_book" size={16} />
								Chọn bộ từ
							</Link>
						</>
					) : noQuestions ? (
						<>
							<p className="mt-2 text-sm text-muted">
								Có {totalEnrolled} từ SRS nhưng chưa tạo được câu hỏi.
							</p>
							<p className="mt-1 text-sm text-foreground-secondary">
								Kiểm tra từ đã xuất bản và có đủ nghĩa / pinyin / ví dụ câu.
							</p>
							<Link href="/sets" className="btn-secondary mt-6 inline-flex">
								<MaterialIcon name="menu_book" size={16} />
								Kiểm tra bộ từ
							</Link>
						</>
					) : (
						<>
							<p className="mt-2 text-sm text-muted">Không tải được câu hỏi.</p>
							<button type="button" onClick={() => { void loadInitial(); }} className="btn-primary mt-6">
								Thử lại
							</button>
						</>
					)}
				</div>
			</div>
		);
	}

	if (phase === 'summary') {
		return (
			<SessionSummaryCard
				summary={sessionResult}
				dueRemaining={totalEnrolled}
				title={summaryReason === 'exit' ? 'Đã rút lui khỏi Địa Ngục' : 'Phiên Địa Ngục xong!'}
				subtitle={summaryReason === 'exit'
					? 'Điểm đã được lưu.'
					: `Đã luyện ${reviewedCount} câu`}
				onPrimaryAction={() => { void loadBriefing(); }}
				primaryLabel="Luyện tiếp"
				secondaryLinks={[
					{ href: '/dashboard?tab=inferno', label: 'Báo cáo học tập', icon: 'query_stats' },
					{ href: '/', label: 'Trang chủ', icon: 'home' },
				]}
			/>
		);
	}

	return (
		<div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-6 md:py-8">
			{lastDelta !== null && (
				<div
					className={`pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2 animate-fade-slide-up text-4xl font-black tabular-nums ${
						lastDelta > 0 ? 'text-success' : 'text-error'
					}`}
				>
					{lastDelta > 0 ? `+${lastDelta}` : lastDelta}
				</div>
			)}

			<div className="mb-3 flex w-full items-center justify-end gap-2">
				{statsLink}
			</div>

			{currentWordId && (
				<div className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm">
					<span className="text-muted">Điểm từ hiện tại: </span>
					<span className="font-black tabular-nums text-warning">
						{currentMastery}
					</span>
				</div>
			)}

			{questions.length > 0 && (
				<QuestionRenderer
					key={rendererKey}
					questions={questions}
					onAnswer={handleAnswer}
					onComplete={() => { void handleComplete(); }}
					onExit={() => { void handleExit(); }}
					incremental
					isExiting={isExiting || isFlushing}
					exitLabel="Rút lui"
					sessionProgress={{
						reviewed: reviewedCount,
						dueRemaining: totalEnrolled,
					}}
				/>
			)}
		</div>
	);
}
