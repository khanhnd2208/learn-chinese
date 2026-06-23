'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import SessionSummaryCard from '@/components/chinese/SessionSummaryCard';
import SrsVocabManager from '@/components/chinese/SrsVocabManager';
import { CN_REVIEW_PREFETCH_SIZE } from '@/config/constants';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

type Phase = 'goal' | 'loading' | 'review' | 'summary' | 'empty';
type SessionGoal = 10 | 20 | null;

function wordChannelKey(wordId: string, questionType: CnPracticeQuestionDTO['type']): string {
	return `${wordId}:${questionChannel(questionType)}`;
}

async function fetchReviewBatch(
	excludeIds: string[],
	excludeWordChannels: string[],
): Promise<{
	dueToday: number;
	questions: CnPracticeQuestionDTO[];
	skippedUnpublished: number;
}> {
	const params = new URLSearchParams({ limit: String(CN_REVIEW_PREFETCH_SIZE) });
	if (excludeIds.length) params.set('excludeIds', excludeIds.join(','));
	if (excludeWordChannels.length) params.set('excludeWordChannels', excludeWordChannels.join(','));
	const res = await fetch(`/api/review?${params}`);
	const json = await res.json() as {
		ok: boolean;
		data?: {
			dueToday: number;
			questions: CnPracticeQuestionDTO[];
			skippedUnpublished?: number;
		};
	};
	if (!json.ok || !json.data) throw new Error('Không tải được phiên ôn');
	return {
		dueToday: json.data.dueToday,
		questions: json.data.questions,
		skippedUnpublished: json.data.skippedUnpublished ?? 0,
	};
}

export default function ReviewSessionClient() {
	const router = useRouter();
	const { enqueue, flushAndWait, sessionResult, isFlushing, resetSession } = useIncrementalSubmit({
		endpoint: '/api/review/submit',
	});

	const [phase, setPhase] = useState<Phase>('goal');
	const [sessionGoal, setSessionGoal] = useState<SessionGoal>(null);
	const [dueToday, setDueToday] = useState(0);
	const [dueRemaining, setDueRemaining] = useState(0);
	const [skippedUnpublished, setSkippedUnpublished] = useState(0);
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [reviewedCount, setReviewedCount] = useState(0);
	const [rendererKey, setRendererKey] = useState(0);
	const [isExiting, setIsExiting] = useState(false);
	const [, setIsFetchingMore] = useState(false);
	const [summaryReason, setSummaryReason] = useState<'exit' | 'complete'>('complete');
	const [showManager, setShowManager] = useState(false);

	const seenIdsRef = useRef<Set<string>>(new Set());
	const seenWordChannelsRef = useRef<Set<string>>(new Set());
	const prefetchingRef = useRef(false);
	const batchSizeRef = useRef(0);
	const reviewedCountRef = useRef(0);
	const sessionGoalRef = useRef<SessionGoal>(null);
	const goalReachedRef = useRef(false);

	const trackQuestions = useCallback((batch: CnPracticeQuestionDTO[]) => {
		for (const q of batch) {
			seenIdsRef.current.add(q.id);
			seenWordChannelsRef.current.add(wordChannelKey(q.wordId, q.type));
		}
	}, []);

	const loadInitial = useCallback(async () => {
		seenIdsRef.current = new Set();
		seenWordChannelsRef.current = new Set();
		goalReachedRef.current = false;
		setReviewedCount(0);
		reviewedCountRef.current = 0;
		batchSizeRef.current = 0;
		resetSession();
		setSummaryReason('complete');
		setIsExiting(false);
		setPhase('loading');

		const data = await fetchReviewBatch([], []);
		setDueToday(data.dueToday);
		setDueRemaining(data.dueToday);
		setSkippedUnpublished(data.skippedUnpublished);

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

	// Mount: stay on goal picker until user chooses session length
	useEffect(() => {
		sessionGoalRef.current = sessionGoal;
	}, [sessionGoal]);

	const startSession = useCallback((goal: SessionGoal) => {
		setSessionGoal(goal);
		sessionGoalRef.current = goal;
		void loadInitial().catch(() => setPhase('empty'));
	}, [loadInitial]);

	const showSummary = useCallback((reason: 'exit' | 'complete') => {
		setSummaryReason(reason);
		setPhase('summary');
	}, []);

	const completeSessionIfGoalReached = useCallback(async () => {
		const goal = sessionGoalRef.current;
		if (goal === null || reviewedCountRef.current < goal || goalReachedRef.current) return false;
		goalReachedRef.current = true;
		await flushAndWait();
		showSummary('complete');
		return true;
	}, [flushAndWait, showSummary]);

	const appendQuestions = useCallback((newQuestions: CnPracticeQuestionDTO[], dueCount: number) => {
		if (!newQuestions.length) return false;
		trackQuestions(newQuestions);
		setQuestions((prev) => {
			const merged = [...prev, ...newQuestions];
			batchSizeRef.current = merged.length;
			return merged;
		});
		setDueRemaining(dueCount);
		return true;
	}, [trackQuestions]);

	const prefetchMore = useCallback(async () => {
		if (prefetchingRef.current || goalReachedRef.current) return;
		const goal = sessionGoalRef.current;
		if (goal !== null && reviewedCountRef.current >= goal) return;
		prefetchingRef.current = true;
		setIsFetchingMore(true);
		try {
			await flushAndWait();
			const data = await fetchReviewBatch(
				[...seenIdsRef.current],
				[...seenWordChannelsRef.current],
			);
			appendQuestions(data.questions, data.dueToday);
		} finally {
			prefetchingRef.current = false;
			setIsFetchingMore(false);
		}
	}, [flushAndWait, appendQuestions]);

	const handleAnswer = useCallback((result: { wordId: string; questionType: CnPracticeQuestionDTO['type']; correct: boolean }) => {
		enqueue(result);
		seenWordChannelsRef.current.add(wordChannelKey(result.wordId, result.questionType));
		reviewedCountRef.current += 1;
		const next = reviewedCountRef.current;
		setReviewedCount(next);
		setDueRemaining((d) => Math.max(0, d - 1));
		const goal = sessionGoalRef.current;
		if (goal !== null && next >= goal) {
			void completeSessionIfGoalReached();
			return;
		}
		if (next >= batchSizeRef.current - 2) {
			void prefetchMore();
		}
	}, [enqueue, prefetchMore, completeSessionIfGoalReached]);

	const handleComplete = useCallback(async () => {
		if (await completeSessionIfGoalReached()) return;
		await flushAndWait();
		try {
			const data = await fetchReviewBatch(
				[...seenIdsRef.current],
				[...seenWordChannelsRef.current],
			);
			setDueRemaining(data.dueToday);
			if (data.questions.length) {
				trackQuestions(data.questions);
				batchSizeRef.current = data.questions.length;
				setQuestions(data.questions);
				setRendererKey((k) => k + 1);
				return;
			}
		} catch {
			// fall through
		}
		showSummary('complete');
	}, [flushAndWait, showSummary, completeSessionIfGoalReached, trackQuestions]);

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

	if (phase === 'goal') {
		return (
			<>
				<div className="mx-auto max-w-2xl px-4 py-8">
					<div className="mb-4 flex justify-end">{managerButton}</div>
					<div className="card-paper w-full p-8 text-center">
						<MaterialIcon name="school" className="mx-auto text-accent" size={48} />
						<h1 className="mt-4 text-xl font-extrabold text-foreground">Bắt đầu ôn SRS</h1>
						<p className="mt-2 text-sm text-foreground-secondary">
							Chọn số câu bạn muốn ôn trong phiên này.
						</p>
						<div className="mt-6 flex flex-wrap justify-center gap-3">
							{([10, 20] as const).map((goal) => (
								<button
									key={goal}
									type="button"
									onClick={() => startSession(goal)}
									className="btn-primary min-w-[88px]"
								>
									{goal} câu
								</button>
							))}
							<button
								type="button"
								onClick={() => startSession(null)}
								className="btn-secondary"
							>
								Ôn hết
							</button>
						</div>
					</div>
				</div>
				{managerModal}
			</>
		);
	}

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
		const hasDueButNoQuestions = dueToday > 0;
		return (
			<>
				<div className="mx-auto max-w-2xl px-4 py-8">
					<div className="mb-4 flex justify-end">{managerButton}</div>
					<div className="card-paper w-full p-8 text-center">
					<MaterialIcon
						name={hasDueButNoQuestions ? 'error_outline' : 'celebration'}
						className={`mx-auto ${hasDueButNoQuestions ? 'text-warning' : 'text-success'}`}
						size={48}
					/>
					{hasDueButNoQuestions ? (
						<>
							<p className="mt-4 text-muted">
								Có {dueToday} mục đến hạn nhưng không tải được câu hỏi.
							</p>
							<p className="mt-2 text-sm text-foreground-secondary">
								{skippedUnpublished > 0
									? `${skippedUnpublished} từ chưa được xuất bản trong hệ thống. `
									: ''}
								Thử tải lại sau hoặc kiểm tra bộ từ trong{' '}
								<Link href="/sets" className="font-bold text-accent hover:underline">Danh sách bộ từ</Link>.
							</p>
							<div className="mt-6 flex flex-wrap justify-center gap-3">
								<button type="button" onClick={() => { setPhase('loading'); void loadInitial(); }} className="btn-primary">
									<MaterialIcon name="refresh" size={16} />
									Thử lại
								</button>
							</div>
						</>
					) : (
						<>
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
						</>
					)}
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
					setSessionGoal(null);
					sessionGoalRef.current = null;
					setPhase('goal');
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
