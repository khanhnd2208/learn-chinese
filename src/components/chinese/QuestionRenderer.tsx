"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import SpeakButton from '@/components/chinese/SpeakButton';
import StickingPointCard from '@/components/chinese/StickingPointCard';
import { isAudioQuestion, isTypedQuestion, learnerSessionLabel } from '@/lib/chinese/questionLabels';
import { gradeAnswer } from '@/lib/chinese/answerGrade';
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
	headerAction?: ReactNode;
}

function getHintChars(q: CnPracticeQuestionDTO): string[] {
	return q.hanzi ? [...q.hanzi] : q.components ?? [];
}

function questionHasHint(q: CnPracticeQuestionDTO): boolean {
	const hintChars = getHintChars(q);
	return hintChars.length > 0 || !!q.usageNoteVi || !!q.mnemonicVi;
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
	const [sessionHeavyLapses, setSessionHeavyLapses] = useState<Record<string, number>>({});
	const { speak, supported } = useSpeech();
	const autoPlayedRef = useRef<string | null>(null);

	const q = questions[idx];
	const batchProgress = q ? ((idx + 1) / questions.length) * 100 : 0;
	const audioOnly = q ? isAudioQuestion(q.type) : false;
	const typedOnly = q ? isTypedQuestion(q.type) : false;
	const waiting = pendingAdvance || isExiting;
	const hasHint = q ? questionHasHint(q) : false;

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

	const isFeedbackWrong = !!feedback && !['Đúng', 'Đã ghi nhận'].some((prefix) => feedback.startsWith(prefix));
	const isFeedbackCorrect = !!feedback && (feedback.startsWith('Đúng') || feedback.startsWith('Đã ghi nhận'));

	const gradeCurrentAnswer = (answer: string): boolean => gradeAnswer(q, answer);

	const handleExit = () => {
		if (waiting && !isExiting) return;
		void onExit?.();
	};

	const advance = (nextResults: QuestionAnswerResult[]) => {
		setFeedback(null);
		setSelected(null);
		setTypedAnswer('');
		setPendingAdvance(false);
		setShowHint(false);
		if (idx + 1 >= questions.length) onComplete?.(nextResults);
		else setIdx(idx + 1);
	};

	const submitAnswer = (answer: string) => {
		const correct = gradeCurrentAnswer(answer);
		const feedbackText = correct ? 'Đúng!' : `Sai — đáp án: ${q.correctAnswer}`;

		const item: QuestionAnswerResult = {
			wordId: q.wordId,
			questionType: q.type,
			correct,
		};
		const next = [...results, item];
		setResults(next);
		onAnswer?.(item);
		setFeedback(feedbackText);

		if (!correct) {
			setSessionHeavyLapses((prev) => ({
				...prev,
				[q.wordId]: (prev[q.wordId] ?? 0) + 1,
			}));
		}

		setPendingAdvance(true);
	};

	const handleNext = () => {
		if (!pendingAdvance) return;
		advance(results);
	};

	const progressValue = sessionProgress
		? Math.min(100, (sessionProgress.reviewed / Math.max(1, sessionProgress.reviewed + sessionProgress.dueRemaining)) * 100)
		: batchProgress;

	const resolvedExitLabel = exitLabel ?? (incremental ? 'Dừng & lưu' : 'Thoát');

	return (
		<div className="w-full max-w-2xl">
			<div className="mb-4 flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					{onExit ? (
						<button
							type="button"
							onClick={handleExit}
							disabled={isExiting}
							className="flex items-center gap-1 rounded-full p-1.5 label-caps text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-50 sm:px-3 sm:py-1.5"
						>
							<MaterialIcon name={isExiting ? 'hourglass_empty' : 'close'} size={18} />
							<span className="hidden sm:inline">
								{isExiting ? 'Đang lưu...' : resolvedExitLabel}
							</span>
						</button>
					) : (
						<span className="label-caps text-muted">{learnerSessionLabel(q.type)}</span>
					)}
					<div className="flex flex-col items-end gap-0.5">
						<div className="flex items-center gap-2">
							<span className="label-caps text-muted">{idx + 1} / {questions.length}</span>
							{headerAction}
						</div>
						<span className="hidden label-caps text-muted/70 sm:block">
							{learnerSessionLabel(q.type)}
						</span>
					</div>
				</div>
				<ProgressBar value={progressValue} className="h-1" />
			</div>

			<div className="mb-6 text-center">
				<p className="mb-4 text-lg font-extrabold text-foreground-secondary">{q.prompt}</p>
				<QuestionHeroCard question={q} audioOnly={audioOnly} />
				{hasHint && (
					<button
						type="button"
						onClick={() => setShowHint((v) => !v)}
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

			{q.options ? (
				<div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
					{q.options.map((opt, optIdx) => {
						const isCorrect = feedback && opt === q.correctAnswer;
						const isWrong = feedback && opt === selected && opt !== q.correctAnswer;
						const isChosen = selected === opt && !feedback;
						const isHanzi = /[\u4e00-\u9fff]/.test(opt);
						return (
							<button
								key={`${q.id}-opt-${optIdx}`}
								type="button"
								disabled={waiting || !!feedback}
								onClick={() => { setSelected(opt); submitAnswer(opt); }}
								className={`group relative min-h-[52px] rounded-xl border px-4 py-5 text-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
									isCorrect ? 'border-success bg-success/10 shadow-sm ring-1 ring-success/20' :
									isWrong ? 'border-accent bg-accent-subtle' :
									isChosen ? 'border-accent bg-accent-subtle' :
									'border-border bg-surface hover:border-accent'
								}`}
							>
								{isCorrect && (
									<span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white shadow-md">
										<MaterialIcon name="check" size={14} />
									</span>
								)}
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
			) : typedOnly ? (
				<div className="mx-auto w-full max-w-md">
					<input
						type="text"
						value={typedAnswer}
						onChange={(e) => setTypedAnswer(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && typedAnswer.trim() && !waiting && !feedback) {
								submitAnswer(typedAnswer);
							}
						}}
						disabled={waiting || !!feedback}
						placeholder={
							q.type === 'hanzi_to_pinyin_typed'
								? 'Nhập pinyin...'
								: 'Nhập Hán tự...'
						}
						className={`w-full rounded-xl border px-4 py-4 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent ${
							q.type === 'meaning_to_hanzi_typed' || q.type === 'audio_to_hanzi_typed'
								? 'hanzi-lg'
								: ''
						} ${
							feedback && gradeCurrentAnswer(typedAnswer)
								? 'border-success bg-success/10'
								: feedback
									? 'border-accent bg-accent-subtle'
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
				</div>
			) : null}

			{feedback && (
				<div className="mx-auto mt-6 w-full max-w-md rounded-xl border border-border bg-surface p-4 text-center">
					<p className={`text-sm font-bold ${
						isFeedbackCorrect ? 'text-success' : 'text-accent'
					}`}>
						{feedback}
					</p>
					{isFeedbackWrong && (q.mnemonicVi || q.usageNoteVi) && (
						<p className="mt-2 text-sm italic text-foreground-secondary">
							{q.mnemonicVi ? (
								<>
									Mẹo nhớ: <span className="font-bold not-italic text-foreground">{q.mnemonicVi}</span>
								</>
							) : (
								<>
									Lưu ý: <span className="font-bold not-italic text-foreground">{q.usageNoteVi}</span>
								</>
							)}
						</p>
					)}
				</div>
			)}

			{feedback?.startsWith('Sai') && (sessionHeavyLapses[q.wordId] ?? 0) >= 2 && (
				<div className="mx-auto mt-4 w-full max-w-md">
					<StickingPointCard wordId={q.wordId} simplified={q.hanzi} />
				</div>
			)}

			<div className="mx-auto mt-6 flex w-full max-w-md items-center justify-between">
				{pendingAdvance && q.audioText ? (
					<button
						type="button"
						onClick={() => speak(q.audioText!)}
						className="btn-secondary min-h-[40px]"
					>
						<MaterialIcon name="volume_up" size={16} />
						Nghe lại
					</button>
				) : (
					<span />
				)}
				{pendingAdvance ? (
					<button
						type="button"
						onClick={handleNext}
						className="btn-primary min-h-[40px] px-6"
					>
						Tiếp theo
						<MaterialIcon name="arrow_forward" size={18} />
					</button>
				) : (
					<span />
				)}
			</div>
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

function QuestionHeroCard({ question: q, audioOnly }: { question: CnPracticeQuestionDTO; audioOnly: boolean }) {
	if (audioOnly) {
		return (
			<div className="card-paper mx-auto flex min-h-[200px] w-full max-w-md flex-col items-center justify-center gap-4 p-8 shadow-sm">
				<div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/20 bg-accent-subtle">
					<MaterialIcon name="headphones" className="text-accent" size={32} />
				</div>
				<p className="text-sm text-muted">Nhấn nút bên dưới để nghe lại</p>
				{q.audioText && <SpeakButton text={q.audioText} label="Phát âm" />}
			</div>
		);
	}

	if ((q.type === 'meaning_to_hanzi' || q.type === 'meaning_to_hanzi_typed') && q.meaningVi) {
		return (
			<div className="card-paper mx-auto min-h-[160px] w-full max-w-md p-8 text-center shadow-sm">
				<p className="label-caps text-muted">Nghĩa</p>
				<p className="mt-2 text-xl font-extrabold leading-relaxed text-foreground">{q.meaningVi}</p>
			</div>
		);
	}

	const hasVisual = !!(q.hanzi || q.pinyin);
	if (!hasVisual) return null;

	return (
		<div className="card-paper mx-auto flex min-h-[200px] w-full max-w-md flex-col items-center justify-center p-8 shadow-sm">
			{q.hanzi && <p className="hanzi-display text-6xl font-black text-foreground">{q.hanzi}</p>}
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
