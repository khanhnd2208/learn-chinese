'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import SessionSummaryCard from '@/components/chinese/SessionSummaryCard';
import SrsVocabManager from '@/components/chinese/SrsVocabManager';
import { CN_REVIEW_PREFETCH_SIZE } from '@/config/constants';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

type Phase = 'loading' | 'review' | 'summary' | 'empty';

async function fetchReviewBatch(excludeIds: string[]): Promise<{
	dueToday: number;
	questions: CnPracticeQuestionDTO[];
}> {
	const params = new URLSearchParams({ limit: String(CN_REVIEW_PREFETCH_SIZE) });
	if (excludeIds.length) params.set('excludeIds', excludeIds.join(','));
	const res = await fetch(`/api/review?${params}`);
	const json = await res.json() as {
		ok: boolean;
		data?: { dueToday: number; questions: CnPracticeQuestionDTO[] };
	};
	if (!json.ok || !json.data) throw new Error('Không tải được phiên ôn');
	return json.data;
}

export default function ReviewSessionClient() {
	const router = useRouter();
	const { enqueue, flushAndWait, sessionResult, isFlushing, resetSession } = useIncrementalSubmit({
		endpoint: '/api/review/submit',
	});

	const [phase, setPhase] = useState<Phase>('loading');
	const [dueToday, setDueToday] = useState(0);
	const [dueRemaining, setDueRemaining] = useState(0);
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [reviewedCount, setReviewedCount] = useState(0);
	const [rendererKey, setRendererKey] = useState(0);
	const [isExiting, setIsExiting] = useState(false);
	const [isFetchingMore, setIsFetchingMore] = useState(false);
	const [summaryReason, setSummaryReason] = useState<'exit' | 'complete'>('complete');
	const [showManager, setShowManager] = useState(false);

	const seenIdsRef = useRef<Set<string>>(new Set());
	const prefetchingRef = useRef(false);
	const batchSizeRef = useRef(0);
	const reviewedCountRef = useRef(0);

	const loadInitial = useCallback(async () => {
		seenIdsRef.current = new Set();
		setReviewedCount(0);
		reviewedCountRef.current = 0;
		batchSizeRef.current = 0;
		resetSession();
		setSummaryReason('complete');
		setIsExiting(false);

		const data = await fetchReviewBatch([]);
		setDueToday(data.dueToday);
		setDueRemaining(data.dueToday);

		if (!data.questions.length) {
			setPhase('empty');
			return;
		}

		for (const q of data.questions) seenIdsRef.current.add(q.id);
		batchSizeRef.current = data.questions.length;
		setQuestions(data.questions);
		setRendererKey((k) => k + 1);
		setPhase('review');
	}, [resetSession]);

	// Mount: load review batch (setState after await inside loadInitial)
	useEffect(() => {
		let cancelled = false;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
		void loadInitial().catch(() => {
			if (!cancelled) setPhase('empty');
		});
		return () => { cancelled = true; };
	}, [loadInitial]);

	const showSummary = useCallback((reason: 'exit' | 'complete') => {
		setSummaryReason(reason);
		setPhase('summary');
	}, []);

	const appendQuestions = useCallback((newQuestions: CnPracticeQuestionDTO[], dueCount: number) => {
		if (!newQuestions.length) return false;
		for (const q of newQuestions) seenIdsRef.current.add(q.id);
		setQuestions((prev) => {
			const merged = [...prev, ...newQuestions];
			batchSizeRef.current = merged.length;
			return merged;
		});
		setDueRemaining(dueCount);
		return true;
	}, []);

	const prefetchMore = useCallback(async () => {
		if (prefetchingRef.current) return;
		prefetchingRef.current = true;
		setIsFetchingMore(true);
		try {
			await flushAndWait();
			const data = await fetchReviewBatch([...seenIdsRef.current]);
			appendQuestions(data.questions, data.dueToday);
		} finally {
			prefetchingRef.current = false;
			setIsFetchingMore(false);
		}
	}, [flushAndWait, appendQuestions]);

	const handleAnswer = useCallback((result: { wordId: string; questionType: CnPracticeQuestionDTO['type']; correct: boolean }) => {
		enqueue(result);
		reviewedCountRef.current += 1;
		const next = reviewedCountRef.current;
		setReviewedCount(next);
		setDueRemaining((d) => Math.max(0, d - 1));
		if (next >= batchSizeRef.current - 2) {
			void prefetchMore();
		}
	}, [enqueue, prefetchMore]);

	const handleComplete = useCallback(async () => {
		await flushAndWait();
		try {
			const data = await fetchReviewBatch([...seenIdsRef.current]);
			setDueRemaining(data.dueToday);
			if (data.questions.length) {
				for (const q of data.questions) seenIdsRef.current.add(q.id);
				batchSizeRef.current = data.questions.length;
				setQuestions(data.questions);
				setRendererKey((k) => k + 1);
				return;
			}
		} catch {
			// fall through
		}
		showSummary('complete');
	}, [flushAndWait, showSummary]);

	const handleExit = useCallback(async () => {
		if (isExiting) return;
		setIsExiting(true);
		try {
			await flushAndWait();
			if (reviewedCountRef.current > 0) showSummary('exit');
			else router.push('/review/stats');
		} catch {
			setIsExiting(false);
		}
	}, [isExiting, flushAndWait, showSummary, router]);

	const managerButton = (
		<button
			type="button"
			onClick={() => setShowManager(true)}
			className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/20"
		>
			<MaterialIcon name="playlist_add_check" size={16} />
			Quản lí từ vựng SRS
		</button>
	);

	const managerIconButton = (
		<button
			type="button"
			onClick={() => setShowManager(true)}
			title="Quản lí từ vựng SRS"
			className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-accent"
		>
			<MaterialIcon name="playlist_add_check" size={18} />
		</button>
	);

	const managerModal = (
		<SrsVocabManager
			open={showManager}
			onClose={() => setShowManager(false)}
			onUpdated={() => {
				void loadInitial();
			}}
		/>
	);

	if (phase === 'loading') {
		return (
			<>
				<div className="mx-auto max-w-2xl px-4 pt-6">
					<div className="flex justify-end">{managerButton}</div>
				</div>
				<div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4 text-muted">
					Đang tải phiên ôn...
				</div>
				{managerModal}
			</>
		);
	}

	if (phase === 'empty') {
		return (
			<>
				<div className="mx-auto max-w-2xl px-4 py-8">
					<div className="mb-4 flex justify-end">{managerButton}</div>
					<div className="card-paper w-full p-8 text-center">
					<MaterialIcon name="celebration" className="mx-auto text-success" size={48} />
					<p className="mt-4 text-muted">Không có mục cần ôn hôm nay.</p>
					<p className="mt-2 text-sm text-foreground-secondary">
						Bật <strong>Ôn SRS</strong> trên bộ từ trong{' '}
						<Link href="/sets" className="font-bold text-accent hover:underline">Danh sách bộ từ</Link>{' '}
						để đưa từ vào hàng đợi ôn.
					</p>
					<div className="mt-6 flex flex-wrap justify-center gap-3">
						<Link href="/review/stats" className="btn-primary">
							<MaterialIcon name="query_stats" size={16} />
							Xem tiến độ
						</Link>
						<Link href="/sets" className="btn-secondary">
							<MaterialIcon name="menu_book" size={16} />
							Chọn bộ từ
						</Link>
					</div>
					</div>
				</div>
				{managerModal}
			</>
		);
	}

	if (phase === 'summary') {
		return (
			<>
				<div className="mx-auto max-w-2xl px-4 pt-6">
					<div className="flex justify-end">{managerButton}</div>
				</div>
				<SessionSummaryCard
				summary={sessionResult}
				dueRemaining={dueRemaining}
				title={summaryReason === 'exit' ? 'Đã dừng & lưu' : 'Ôn xong!'}
				subtitle={summaryReason === 'exit'
					? 'Tiến độ đã được lưu — quay lại bất cứ lúc nào.'
					: undefined}
				onPrimaryAction={() => {
					setPhase('loading');
					void loadInitial();
				}}
				primaryLabel="Ôn tiếp"
				/>
				{managerModal}
			</>
		);
	}

	return (
		<>
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-6 md:py-8">
				{questions.length > 0 && (
					<QuestionRenderer
						key={rendererKey}
						questions={questions}
						onAnswer={handleAnswer}
						onComplete={() => { void handleComplete(); }}
						onExit={() => { void handleExit(); }}
						incremental
						isExiting={isExiting || isFlushing}
						headerAction={managerIconButton}
						sessionProgress={{
							reviewed: reviewedCount,
							dueRemaining,
						}}
					/>
				)}
			</div>
			{managerModal}
		</>
	);
}
