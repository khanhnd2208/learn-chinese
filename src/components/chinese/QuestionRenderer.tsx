"use client";

import { useEffect, useRef, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import SpeakButton from '@/components/chinese/SpeakButton';
import StickingPointCard from '@/components/chinese/StickingPointCard';
import { channelLabel, isAudioQuestion, learnerSessionLabel } from '@/lib/chinese/questionLabels';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { useSpeech } from '@/lib/chinese/useSpeech';
import type { CnPracticeSubmitItem, CnPracticeQuestionDTO } from '@/types/chinese';

export type QuestionAnswerResult = CnPracticeSubmitItem;

export interface SessionProgressDisplay {
	reviewed: number;
	dueRemaining: number;
}

interface Props {
	questions: CnPracticeQuestionDTO[];
	onComplete?: (results: QuestionAnswerResult[]) => void;
	onAnswer?: (result: QuestionAnswerResult) => void;
	onExit?: () => void | Promise<void>;
	sessionProgress?: SessionProgressDisplay;
	incremental?: boolean;
	isExiting?: boolean;
	exitLabel?: string;
	sessionType?: 'practice' | 'review';
}

export default function QuestionRenderer({
	questions,
	onComplete,
	onAnswer,
	onExit,
	sessionProgress,
	incremental = false,
	isExiting = false,
	exitLabel,
	sessionType = 'practice',
}: Props) {
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [results, setResults] = useState<QuestionAnswerResult[]>([]);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [showMarkConfirm, setShowMarkConfirm] = useState(false);
	const [markingKnown, setMarkingKnown] = useState(false);
	const [sessionHeavyLapses, setSessionHeavyLapses] = useState<Record<string, number>>({});
	const [markKnownDiagnostic, setMarkKnownDiagnostic] = useState<CnPracticeQuestionDTO[] | null>(null);
	const { speak, supported } = useSpeech();
	const autoPlayedRef = useRef<string | null>(null);

	const q = questions[idx];
	const batchProgress = q ? ((idx + 1) / questions.length) * 100 : 0;
	const audioOnly = q ? isAudioQuestion(q.type) : false;
	const waiting = !!feedback || isExiting;

	useEffect(() => {
		if (!q?.audioText || !supported || !audioOnly) return;
		const audioText = q.audioText;
		const key = `${q.id}-${idx}`;
		if (autoPlayedRef.current === key) return;
		autoPlayedRef.current = key;
		const timer = setTimeout(() => speak(audioText), 400);
		return () => clearTimeout(timer);
	}, [q?.id, q?.audioText, idx, audioOnly, supported, speak]);

	if (!q) return null;

	const isFeedbackWrong = !!feedback && !['Đúng', 'Đã ghi nhận', 'Đã bỏ'].some((prefix) => feedback.startsWith(prefix));

	const gradeAnswer = (answer: string): boolean => answer.trim() === q.correctAnswer.trim();

	const handleExit = () => {
		if (waiting && !isExiting) return;
		void onExit?.();
	};

	const advance = (nextResults: QuestionAnswerResult[]) => {
		setFeedback(null);
		setSelected(null);
		if (idx + 1 >= questions.length) onComplete?.(nextResults);
		else setIdx(idx + 1);
	};

	const submitAnswer = (answer: string, skipped = false) => {
		let correct = false;
		let feedbackText = '';

		if (skipped) {
			feedbackText = 'Đã bỏ qua';
		} else {
			correct = gradeAnswer(answer);
			feedbackText = correct ? 'Đúng!' : `Sai — đáp án: ${q.correctAnswer}`;
		}

		const item: QuestionAnswerResult = {
			wordId: q.wordId,
			questionType: q.type,
			correct,
		};
		const next = [...results, item];
		setResults(next);
		onAnswer?.(item);
		setFeedback(feedbackText);
		if (!correct && !skipped) {
			setSessionHeavyLapses((prev) => ({
				...prev,
				[q.wordId]: (prev[q.wordId] ?? 0) + 1,
			}));
		}
		setTimeout(() => advance(next), skipped ? 600 : 1200);
	};

	const handleMarkKnown = async () => {
		if (sessionType !== 'review' || !q.canMarkKnown || markingKnown || waiting) return;
		setMarkingKnown(true);
		try {
			const res = await fetch('/api/review/mark-known/diagnostic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ wordId: q.wordId }),
			});
			const json = await res.json() as { ok: boolean; data?: { questions: CnPracticeQuestionDTO[] }; error?: string };
			if (!json.ok || !json.data?.questions.length) throw new Error(json.error ?? 'Không tạo được bài kiểm tra');
			setShowMarkConfirm(false);
			setMarkKnownDiagnostic(json.data.questions);
		} catch (e) {
			setFeedback(e instanceof Error ? e.message : 'Không thể bắt đầu kiểm tra');
		} finally {
			setMarkingKnown(false);
		}
	};

	const finishMarkKnownDiagnostic = async (items: QuestionAnswerResult[]) => {
		setMarkingKnown(true);
		try {
			const res = await fetch('/api/review/mark-known', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					wordId: q.wordId,
					questionType: q.type,
					diagnosticItems: items,
				}),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Chưa đủ chắc — hãy ôn thêm');
			setMarkKnownDiagnostic(null);
			setFeedback('Đã xác nhận — sẽ nhắc lại sau');
			setTimeout(() => advance(results), 800);
		} catch (e) {
			setMarkKnownDiagnostic(null);
			setFeedback(e instanceof Error ? e.message : 'Không thể đánh dấu');
		} finally {
			setMarkingKnown(false);
		}
	};

	const progressLabel = sessionProgress
		? `Đã ôn ${sessionProgress.reviewed} · còn ~${Math.max(0, sessionProgress.dueRemaining)}`
		: `Câu ${idx + 1} / ${questions.length}`;

	const resolvedExitLabel = exitLabel ?? (incremental ? 'Dừng & lưu' : 'Thoát');

	if (markKnownDiagnostic?.length) {
		return (
			<div className="w-full max-w-2xl">
				<p className="mb-4 text-center text-sm font-bold text-foreground-secondary">
					Kiểm tra nhanh — trả lời đúng ít nhất 2/3 câu
				</p>
				<QuestionRenderer
					questions={markKnownDiagnostic}
					sessionType="practice"
					exitLabel="Hủy kiểm tra"
					onExit={() => setMarkKnownDiagnostic(null)}
					onComplete={(items) => { void finishMarkKnownDiagnostic(items); }}
				/>
			</div>
		);
	}

	return (
		<div className="w-full max-w-2xl">
			{onExit && (
				<div className="mb-6 flex items-center justify-between">
					<button
						type="button"
						onClick={handleExit}
						disabled={isExiting}
						className="flex items-center gap-1 rounded-full px-2 py-1.5 label-caps text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-50"
					>
						<MaterialIcon name={isExiting ? 'hourglass_empty' : 'close'} size={16} />
						{isExiting ? 'Đang lưu...' : resolvedExitLabel}
					</button>
					<span className="label-caps text-muted">{learnerSessionLabel(q.type)}</span>
				</div>
			)}

			<div className="mb-8 flex flex-col gap-2">
				<div className="flex items-center justify-between label-caps text-foreground-secondary">
					<span>{progressLabel}</span>
					{sessionProgress && (
						<span className="text-muted">Câu {idx + 1}/{questions.length}</span>
					)}
					{!onExit && !sessionProgress && <span>{learnerSessionLabel(q.type)}</span>}
				</div>
				<ProgressBar value={sessionProgress ? Math.min(100, (sessionProgress.reviewed / Math.max(1, sessionProgress.reviewed + sessionProgress.dueRemaining)) * 100) : batchProgress} />
			</div>

			<div className="mb-8 text-center">
				<p className="mb-6 text-lg font-extrabold text-foreground-secondary">{q.prompt}</p>
				<QuestionHeroCard question={q} audioOnly={audioOnly} />
			</div>

			{q.options ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{q.options.map((opt, optIdx) => {
						const isCorrect = feedback && opt === q.correctAnswer;
						const isWrong = feedback && opt === selected && opt !== q.correctAnswer;
						const isChosen = selected === opt && !feedback;
						const isHanzi = /[\u4e00-\u9fff]/.test(opt);
						return (
							<button
								key={`${q.id}-opt-${optIdx}`}
								type="button"
								disabled={waiting}
								onClick={() => { setSelected(opt); submitAnswer(opt); }}
								className={`group min-h-[52px] rounded-xl border px-4 py-5 text-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
									isCorrect ? 'border-success bg-success/10' :
									isWrong ? 'border-accent bg-accent-subtle' :
									isChosen ? 'border-accent bg-accent-subtle' :
									'border-border bg-surface hover:border-accent'
								}`}
							>
								<span className={`font-extrabold transition-colors ${
									isHanzi ? 'hanzi-lg text-2xl' : 'text-lg'
								} ${
									isCorrect ? 'text-success' :
									isWrong || isChosen ? 'text-accent' :
									'text-foreground group-hover:text-accent'
								}`}>
									{opt}
								</span>
							</button>
						);
					})}
				</div>
			) : null}

			{feedback && (
				<p className={`mt-6 text-center text-sm font-bold ${
					feedback.startsWith('Đúng') || feedback.startsWith('Đã ghi nhận') ? 'text-success' :
					feedback.startsWith('Đã bỏ') ? 'text-muted' :
					'text-accent'
				}`}>
					{feedback}
				</p>
			)}

			{isFeedbackWrong && (q.usageNoteVi || q.mnemonicVi) && (
				<div className="mt-3 space-y-2">
					{q.usageNoteVi && (
						<div className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground-secondary">
							<span className="font-bold text-foreground">Lưu ý: </span>{q.usageNoteVi}
						</div>
					)}
					{q.mnemonicVi && (
						<div className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground-secondary">
							<span className="font-bold text-foreground">Mẹo nhớ: </span>{q.mnemonicVi}
						</div>
					)}
				</div>
			)}

			{feedback?.startsWith('Sai') && (sessionHeavyLapses[q.wordId] ?? 0) >= 2 && (
				<StickingPointCard wordId={q.wordId} simplified={q.hanzi} />
			)}

			{(sessionType === 'review' && q.canMarkKnown) && !feedback && (
				<div className="sticky bottom-0 z-10 mt-6 space-y-2 rounded-xl border border-border bg-background/95 p-3 backdrop-blur-sm">
					{q.canMarkKnown && !showMarkConfirm && (
						<button
							type="button"
							disabled={waiting || markingKnown}
							onClick={() => setShowMarkConfirm(true)}
							className="btn-secondary w-full min-h-[48px] justify-center !normal-case !tracking-normal"
						>
							<MaterialIcon name="verified" size={18} />
							Đã biết — kiểm tra nhanh
						</button>
					)}
					{showMarkConfirm && (
						<div className="space-y-2 text-center">
							<p className="text-sm text-foreground-secondary">
								Làm 3 câu ngắn để xác nhận kỹ năng{' '}
								<strong>{channelLabel(questionChannel(q.type) ?? 'meaning')}</strong>.
							</p>
							<div className="flex gap-2">
								<button type="button" onClick={() => setShowMarkConfirm(false)} className="btn-secondary flex-1 min-h-[44px]">
									Hủy
								</button>
								<button
									type="button"
									disabled={markingKnown}
									onClick={() => { void handleMarkKnown(); }}
									className="btn-primary flex-1 min-h-[44px]"
								>
									{markingKnown ? 'Đang lưu...' : 'Xác nhận'}
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			<div className={`mt-4 flex items-center justify-between ${audioOnly ? 'sticky bottom-2 z-10 rounded-xl border border-border bg-background/95 p-3 backdrop-blur-sm' : ''}`}>
				{q.audioText && (
					<button
						type="button"
						onClick={() => speak(q.audioText!)}
						className="btn-secondary min-h-[44px]"
					>
						<MaterialIcon name="volume_up" size={16} />
						Nghe lại
					</button>
				)}
				<button
					type="button"
					disabled={waiting}
					onClick={() => submitAnswer('', true)}
					className="btn-secondary ml-auto !normal-case !tracking-normal"
				>
					Bỏ qua
				</button>
			</div>
		</div>
	);
}

function QuestionHeroCard({ question: q, audioOnly }: { question: CnPracticeQuestionDTO; audioOnly: boolean }) {
	if (audioOnly) {
		return (
			<div className="card-paper mx-auto flex min-h-[200px] max-w-sm flex-col items-center justify-center gap-4 p-8 shadow-sm">
				<div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/20 bg-accent-subtle">
					<MaterialIcon name="headphones" className="text-accent" size={40} />
				</div>
				<p className="text-sm text-muted">Nhấn nút bên dưới để nghe lại</p>
				{q.audioText && <SpeakButton text={q.audioText} label="Phát âm" />}
			</div>
		);
	}

	if (q.type === 'meaning_to_hanzi' && q.meaningVi) {
		return (
			<div className="card-paper mx-auto max-w-md p-6 text-center shadow-sm">
				<p className="label-caps text-muted">Nghĩa</p>
				<p className="mt-2 text-xl font-extrabold leading-relaxed text-foreground">{q.meaningVi}</p>
			</div>
		);
	}

	if (q.type === 'fill_sentence' && q.sentenceTemplate) {
		return (
			<div className="card-paper mx-auto flex min-h-[160px] max-w-md flex-col items-center justify-center gap-3 p-8 shadow-sm">
				<p className="hanzi-lg text-3xl font-bold leading-relaxed text-foreground">{q.sentenceTemplate}</p>
				{q.audioText && <SpeakButton text={q.audioText} label="Nghe câu" />}
			</div>
		);
	}

	const hasVisual = !!(q.hanzi || q.pinyin);
	if (!hasVisual) return null;

	return (
		<div className="card-paper mx-auto flex min-h-[200px] max-w-sm flex-col items-center justify-center p-8 shadow-sm">
			{q.hanzi && <p className="hanzi-display text-5xl font-black text-foreground">{q.hanzi}</p>}
			{q.pinyin && !q.hanzi && <p className="text-2xl font-bold text-accent">{q.pinyin}</p>}
			{q.pinyin && q.hanzi && <p className="mt-2 text-lg font-bold text-muted">{q.pinyin}</p>}
			{q.audioText && !audioOnly && (
				<div className="mt-4">
					<SpeakButton text={q.audioText} label="Phát âm" />
				</div>
			)}
		</div>
	);
}
