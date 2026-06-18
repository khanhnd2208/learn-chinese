"use client";

import { useEffect, useRef, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import SpeakButton from '@/components/chinese/SpeakButton';
import { isAudioQuestion, questionTypeLabel } from '@/lib/chinese/questionLabels';
import { useSpeech } from '@/lib/chinese/useSpeech';
import type { CnPracticeQuestionDTO, CnQuestionType } from '@/types/chinese';

export interface QuestionAnswerResult {
	wordId: string;
	questionType: CnQuestionType;
	correct: boolean;
}

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
}: Props) {
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState<string | null>(null);
	const [textAnswer, setTextAnswer] = useState('');
	const [results, setResults] = useState<QuestionAnswerResult[]>([]);
	const [feedback, setFeedback] = useState<string | null>(null);
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

	const handleExit = () => {
		if (waiting && !isExiting) return;
		void onExit?.();
	};

	const advance = (nextResults: QuestionAnswerResult[]) => {
		setFeedback(null);
		setSelected(null);
		setTextAnswer('');
		if (idx + 1 >= questions.length) onComplete?.(nextResults);
		else setIdx(idx + 1);
	};

	const submitAnswer = (answer: string, skipped = false) => {
		const correct = !skipped && answer.trim() === q.correctAnswer.trim();
		const item: QuestionAnswerResult = { wordId: q.wordId, questionType: q.type, correct };
		const next = [...results, item];
		setResults(next);
		onAnswer?.(item);
		setFeedback(
			skipped ? 'Đã bỏ qua' :
			correct ? 'Đúng!' : `Sai — đáp án: ${q.correctAnswer}`,
		);
		setTimeout(() => advance(next), skipped ? 600 : 1200);
	};

	const progressLabel = sessionProgress
		? `Đã ôn ${sessionProgress.reviewed} · còn ~${Math.max(0, sessionProgress.dueRemaining)}`
		: `Câu ${idx + 1} / ${questions.length}`;

	const resolvedExitLabel = exitLabel ?? (incremental ? 'Dừng & lưu' : 'Thoát');

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
					<span className="label-caps text-muted">{questionTypeLabel(q.type)}</span>
				</div>
			)}

			<div className="mb-8 flex flex-col gap-2">
				<div className="flex items-center justify-between label-caps text-foreground-secondary">
					<span>{progressLabel}</span>
					{sessionProgress && (
						<span className="text-muted">Câu {idx + 1}/{questions.length}</span>
					)}
					{!onExit && !sessionProgress && <span>{questionTypeLabel(q.type)}</span>}
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
			) : (
				<div>
					<input
						value={textAnswer}
						onChange={(e) => setTextAnswer(e.target.value)}
						disabled={waiting}
						placeholder="Nhập đáp án..."
						inputMode="text"
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
						className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
						onKeyDown={(e) => e.key === 'Enter' && textAnswer && submitAnswer(textAnswer)}
					/>
					<button
						type="button"
						disabled={!textAnswer || waiting}
						onClick={() => submitAnswer(textAnswer)}
						className="btn-primary mt-3 disabled:opacity-50"
					>
						Trả lời
					</button>
				</div>
			)}

			{feedback && (
				<p className={`mt-6 text-center text-sm font-bold ${
					feedback.startsWith('Đúng') ? 'text-success' :
					feedback.startsWith('Đã bỏ') ? 'text-muted' :
					'text-accent'
				}`}>
					{feedback}
				</p>
			)}

			<div className={`mt-8 flex items-center justify-between ${audioOnly ? 'sticky bottom-2 z-10 rounded-xl border border-border bg-background/95 p-3 backdrop-blur-sm' : ''}`}>
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

	if (q.type === 'meaning_to_hanzi' || (q.type === 'similar_char' && q.meaningVi)) {
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

	if (q.type === 'sentence_order') {
		return null;
	}

	if (q.type === 'translate_sentence' && q.meaningVi) {
		return (
			<div className="card-paper mx-auto max-w-md p-6 text-center shadow-sm">
				<p className="label-caps text-muted">Dịch sang tiếng Trung</p>
				<p className="mt-2 text-lg font-extrabold text-foreground">{q.meaningVi}</p>
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
