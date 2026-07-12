'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import SessionBriefingCard from '@/components/chinese/SessionBriefingCard';
import SessionSummaryCard from '@/components/chinese/SessionSummaryCard';
import { CN_HHT_PREFETCH_SIZE, HHT_MIN_ENROLLED } from '@/config/constants';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

type Phase = 'briefing' | 'loading' | 'gate' | 'review' | 'summary' | 'empty';

interface HhtBatch {
	questions: CnPracticeQuestionDTO[];
	totalEnrolled: number;
	activeSetCount: number;
	eligibleWordCount: number;
}

interface HhtStats {
	totalEnrolled: number;
	activeSetCount: number;
	eligibleWordCount: number;
}

async function fetchHhtStats(): Promise<HhtStats> {
	const res = await fetch('/api/hht/stats');
	const json = await res.json() as {
		ok: boolean;
		data?: { stats: HhtStats };
	};
	if (!json.ok || !json.data?.stats) throw new Error('Không tải được thống kê HHT Mode');
	return json.data.stats;
}

async function fetchHhtBatch(recentWordIds: string[]): Promise<HhtBatch> {
	const params = new URLSearchParams({ limit: String(CN_HHT_PREFETCH_SIZE) });
	if (recentWordIds.length) params.set('recentWordIds', recentWordIds.join(','));
	const res = await fetch(`/api/hht?${params}`);
	const json = await res.json() as {
		ok: boolean;
		data?: HhtBatch;
	};
	if (!json.ok || !json.data) throw new Error('Không tải được phiên HHT Mode');
	return json.data;
}

export default function HhtSessionClient() {
	const router = useRouter();
	const { enqueue, flushAndWait, sessionResult, isFlushing, resetSession } = useIncrementalSubmit({
		endpoint: '/api/hht/submit',
	});

	const [phase, setPhase] = useState<Phase>('briefing');
	const [hhtStats, setHhtStats] = useState<HhtStats | null>(null);
	const [totalEnrolled, setTotalEnrolled] = useState(0);
	const [activeSetCount, setActiveSetCount] = useState(0);
	const [eligibleWordCount, setEligibleWordCount] = useState(0);
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [reviewedCount, setReviewedCount] = useState(0);
	const [rendererKey, setRendererKey] = useState(0);
	const [isExiting, setIsExiting] = useState(false);
	const [summaryReason, setSummaryReason] = useState<'exit' | 'complete'>('complete');

	const recentWordIdsRef = useRef<string[]>([]);
	const prefetchingRef = useRef(false);
	const prefetchPromiseRef = useRef<Promise<boolean> | null>(null);
	const batchSizeRef = useRef(0);
	const reviewedCountRef = useRef(0);

	const showSummary = useCallback((reason: 'exit' | 'complete') => {
		setSummaryReason(reason);
		setPhase('summary');
	}, []);

	const appendQuestions = useCallback((newQuestions: CnPracticeQuestionDTO[]) => {
		if (!newQuestions.length) return false;
		setQuestions((prev) => {
			const merged = [...prev, ...newQuestions];
			batchSizeRef.current = merged.length;
			return merged;
		});
		return true;
	}, []);

	const prefetchMore = useCallback(async (): Promise<boolean> => {
		if (prefetchPromiseRef.current) return prefetchPromiseRef.current;

		prefetchPromiseRef.current = (async () => {
			if (prefetchingRef.current) return false;
			prefetchingRef.current = true;
			try {
				await flushAndWait();
				const data = await fetchHhtBatch(recentWordIdsRef.current);
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
		setPhase('loading');

		const data = await fetchHhtBatch([]);
		setTotalEnrolled(data.totalEnrolled);
		setActiveSetCount(data.activeSetCount);
		setEligibleWordCount(data.eligibleWordCount);

		if (data.totalEnrolled > 0 && data.totalEnrolled < HHT_MIN_ENROLLED) {
			setPhase('gate');
			return;
		}

		if (!data.questions.length) {
			setPhase('empty');
			return;
		}

		batchSizeRef.current = data.questions.length;
		setQuestions(data.questions);
		setRendererKey((k) => k + 1);
		setPhase('review');
	}, [resetSession]);

	const loadBriefing = useCallback(async () => {
		setPhase('briefing');
		setHhtStats(null);
		try {
			const stats = await fetchHhtStats();
			setHhtStats(stats);
			setTotalEnrolled(stats.totalEnrolled);
			setActiveSetCount(stats.activeSetCount);
			setEligibleWordCount(stats.eligibleWordCount);

			if (stats.totalEnrolled > 0 && stats.totalEnrolled < HHT_MIN_ENROLLED) {
				setPhase('gate');
			}
		} catch {
			setPhase('empty');
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			void loadBriefing();
		}, 0);
		return () => clearTimeout(timer);
	}, [loadBriefing]);

	const handleAnswer = useCallback((result: {
		wordId: string;
		questionType: CnPracticeQuestionDTO['type'];
		correct: boolean;
	}) => {
		enqueue(result);
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
			else router.push('/');
		} catch {
			setIsExiting(false);
		}
	}, [isExiting, flushAndWait, showSummary, router]);

	const gatePct = HHT_MIN_ENROLLED > 0
		? Math.min(100, Math.round((totalEnrolled / HHT_MIN_ENROLLED) * 100))
		: 0;

	if (phase === 'briefing') {
		if (!hhtStats) {
			return (
				<div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-muted">
					<MaterialIcon name="quiz" className="text-accent" size={40} filled />
					<p>Đang tải thống kê HHT Mode...</p>
				</div>
			);
		}

		return (
			<SessionBriefingCard
				title="HHT Mode"
				icon="quiz"
				theme="accent"
				heroValue={totalEnrolled}
				heroLabel="từ trong các bộ SRS"
				heroSub={`${activeSetCount} bộ từ đang ôn · chỉ câu trắc nghiệm`}
				stats={[
					{
						label: 'Bộ từ SRS',
						value: activeSetCount,
					},
					{
						label: 'Từ luyện được',
						value: eligibleWordCount,
						sub: 'có đủ dữ liệu MCQ',
					},
				]}
				insight="Luyện MCQ trên toàn bộ bộ từ SRS — trả lời đúng giảm tần suất gặp lại; sai giữ nguyên."
				primaryLabel="Bắt đầu HHT"
				onPrimary={() => { void loadInitial(); }}
				secondaryLinks={[
					{ href: '/sets', label: 'Quản lý bộ từ', icon: 'menu_book' },
					{ href: '/', label: 'Trang chủ', icon: 'home' },
				]}
			/>
		);
	}

	if (phase === 'loading') {
		return (
			<div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-3 px-4 text-muted">
				<MaterialIcon name="quiz" className="text-accent" size={40} filled />
				<p>Đang tải phiên HHT Mode...</p>
			</div>
		);
	}

	if (phase === 'gate') {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8">
				<div className="card-paper w-full p-8 text-center">
					<MaterialIcon name="quiz" className="mx-auto text-accent" size={48} filled />
					<h1 className="mt-4 text-xl font-extrabold text-foreground">HHT Mode</h1>
					<p className="mt-2 text-sm text-muted">
						Cần ít nhất <strong>{HHT_MIN_ENROLLED} từ SRS</strong> để bắt đầu.
					</p>
					<p className="mt-1 text-sm text-foreground-secondary">
						Bạn hiện có <strong>{totalEnrolled}</strong> / {HHT_MIN_ENROLLED} từ.
					</p>
					<div className="mx-auto mt-4 max-w-xs">
						<ProgressBar value={gatePct} className="h-2" />
					</div>
					<p className="mt-3 text-xs text-muted">
						Bật Ôn SRS trên thêm bộ từ để mở khóa HHT Mode.
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
		const noQuestions = !noEnrolled && eligibleWordCount === 0;
		return (
			<div className="mx-auto max-w-2xl px-4 py-8">
				<div className="card-paper w-full p-8 text-center">
					<MaterialIcon name="quiz" className="mx-auto text-accent" size={48} filled />
					<h1 className="mt-4 text-xl font-extrabold text-foreground">HHT Mode</h1>
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
								Có {totalEnrolled} từ SRS nhưng chưa tạo được câu MCQ.
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
				title={summaryReason === 'exit' ? 'Đã dừng HHT Mode' : 'Phiên HHT xong!'}
				subtitle={summaryReason === 'exit'
					? 'Kết quả đã được lưu.'
					: `Đã luyện ${reviewedCount} câu MCQ`}
				onPrimaryAction={() => { void loadBriefing(); }}
				primaryLabel="Luyện tiếp"
				secondaryLinks={[
					{ href: '/sets', label: 'Quản lý bộ từ', icon: 'menu_book' },
					{ href: '/', label: 'Trang chủ', icon: 'home' },
				]}
			/>
		);
	}

	return (
		<div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-6 md:py-8">
			<div className="mb-3 flex w-full items-center justify-between gap-2">
				<span className="text-xs font-bold text-muted">
					HHT Mode · {activeSetCount} bộ · chỉ MCQ
				</span>
			</div>

			{questions.length > 0 && (
				<QuestionRenderer
					key={rendererKey}
					questions={questions}
					onAnswer={handleAnswer}
					onComplete={() => { void handleComplete(); }}
					onExit={() => { void handleExit(); }}
					incremental
					isExiting={isExiting || isFlushing}
					exitLabel="Dừng"
					sessionProgress={{
						reviewed: reviewedCount,
						dueRemaining: totalEnrolled,
					}}
				/>
			)}
		</div>
	);
}
