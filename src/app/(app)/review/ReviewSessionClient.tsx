'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import SessionBriefingCard from '@/components/chinese/SessionBriefingCard';
import SessionSummaryCard from '@/components/chinese/SessionSummaryCard';
import SrsVocabManager from '@/components/chinese/SrsVocabManager';
import { CN_REVIEW_PREFETCH_SIZE } from '@/config/constants';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO, CnPracticeSubmitItem, CnReviewBriefingDTO } from '@/types/chinese';

type Phase = 'briefing' | 'loading' | 'review' | 'summary' | 'empty';

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

async function fetchReviewBriefing(): Promise<CnReviewBriefingDTO> {
	const res = await fetch('/api/review/briefing');
	const json = await res.json() as { ok: boolean; data?: { briefing: CnReviewBriefingDTO } };
	if (!json.ok || !json.data) throw new Error('Không tải được báo cáo SRS');
	return json.data.briefing;
}

function pressureLabel(pressure: CnReviewBriefingDTO['pressure']): string | undefined {
	if (pressure === 'none') return undefined;
	if (pressure === 'mild') return 'Nhẹ';
	if (pressure === 'moderate') return 'Trung bình';
	return 'Cao';
}

export default function ReviewSessionClient() {
	const router = useRouter();
	const { enqueue, flushAndWait, sessionResult, isFlushing, resetSession } = useIncrementalSubmit({
		endpoint: '/api/review/submit',
	});

	const [phase, setPhase] = useState<Phase>('briefing');
	const [briefing, setBriefing] = useState<CnReviewBriefingDTO | null>(null);
	const [suggestLearn, setSuggestLearn] = useState(false);
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

	const trackQuestions = useCallback((batch: CnPracticeQuestionDTO[]) => {
		for (const q of batch) {
			seenIdsRef.current.add(q.id);
			seenWordChannelsRef.current.add(wordChannelKey(q.wordId, q.type));
		}
	}, []);

	const loadInitial = useCallback(async () => {
		seenIdsRef.current = new Set();
		seenWordChannelsRef.current = new Set();
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

	const loadBriefing = useCallback(async () => {
		setPhase('briefing');
		const data = await fetchReviewBriefing();
		setBriefing(data);
		setDueToday(data.dueChannels);
		if (data.dueChannels > 0) {
			setSuggestLearn(false);
			return;
		}
		try {
			const res = await fetch('/api/learn');
			const json = await res.json() as {
				ok: boolean;
				data?: { totalUnintroduced: number; remainingToday: number };
			};
			setSuggestLearn(Boolean(
				json.ok && json.data && json.data.totalUnintroduced > 0 && json.data.remainingToday > 0,
			));
		} catch {
			setSuggestLearn(false);
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			void loadBriefing().catch(() => setPhase('empty'));
		}, 0);
		return () => clearTimeout(timer);
	}, [loadBriefing]);

	const showSummary = useCallback((reason: 'exit' | 'complete') => {
		setSummaryReason(reason);
		setPhase('summary');
	}, []);

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
		if (prefetchingRef.current) return;
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

	const handleAnswer = useCallback((result: CnPracticeSubmitItem) => {
		enqueue(result);
		seenWordChannelsRef.current.add(wordChannelKey(result.wordId, result.questionType));
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
	}, [flushAndWait, showSummary, trackQuestions]);

	const handleExit = useCallback(async () => {
		if (isExiting) return;
		setIsExiting(true);
		try {
			await flushAndWait();
			if (reviewedCountRef.current > 0) showSummary('exit');
			else router.push('/dashboard');
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
				void loadBriefing();
				if (phase === 'review' || phase === 'loading') void loadInitial();
			}}
		/>
	);

	if (phase === 'briefing') {
		if (!briefing) {
			return (
				<div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
					<Skeleton className="h-48 w-full rounded-card" />
					<Skeleton className="h-8 w-2/3" />
				</div>
			);
		}

		const hasDue = briefing.dueChannels > 0;
		const learnLink = suggestLearn
			? [{ href: '/learn', label: 'Học từ mới', icon: 'school' }]
			: [];
		const overdueSub = briefing.overdueCount > 0
			? `${briefing.overdueCount} mục trễ${pressureLabel(briefing.pressure) ? ` · Áp lực ${pressureLabel(briefing.pressure)?.toLowerCase()}` : ''}`
			: undefined;

		return (
			<>
				<SessionBriefingCard
					title="Luyện SRS"
					icon="history"
					theme="accent"
					heroValue={hasDue ? briefing.dueChannels : '✓'}
					heroLabel={hasDue
						? `${briefing.dueWords} từ · ${briefing.dueChannels} mục cần ôn`
						: 'Không có mục cần ôn hôm nay'}
					heroSub={hasDue ? `Ước tính ~${briefing.estimatedMinutes} phút` : undefined}
					stats={[
						...(briefing.streak > 0 ? [{
							label: 'Chuỗi ngày',
							value: briefing.streak,
							sub: briefing.reviewedToday === 0 ? 'Ôn hôm nay để giữ chuỗi' : undefined,
							highlight: briefing.reviewedToday === 0,
						}] : []),
						...(briefing.reviewedToday > 0 ? [{
							label: 'Đã ôn hôm nay',
							value: briefing.reviewedToday,
							sub: briefing.accuracyToday > 0 ? `${briefing.accuracyToday}% đúng` : undefined,
						}] : []),
						...(briefing.overdueCount > 0 ? [{
							label: 'Quá hạn',
							value: briefing.overdueCount,
							sub: overdueSub,
							highlight: true,
						}] : []),
						...(briefing.maturePct > 0 ? [{
							label: 'Độ chín',
							value: `${briefing.maturePct}%`,
						}] : []),
					]}
					insight={briefing.insight}
					primaryLabel={hasDue ? 'Bắt đầu ôn' : 'Không có mục để ôn'}
					onPrimary={() => { if (hasDue) void loadInitial(); }}
					primaryDisabled={!hasDue}
					secondaryLinks={[
						...learnLink,
						{ href: '/dashboard', label: 'Báo cáo học tập', icon: 'query_stats' },
						{ href: '/sets', label: 'Bộ từ', icon: 'menu_book' },
					]}
				/>
				{managerModal}
			</>
		);
	}

	if (phase === 'loading') {
		return (
			<>
				<div className="mx-auto max-w-2xl space-y-4 px-4 pt-6">
					<div className="flex justify-end">{managerButton}</div>
					<Skeleton className="h-64 w-full rounded-card" />
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
					{hasDueButNoQuestions ? (
						<EmptyState
							icon="error_outline"
							title="Không tải được câu hỏi"
							description={`Có ${dueToday} mục đến hạn nhưng không tải được câu hỏi.${skippedUnpublished > 0 ? ` ${skippedUnpublished} từ chưa được xuất bản.` : ''}`}
							action={{ label: 'Thử lại', onClick: () => { setPhase('loading'); void loadInitial(); } }}
							secondaryAction={{ label: 'Bộ từ', href: '/sets' }}
						/>
					) : (
						<EmptyState
							icon="celebration"
							title="Không có mục cần ôn hôm nay"
							description={suggestLearn
								? 'Bạn còn từ chưa học. Vào Học từ mới để bắt đầu.'
								: 'Bật Ôn SRS trên bộ từ để đưa từ vào hàng đợi ôn.'}
							action={{ label: 'Báo cáo học tập', href: '/dashboard' }}
							secondaryAction={suggestLearn
								? { label: 'Học từ mới', href: '/learn' }
								: { label: 'Chọn bộ từ', href: '/sets' }}
						/>
					)}
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
					void loadBriefing();
				}}
				primaryLabel="Luyện tiếp"
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
