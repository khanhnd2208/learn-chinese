'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useFocusProgress } from '@/components/layout/FocusSession';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import { channelLabel, practiceModeLabel } from '@/lib/chinese/questionLabels';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO, CnPracticeSubmitItem, CnQuestionType } from '@/types/chinese';

function summarizeByChannel(byType: Record<string, { correct: number; total: number }>) {
	const out: Record<string, { correct: number; total: number }> = {};
	for (const [type, stats] of Object.entries(byType)) {
		const channel = questionChannel(type as CnQuestionType);
		const label = channelLabel(channel);
		if (!out[label]) out[label] = { correct: 0, total: 0 };
		out[label].correct += stats.correct;
		out[label].total += stats.total;
	}
	return out;
}

export default function ChinesePracticeClient() {
	const { setId } = useParams<{ setId: string }>();
	const searchParams = useSearchParams();
	const router = useRouter();
	const mode = searchParams.get('mode') ?? 'smart_mixed';
	const wordId = searchParams.get('word') ?? searchParams.get('wordId');
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showSummary, setShowSummary] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [reviewedCount, setReviewedCount] = useState(0);

	const { enqueue, flushAndWait, sessionResult, isFlushing } = useIncrementalSubmit();
	useFocusProgress(questions.length > 0 ? (reviewedCount / questions.length) * 100 : 0);

	useEffect(() => {
		(async () => {
			try {
				const params = new URLSearchParams({
					mode,
					count: '20',
				});
				if (wordId) params.set('wordId', wordId);
				const res = await fetch(`/api/practice/${setId}?${params}`);
				const json = await res.json() as { ok: boolean; data?: { questions: CnPracticeQuestionDTO[] }; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Lỗi');
				setQuestions(json.data?.questions ?? []);
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Lỗi');
			} finally {
				setLoading(false);
			}
		})();
	}, [setId, mode, wordId]);

	const handleAnswer = (result: CnPracticeSubmitItem) => {
		enqueue(result);
		setReviewedCount((c) => c + 1);
	};

	const handleComplete = async () => {
		await flushAndWait();
		setShowSummary(true);
	};

	const handleExit = async () => {
		if (isExiting) return;
		setIsExiting(true);
		try {
			await flushAndWait();
			if (reviewedCount > 0) setShowSummary(true);
			else router.push(`/sets/${setId}`);
		} catch {
			setIsExiting(false);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 text-muted">
				Đang tải bài luyện...
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-16 text-center">
				<p className="text-accent">{error}</p>
				<Link href={`/sets/${setId}`} className="btn-secondary mt-6">
					<MaterialIcon name="arrow_back" size={16} />
					Quay lại bộ từ
				</Link>
			</div>
		);
	}

	if (showSummary) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-12">
				<div className="card-paper p-8 text-center">
					<MaterialIcon name="emoji_events" className="mx-auto text-gold" size={48} />
					<h1 className="mt-4 text-3xl font-black text-foreground">Kết quả</h1>
					<p className="mt-4 text-4xl font-black">
						<span className="text-success">{sessionResult.correct}</span>
						<span className="text-muted"> / {sessionResult.total}</span>
					</p>
					<p className="mt-1 text-sm text-muted">
						câu đúng · luyện tập giúp app biết kênh yếu; không đổi lịch ôn.
					</p>
					<ul className="mt-6 space-y-2 text-left text-sm text-foreground-secondary">
						{Object.entries(summarizeByChannel(sessionResult.byType)).map(([label, s]) => (
							<li key={label} className="flex justify-between border-b border-border/50 pb-2">
								<span>{label}</span>
								<span className="font-bold">{s.correct}/{s.total}</span>
							</li>
						))}
					</ul>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<Link
							href={`/practice/${setId}?mode=${mode}${wordId ? `&word=${wordId}` : ''}`}
							className="btn-primary"
						>
							<MaterialIcon name="refresh" size={16} />
							Luyện lại
						</Link>
						<Link href={`/sets/${setId}`} className="btn-secondary">
							<MaterialIcon name="arrow_back" size={16} />
							Bộ từ
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-6 md:py-8">
			<p className="mb-4 text-center text-xs font-bold uppercase tracking-wide text-muted">
				{practiceModeLabel(mode)}
			</p>
			{questions.length ? (
				<QuestionRenderer
					questions={questions}
					onAnswer={handleAnswer}
					onComplete={() => { void handleComplete(); }}
					onExit={() => { void handleExit(); }}
					exitLabel="Dừng"
					isExiting={isExiting || isFlushing}
					sessionProgress={{
						reviewed: reviewedCount,
						dueRemaining: Math.max(0, questions.length - reviewedCount),
					}}
				/>
			) : (
				<div className="card-paper p-8 text-center">
					<p className="text-muted">Không có câu hỏi cho bộ từ này.</p>
					<Link href={`/sets/${setId}`} className="btn-secondary mt-4">
						Quay lại bộ từ
					</Link>
				</div>
			)}
		</div>
	);
}
