"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';
import AnswerRevealCard from '@/components/chinese/AnswerRevealCard';
import SentencePromptCard from '@/components/chinese/SentencePromptCard';
import SpeakButton from '@/components/chinese/SpeakButton';
import StickingPointCard from '@/components/chinese/StickingPointCard';
import { questionChannel, type SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { isSoundQuestion, isFillSentenceQuestion, isTypedQuestion, learnerSessionLabel } from '@/lib/chinese/questionLabels';
import { gradeAnswer } from '@/lib/chinese/answerGrade';
import { formatReviewScheduleLabel } from '@/lib/chinese/reviewMetrics';
import { decideSentenceAttempt } from '@/lib/chinese/sentenceAttempt';
import { useSpeech } from '@/lib/chinese/useSpeech';
import type { CnPracticeSubmitItem, CnPracticeQuestionDTO, CnQuestionType } from '@/types/chinese';

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
	headerAction?: ReactNode;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const CHANNEL_PILL: Record<SkillChannel, { icon: string; className: string; fullLabel: string }> = {
	meaning: {
		icon: 'translate',
		className: 'border-accent/40 bg-accent/15 text-accent',
		fullLabel: 'KÊNH NGHĨA',
	},
	sound: {
		icon: 'headphones',
		className: 'border-success/40 bg-success/15 text-success',
		fullLabel: 'KÊNH ÂM ĐỌC',
	},
	sentence: {
		icon: 'edit_note',
		className: 'border-warning/40 bg-warning/10 text-warning',
		fullLabel: 'KÊNH CÂU',
	},
};

function getHintChars(q: CnPracticeQuestionDTO): string[] {
	return q.hanzi ? [...q.hanzi] : q.components ?? [];
}

function questionHasHint(q: CnPracticeQuestionDTO): boolean {
	const hintChars = getHintChars(q);
	return hintChars.length > 0 || !!q.usageNoteVi || !!q.mnemonicVi;
}

function channelFromType(type: CnQuestionType): SkillChannel {
	return questionChannel(type);
}

const OPTION_DELAY_CLASSES = [
	'animate-fade-slide-up-delay-1',
	'animate-fade-slide-up-delay-2',
	'animate-fade-slide-up-delay-3',
	'animate-fade-slide-up-delay-4',
] as const;

function SessionCountersPill({
	correctCount,
	wrongCount,
}: {
	correctCount: number;
	wrongCount: number;
}) {
	return (
		<div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold">
			<span className="flex items-center gap-1 text-success">
				<MaterialIcon name="check" size={16} />
				{correctCount}
			</span>
			<span className="h-3 w-px bg-border" />
			<span className="flex items-center gap-1 text-error">
				<MaterialIcon name="close" size={16} />
				{wrongCount}
			</span>
		</div>
	);
}

function ChannelPill({ type, large = false }: { type: CnQuestionType; large?: boolean }) {
	const channel = channelFromType(type);
	const pill = CHANNEL_PILL[channel];
	const label = large ? pill.fullLabel : learnerSessionLabel(type);

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border font-black uppercase tracking-wide ${pill.className} ${
				large ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]'
			}`}
		>
			<MaterialIcon name={pill.icon} size={large ? 16 : 12} filled />
			{label}
		</span>
	);
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
	headerAction,
}: Props) {
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [typedAnswer, setTypedAnswer] = useState('');
	const [results, setResults] = useState<QuestionAnswerResult[]>([]);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [pendingAdvance, setPendingAdvance] = useState(false);
	const [showHint, setShowHint] = useState(false);
	const [hintUsed, setHintUsed] = useState(false);
	const [sentenceHintKind, setSentenceHintKind] = useState<'audio' | 'pinyin' | null>(null);
	const [retryArmed, setRetryArmed] = useState(false);
	const [retryNotice, setRetryNotice] = useState<string | null>(null);
	const [rejectedOption, setRejectedOption] = useState<string | null>(null);
	const [forceTargetPinyin, setForceTargetPinyin] = useState(false);
	const [disputeSent, setDisputeSent] = useState(false);
	const [sessionHeavyLapses, setSessionHeavyLapses] = useState<Record<string, number>>({});
	const { speak, supported, ready: speechReady } = useSpeech();
	const autoPlayedRef = useRef<string | null>(null);
	const questionShownAtRef = useRef(0);
	const typedInputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef(results);
	const pendingWrongRef = useRef<QuestionAnswerResult | null>(null);
	const onAnswerRef = useRef(onAnswer);
	const pendingAdvanceRef = useRef(false);
	const ignoreOneAdvanceKeyRef = useRef(false);
	const advanceKeyGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		resultsRef.current = results;
	}, [results]);

	const clearAdvanceKeyGuard = useCallback(() => {
		ignoreOneAdvanceKeyRef.current = false;
		if (advanceKeyGuardTimerRef.current) {
			clearTimeout(advanceKeyGuardTimerRef.current);
			advanceKeyGuardTimerRef.current = null;
		}
	}, []);

	const armAdvanceKeyGuard = useCallback(() => {
		clearAdvanceKeyGuard();
		ignoreOneAdvanceKeyRef.current = true;
		advanceKeyGuardTimerRef.current = setTimeout(() => {
			ignoreOneAdvanceKeyRef.current = false;
			advanceKeyGuardTimerRef.current = null;
		}, 250);
	}, [clearAdvanceKeyGuard]);

	const consumeAdvanceKeyIfArmed = useCallback((): boolean => {
		if (!ignoreOneAdvanceKeyRef.current) return false;
		clearAdvanceKeyGuard();
		return true;
	}, [clearAdvanceKeyGuard]);

	useEffect(() => () => clearAdvanceKeyGuard(), [clearAdvanceKeyGuard]);

	const q = questions[idx];
	const isSound = q ? isSoundQuestion(q.type) : false;
	const typedOnly = q ? isTypedQuestion(q.type) : false;
	const waiting = pendingAdvance || isExiting;
	const hasHint = q ? !isFillSentenceQuestion(q.type) && questionHasHint(q) : false;

	const flushPendingWrong = useCallback(() => {
		const pending = pendingWrongRef.current;
		if (!pending) return;
		pendingWrongRef.current = null;
		onAnswerRef.current?.(pending);
	}, []);

	const advance = useCallback((nextResults: QuestionAnswerResult[]) => {
		flushPendingWrong();
		pendingAdvanceRef.current = false;
		clearAdvanceKeyGuard();
		setFeedback(null);
		setSelected(null);
		setTypedAnswer('');
		setPendingAdvance(false);
		setShowHint(false);
		setHintUsed(false);
		setSentenceHintKind(null);
		setRetryArmed(false);
		setRetryNotice(null);
		setRejectedOption(null);
		setForceTargetPinyin(false);
		setDisputeSent(false);
		setIdx((currentIdx) => {
			if (currentIdx + 1 >= questions.length) {
				onComplete?.(nextResults);
				return currentIdx;
			}
			return currentIdx + 1;
		});
	}, [questions.length, onComplete, clearAdvanceKeyGuard, flushPendingWrong]);

	useEffect(() => {
		onAnswerRef.current = onAnswer;
	}, [onAnswer]);

	useEffect(() => {
		// A held miss is not in the submit queue yet, so a reload would lose it.
		window.addEventListener('pagehide', flushPendingWrong);
		return () => {
			window.removeEventListener('pagehide', flushPendingWrong);
			flushPendingWrong();
		};
	}, [flushPendingWrong]);

	useEffect(() => {
		questionShownAtRef.current = Date.now();
	}, [idx]);

	useEffect(() => {
		if (!q?.audioText || !supported || !isSound) return;
		const audioText = q.audioText;
		const key = `${q.id}-${idx}`;
		if (autoPlayedRef.current === key) return;
		autoPlayedRef.current = key;
		const timer = setTimeout(() => speak(audioText), 400);
		return () => clearTimeout(timer);
	}, [q?.id, q?.audioText, idx, isSound, supported, speak]);

	useEffect(() => {
		if (!pendingAdvance) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Enter' && e.key !== ' ') return;
			if (e.isComposing) return;
			if (consumeAdvanceKeyIfArmed()) {
				e.preventDefault();
				return;
			}
			const active = document.activeElement;
			if (active instanceof HTMLInputElement && !active.disabled) return;
			if (active instanceof HTMLTextAreaElement && !active.disabled) return;
			e.preventDefault();
			advance(resultsRef.current);
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [pendingAdvance, advance, consumeAdvanceKeyIfArmed]);

	useEffect(() => {
		if (feedback || !typedOnly) return;
		typedInputRef.current?.focus();
	}, [idx, feedback, typedOnly]);

	if (!q) return null;

	const isFeedbackWrong = !!feedback && !['Đúng', 'Đã ghi nhận'].some((prefix) => feedback.startsWith(prefix));
	const isFeedbackCorrect = !!feedback && (feedback.startsWith('Đúng') || feedback.startsWith('Đã ghi nhận'));

	const gradeCurrentAnswer = (answer: string): boolean => gradeAnswer(q, answer);

	const handleExit = () => {
		if (isExiting) return;
		flushPendingWrong();
		void onExit?.();
	};

	const submitAnswer = (answer: string): boolean => {
		if (pendingAdvanceRef.current) return false;

		const correct = gradeCurrentAnswer(answer);
		const fillSentence = isFillSentenceQuestion(q.type);
		const ttsReady = speechReady && supported && !!q.sentenceAudioText;
		const pinyinReady = !!(q.wordPinyin || q.pinyin);
		if (
			fillSentence
			&& decideSentenceAttempt({ correct, hintUsed, retryArmed }) === 'retry'
			&& (ttsReady || pinyinReady)
		) {
			setHintUsed(true);
			setRetryArmed(true);
			setSelected(null);
			if (q.options) setRejectedOption(answer);
			const played = ttsReady ? speak(q.sentenceAudioText!) : false;
			setSentenceHintKind((current) => (current === 'audio' || played ? 'audio' : 'pinyin'));
			if (played) {
				setRetryNotice('Chưa khớp — nghe cả câu rồi thử lại nhé');
			} else {
				setForceTargetPinyin(true);
				setRetryNotice('Chưa khớp — xem pinyin rồi thử lại nhé');
			}
			if (!q.options) {
				window.setTimeout(() => {
					typedInputRef.current?.focus();
					typedInputRef.current?.select();
				}, 0);
			}
			return true;
		}

		const feedbackText = correct ? 'Đúng!' : 'Sai';
		const shownAt = questionShownAtRef.current || Date.now();
		const responseMs = Math.min(600_000, Math.max(0, Date.now() - shownAt));

		const item: QuestionAnswerResult = {
			wordId: q.wordId,
			questionType: q.type,
			correct,
			answer,
			clientAnswerId: crypto.randomUUID(),
			hintUsed,
			responseMs,
			...(q.exampleId ? { exampleId: q.exampleId } : {}),
			...(fillSentence ? { attempts: (retryArmed ? 2 : 1) as 1 | 2 } : {}),
		};
		const next = [...results, item];
		setResults(next);
		if (fillSentence && !correct) {
			pendingWrongRef.current = item;
		} else {
			onAnswer?.(item);
		}
		setFeedback(feedbackText);

		if (!correct) {
			setSessionHeavyLapses((prev) => ({
				...prev,
				[q.wordId]: (prev[q.wordId] ?? 0) + 1,
			}));
		}

		pendingAdvanceRef.current = true;
		setPendingAdvance(true);
		return false;
	};

	const handleNext = () => {
		if (!pendingAdvance) return;
		advance(results);
	};

	const correctCount = results.filter((r) => r.correct).length;
	const wrongCount = results.length - correctCount;
	const reviewedCount = sessionProgress?.reviewed ?? results.length;
	const dueRemaining = sessionProgress?.dueRemaining ?? Math.max(0, questions.length - results.length);
	const totalEstimate = reviewedCount + dueRemaining;
	const progressPct = totalEstimate > 0 ? Math.min(100, Math.round((reviewedCount / totalEstimate) * 100)) : 0;

	const scheduleIsCorrect = disputeSent || isFeedbackCorrect;
	const scheduleLabel = feedback && q.channelIntervalIdx !== undefined
		? formatReviewScheduleLabel(
			q.channelIntervalIdx,
			scheduleIsCorrect,
			new Date(),
			{ hintUsed: disputeSent || hintUsed },
		)
		: null;

	const resolvedExitLabel = exitLabel ?? (incremental ? 'Dừng' : 'Thoát');
	const isReviewSession = !!sessionProgress;

	const feedbackPaddingClass = feedback
		? isFeedbackWrong && isFillSentenceQuestion(q.type)
			? 'pb-52'
			: isFeedbackWrong
				? 'pb-48'
				: 'pb-44'
		: '';

	return (
		<div className="flex w-full max-w-2xl flex-col">
			{isReviewSession ? (
				<header className="sticky top-0 z-sticky -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm animate-slide-down">
					<div className="flex items-center justify-between gap-2">
						<div className="flex min-w-0 items-center gap-2">
							{onExit ? (
								<button
									type="button"
									onClick={handleExit}
									disabled={isExiting}
									className="flex shrink-0 items-center gap-1 py-1 label-caps text-muted transition-colors hover:text-accent disabled:opacity-50"
								>
									<MaterialIcon name={isExiting ? 'hourglass_empty' : 'close'} size={20} />
									<span>{isExiting ? 'Đang lưu...' : resolvedExitLabel}</span>
								</button>
							) : null}
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<SessionCountersPill
								correctCount={correctCount}
								wrongCount={wrongCount}
							/>
							{dueRemaining > 0 && (
								<span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
									~{dueRemaining}
								</span>
							)}
							{headerAction}
						</div>
					</div>
					<div className="mt-2 flex justify-center">
						<ChannelPill type={q.type} large />
					</div>
					<div className="mt-2.5 space-y-1">
						<div className="flex items-center justify-between text-xs font-bold text-foreground-secondary">
							<span>
								Đã ôn {reviewedCount}
								{dueRemaining > 0 && <> · Còn ~{dueRemaining}</>}
							</span>
							<span className="tabular-nums">{progressPct}%</span>
						</div>
						<div
							className="h-2 w-full overflow-hidden rounded-full border border-border/50 bg-accent-subtle"
							role="progressbar"
							aria-valuenow={reviewedCount}
							aria-valuemin={0}
							aria-valuemax={totalEstimate}
							aria-label={`Tiến độ ôn ${progressPct}%`}
						>
							<div
								className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
					</div>
				</header>
			) : (
				<div className="mb-4 flex flex-col gap-2">
					<div className="flex items-start justify-between gap-2">
						{onExit ? (
							<button
								type="button"
								onClick={handleExit}
								disabled={isExiting}
								className="flex shrink-0 items-center gap-1 rounded-full p-1.5 label-caps text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-50 sm:px-3 sm:py-1.5"
							>
								<MaterialIcon name={isExiting ? 'hourglass_empty' : 'close'} size={18} />
								<span className="hidden sm:inline">
									{isExiting ? 'Đang lưu...' : resolvedExitLabel}
								</span>
							</button>
						) : (
							<ChannelPill type={q.type} />
						)}
						<div className="flex items-center gap-1.5">
							<span className="label-caps text-muted">{idx + 1} / {questions.length}</span>
							<ChannelPill type={q.type} />
							{headerAction}
						</div>
					</div>
				</div>
			)}

			<div className={`flex flex-1 flex-col ${feedbackPaddingClass}`}>
				<div className="mb-6 text-center">
					<p className="animate-fade-slide-up mb-4 text-lg font-extrabold text-foreground-secondary opacity-0">
						{q.prompt}
					</p>
					<div className="animate-fade-slide-up opacity-0" style={{ animationDelay: '0.1s' }}>
						<QuestionHeroCard
							key={q.id}
							question={q}
							isSound={isSound}
							showSoundPinyin={hintUsed || !!feedback || (speechReady && !supported)}
							soundHintAvailable={speechReady && supported}
							onRevealPinyin={() => setHintUsed(true)}
							audioAvailable={!speechReady || supported}
							revealUsed={hintUsed}
							forceTargetPinyin={forceTargetPinyin}
							onReveal={(kind) => {
								setHintUsed(true);
								setSentenceHintKind((current) => (current === 'audio' ? 'audio' : kind));
							}}
							onPlay={speak}
						/>
					</div>
					{hasHint && (
						<button
							type="button"
							onClick={() => {
								if (!showHint) setHintUsed(true);
								setShowHint((open) => !open);
							}}
							className="mx-auto mt-3 flex items-center gap-1 label-caps text-muted transition-colors hover:text-accent"
						>
							<MaterialIcon name="lightbulb" size={14} />
							{showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
						</button>
					)}
					{showHint && hasHint && (
						<HintPanel question={q} />
					)}
				</div>

				{retryNotice && (
					<p className="mx-auto mb-3 w-full max-w-md text-center text-sm text-foreground-secondary" role="status">
						{retryNotice}
					</p>
				)}

				{q.options ? (
					<div className="mx-auto flex w-full max-w-md flex-col gap-2">
						{q.options.map((opt, optIdx) => {
							const isCorrect = feedback && opt === q.correctAnswer;
							const isWrong = feedback && opt === selected && opt !== q.correctAnswer;
							const isChosen = selected === opt && !feedback;
							const isHanzi = /[\u4e00-\u9fff]/.test(opt);
							const isRejected = opt === rejectedOption && !feedback;
							const isDimmed = (!!feedback && !isCorrect && !isWrong) || isRejected;
							const letter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1);
							const delayClass = OPTION_DELAY_CLASSES[Math.min(optIdx, OPTION_DELAY_CLASSES.length - 1)];

							return (
								<button
									key={`${q.id}-opt-${optIdx}`}
									type="button"
									disabled={waiting || !!feedback || isRejected}
									onClick={() => { setSelected(opt); submitAnswer(opt); }}
									className={`${delayClass} group relative flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
										isCorrect
											? 'border-2 border-success bg-success/10'
											: isWrong
												? 'border-2 border-error bg-error/10'
												: isChosen
													? 'border-accent bg-accent-subtle'
													: 'border-border bg-surface hover:border-accent'
									} ${isDimmed ? 'pointer-events-none opacity-50 grayscale' : ''}`}
								>
									<span
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
											isCorrect
												? 'bg-success text-white'
												: isWrong
													? 'bg-error text-white'
													: isChosen
														? 'bg-accent text-accent-foreground'
														: 'bg-surface-container text-muted'
										}`}
									>
										{letter}
									</span>
									<span
										className={`flex-1 font-extrabold ${
											isHanzi ? 'hanzi-lg text-2xl text-center' : 'text-base'
										} ${
											isCorrect
												? 'text-success'
												: isWrong
													? 'text-error'
													: isChosen
														? 'text-accent'
														: 'text-foreground group-hover:text-accent'
										}`}
									>
										{opt}
									</span>
									{isCorrect && (
										<MaterialIcon name="check_circle" className="shrink-0 text-success" size={22} filled />
									)}
								</button>
							);
						})}
					</div>
				) : typedOnly ? (
					<div className="mx-auto w-full max-w-md animate-fade-slide-up opacity-0">
						<input
							ref={typedInputRef}
							type="text"
							value={typedAnswer}
							onChange={(e) => setTypedAnswer(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Process' || e.nativeEvent.isComposing) return;
								if (e.key !== 'Enter') return;
								if (!typedAnswer.trim() || pendingAdvanceRef.current || feedback) return;
								e.preventDefault();
								e.stopPropagation();
								armAdvanceKeyGuard();
								const retried = submitAnswer(typedAnswer);
								if (!retried) typedInputRef.current?.blur();
							}}
							disabled={waiting || !!feedback}
							placeholder={
								q.type === 'fill_sentence_typed'
									? 'Nhập Hán tự điền vào chỗ trống...'
									: 'Nhập Hán tự...'
							}
							className={`w-full rounded-xl border px-4 py-4 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent ${
								q.type === 'meaning_to_hanzi_typed' || q.type === 'sound_to_hanzi_typed' || q.type === 'fill_sentence_typed'
									? 'hanzi-lg'
									: ''
							} ${
								feedback && gradeCurrentAnswer(typedAnswer)
									? 'border-success bg-success/10'
									: feedback
										? 'border-error bg-error/10'
										: 'border-border bg-surface'
							}`}
							autoFocus
						/>
						{!feedback && (
							<button
								type="button"
								disabled={waiting || !typedAnswer.trim()}
								onClick={() => submitAnswer(typedAnswer)}
								className="btn-primary mt-4 min-h-[44px] w-full"
							>
								Kiểm tra
							</button>
						)}
						{feedback && pendingAdvance && (
							<p className="mt-2 hidden text-center text-xs text-muted sm:block">
								Nhấn Enter để tiếp tục
							</p>
						)}
					</div>
				) : null}

				{feedback?.startsWith('Sai') && (q.isStickingPoint === true || (sessionHeavyLapses[q.wordId] ?? 0) >= 2) && (
					<div className="mx-auto mt-4 w-full max-w-md">
						<StickingPointCard wordId={q.wordId} simplified={q.hanzi} />
					</div>
				)}

			</div>

			{feedback && (
				<div
					className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm animate-fade-slide-up md:left-(--sidebar-width) ${
						isFeedbackCorrect ? 'animate-pulse-success' : ''
					}`}
				>
					<div className="mx-auto w-full max-w-2xl px-4 py-3 pb-safe">
						<div
							className={`relative overflow-hidden rounded-xl border-2 p-3 sm:p-4 ${
								isFeedbackCorrect
									? 'border-success bg-surface'
									: 'border-accent bg-surface'
							}`}
						>
							{isFeedbackCorrect && (
								<div className="absolute bottom-0 left-0 top-0 w-1.5 bg-success" />
							)}
							<div className={`max-h-[32vh] overflow-y-auto ${isFeedbackWrong ? 'sm:max-h-[40vh]' : ''}`}>
								<div className="flex items-center gap-2 pl-2">
									<MaterialIcon
										name={isFeedbackCorrect ? 'task_alt' : 'cancel'}
										className={isFeedbackCorrect ? 'text-success' : 'text-accent'}
										size={24}
										filled
									/>
									<span className={`text-base font-black sm:text-lg ${isFeedbackCorrect ? 'text-success' : 'text-accent'}`}>
										{isFeedbackCorrect ? 'Đúng!' : 'Chưa đúng'}
									</span>
								</div>
								{isFeedbackWrong && isFillSentenceQuestion(q.type) && (
									<div className="mt-2 pl-2">
										<Button
											variant="secondary"
											size="sm"
											disabled={disputeSent}
											onClick={() => {
												if (pendingWrongRef.current) pendingWrongRef.current.disputed = true;
												setDisputeSent(true);
											}}
										>
											{disputeSent
												? 'Đã gửi để kiểm tra — từ này không bị trừ bậc'
												: 'Đáp án của tôi cũng đúng'}
										</Button>
									</div>
								)}
								{isFeedbackCorrect && hintUsed && (
									<p className="mt-1 pl-2 text-sm text-foreground-secondary">
										{isFillSentenceQuestion(q.type)
											? sentenceHintKind === 'pinyin'
												? 'Bạn đã xem pinyin từ cần điền, nên từ này giữ nguyên bậc. Lần sau thử không xem nhé.'
												: 'Bạn đã nghe câu, nên từ này giữ nguyên bậc. Lần sau thử không nghe nhé.'
											: 'Có dùng gợi ý, nên từ này giữ nguyên bậc.'}
									</p>
								)}
								{isFeedbackWrong && <AnswerRevealCard question={q} />}
								{isFeedbackWrong && (q.mnemonicVi || q.usageNoteVi) && (
									<p className="mt-2 pl-2 text-sm italic text-foreground-secondary">
										{q.mnemonicVi ? (
											<>
												Mẹo nhớ:{' '}
												<span className="font-bold not-italic text-foreground">{q.mnemonicVi}</span>
											</>
										) : (
											<>
												Lưu ý:{' '}
												<span className="font-bold not-italic text-foreground">{q.usageNoteVi}</span>
											</>
										)}
									</p>
								)}
							</div>
							<div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-2">
								{scheduleLabel && incremental ? (
									<div
										className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ${
											scheduleIsCorrect
												? 'bg-success/10 text-success'
												: 'bg-warning/10 text-warning'
										}`}
									>
										<MaterialIcon
											name={scheduleIsCorrect ? 'calendar_month' : 'replay'}
											size={16}
										/>
										{scheduleLabel}
									</div>
								) : (
									<span />
								)}
								<div className="ml-auto flex items-center gap-2">
									{pendingAdvance && (q.audioText ?? q.sentenceAudioText) && (
										<button
											type="button"
											onClick={() => speak((q.audioText ?? q.sentenceAudioText)!)}
											className="btn-secondary min-h-[40px]"
										>
											<MaterialIcon name="volume_up" size={16} />
											Nghe lại
										</button>
									)}
									{pendingAdvance && (
										<button
											type="button"
											onClick={handleNext}
											className="btn-primary min-h-[44px] px-6"
										>
											Tiếp tục
											<MaterialIcon name="arrow_forward" size={18} />
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function HintPanel({ question: q }: { question: CnPracticeQuestionDTO }) {
	const hintChars = getHintChars(q);
	return (
		<div className="mx-auto mt-3 w-full max-w-md rounded-lg border border-border/60 bg-surface/50 px-4 py-3 text-center">
			{hintChars.length > 0 && (
				<div className="flex flex-wrap items-center justify-center gap-3">
					{hintChars.map((char, i) => (
						<div key={`${char}-${i}`} className="flex items-center gap-3">
							{i > 0 && <span className="text-muted">+</span>}
							<span className="hanzi-lg text-xl text-warning">{char}</span>
						</div>
					))}
				</div>
			)}
			{(q.usageNoteVi || q.mnemonicVi) && (
				<p className={`text-sm text-foreground-secondary ${hintChars.length > 0 ? 'mt-2' : ''}`}>
					{q.mnemonicVi ?? q.usageNoteVi}
				</p>
			)}
		</div>
	);
}

function QuestionHeroCard({
	question: q,
	isSound,
	showSoundPinyin,
	soundHintAvailable,
	onRevealPinyin,
	audioAvailable,
	revealUsed,
	forceTargetPinyin,
	onReveal,
	onPlay,
}: {
	question: CnPracticeQuestionDTO;
	isSound: boolean;
	showSoundPinyin: boolean;
	soundHintAvailable: boolean;
	onRevealPinyin: () => void;
	audioAvailable: boolean;
	revealUsed: boolean;
	forceTargetPinyin: boolean;
	onReveal: (kind: 'audio' | 'pinyin') => void;
	onPlay: (text: string) => void | boolean;
}) {
	if (isSound) {
		const caption = q.type === 'sound_to_hanzi_typed' ? 'Nghe và gõ chữ đúng' : 'Nghe và chọn chữ đúng';
		return (
			<div className="card-paper animate-float mx-auto flex min-h-[200px] w-full max-w-md flex-col items-center justify-center gap-4 p-8">
				{q.audioText && <SpeakButton text={q.audioText} label="Nghe" iconOnly large />}
				<p className="text-sm font-medium text-muted">{caption}</p>
				{showSoundPinyin && q.pinyin ? (
					<p className="text-2xl font-bold text-accent">{q.pinyin}</p>
				) : q.pinyin && soundHintAvailable ? (
					<button
						type="button"
						onClick={onRevealPinyin}
						className="label-caps text-muted transition-colors hover:text-accent"
					>
						Hiện pinyin
					</button>
				) : null}
			</div>
		);
	}

	if (isFillSentenceQuestion(q.type) && q.sentenceTemplate) {
		return (
			<SentencePromptCard
				sentenceTemplate={q.sentenceTemplate}
				sentenceMeaningVi={q.sentenceMeaningVi}
				pinyin={q.pinyin}
				wordPinyin={q.wordPinyin}
				sentenceAudioText={q.sentenceAudioText}
				audioAvailable={audioAvailable}
				revealUsed={revealUsed}
				forceTargetPinyin={forceTargetPinyin}
				onReveal={onReveal}
				onPlay={onPlay}
			/>
		);
	}

	if ((q.type === 'meaning_to_hanzi' || q.type === 'meaning_to_hanzi_typed') && q.meaningVi) {
		return (
			<div className="card-paper animate-float mx-auto min-h-[160px] w-full max-w-md p-8 text-center">
				<p className="label-caps text-muted">Nghĩa</p>
				<p className="mt-2 text-xl font-extrabold leading-relaxed text-foreground">{q.meaningVi}</p>
			</div>
		);
	}

	const hasVisual = !!(q.hanzi || q.pinyin);
	if (!hasVisual) return null;

	return (
		<div className="card-paper animate-float mx-auto flex min-h-[200px] w-full max-w-md flex-col items-center justify-center p-8">
			{q.hanzi && <p className="hanzi-display text-6xl font-black text-foreground">{q.hanzi}</p>}
			{q.pinyin && !q.hanzi && <p className="text-2xl font-bold text-accent">{q.pinyin}</p>}
			{q.pinyin && q.hanzi && <p className="mt-2 text-lg font-bold text-muted">{q.pinyin}</p>}
			{q.audioText && !isSound && (
				<div className="mt-4">
					<SpeakButton text={q.audioText} label="Phát âm" />
				</div>
			)}
		</div>
	);
}
