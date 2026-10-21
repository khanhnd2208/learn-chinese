'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useFocusProgress } from '@/components/layout/FocusSession';
import SpeakButton from '@/components/chinese/SpeakButton';
import QuestionRenderer from '@/components/chinese/QuestionRenderer';
import { useIncrementalSubmit } from '@/lib/chinese/useIncrementalSubmit';
import type { CnPracticeQuestionDTO, CnWordCardDTO } from '@/types/chinese';

type Phase = 'loading' | 'cards' | 'quiz' | 'done' | 'quota' | 'empty' | 'error';

interface LearnQueue {
	words: CnWordCardDTO[];
	remainingToday: number;
	totalUnintroduced: number;
}

async function readJson<T>(res: Response): Promise<T> {
	const json = await res.json() as { ok: boolean; data?: T; error?: string };
	if (!res.ok || !json.ok || !json.data) {
		throw new Error(json.error ?? 'Không tải được');
	}
	return json.data;
}

export default function LearnSessionClient() {
	const [phase, setPhase] = useState<Phase>('loading');
	const [words, setWords] = useState<CnWordCardDTO[]>([]);
	const [index, setIndex] = useState(0);
	const [questions, setQuestions] = useState<CnPracticeQuestionDTO[]>([]);
	const [learnedCount, setLearnedCount] = useState(0);
	const [remainingToday, setRemainingToday] = useState(0);
	const [error, setError] = useState('');
	const { enqueue, flushAndWait } = useIncrementalSubmit({ endpoint: '/api/review/submit' });
	useFocusProgress(words.length > 0 ? (index / words.length) * 100 : 0);

	const loadQueue = useCallback(async () => {
		setPhase('loading');
		setError('');
		try {
			const queue = await readJson<LearnQueue>(await fetch('/api/learn'));
			setRemainingToday(queue.remainingToday);
			if (queue.words.length === 0 && queue.remainingToday === 0) {
				setPhase('quota');
				return;
			}
			if (queue.words.length === 0) {
				setPhase('empty');
				return;
			}
			setWords(queue.words);
			setIndex(0);
			setPhase('cards');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không tải được');
			setPhase('error');
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			void loadQueue();
		}, 0);
		return () => clearTimeout(timer);
	}, [loadQueue]);

	const finishCards = async () => {
		setPhase('loading');
		try {
			const wordIds = words.map((word) => word.id);
			const introduced = await readJson<{ marked: number; remainingToday: number }>(await fetch('/api/learn/introduce', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ wordIds }),
			}));
			setLearnedCount(introduced.marked);
			setRemainingToday(introduced.remainingToday);
			if (introduced.marked === 0) {
				setPhase('quota');
				return;
			}
			const quiz = await readJson<{ questions: CnPracticeQuestionDTO[] }>(
				await fetch(`/api/learn/quiz?wordIds=${encodeURIComponent(wordIds.slice(0, introduced.marked).join(','))}`),
			);
			if (!quiz.questions.length) {
				setPhase('done');
				return;
			}
			setQuestions(quiz.questions);
			setPhase('quiz');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không lưu được');
			setPhase('error');
		}
	};

	const finishQuiz = async () => {
		try {
			await flushAndWait();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không lưu được kết quả');
			setPhase('error');
			return;
		}
		setPhase('done');
	};

	const word = words[index];

	if (phase === 'loading') {
		return <p className="px-4 py-16 text-center text-muted">Đang tải từ mới...</p>;
	}

	if (phase === 'error') {
		return (
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<p className="text-foreground">{error}</p>
				<button type="button" onClick={() => void loadQueue()} className="btn-secondary mt-4">
					Thử lại
				</button>
			</div>
		);
	}

	if (phase === 'quota') {
		return (
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<h1 className="text-2xl font-black text-foreground">Hôm nay đủ rồi, quay lại ngày mai</h1>
				<p className="mt-2 text-sm text-muted">Bạn đã học đủ số từ mới của hôm nay.</p>
				<Link href="/review" className="btn-primary mt-6 inline-flex">Ôn hôm nay</Link>
			</div>
		);
	}

	if (phase === 'empty') {
		return (
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<h1 className="text-2xl font-black text-foreground">Không còn từ mới</h1>
				<p className="mt-2 text-sm text-muted">Theo học thêm bộ từ để có từ chưa học.</p>
				<Link href="/sets" className="btn-primary mt-6 inline-flex">Xem bộ từ</Link>
			</div>
		);
	}

	if (phase === 'done') {
		return (
			<div className="mx-auto max-w-md px-4 py-16 text-center">
				<h1 className="text-2xl font-black text-foreground">Đã học {learnedCount} từ.</h1>
				<p className="mt-2 text-sm text-muted">Còn {remainingToday} từ mới hôm nay.</p>
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					{remainingToday > 0 ? (
						<button type="button" onClick={() => void loadQueue()} className="btn-primary">
							Học tiếp
						</button>
					) : null}
					<Link href="/review" className="btn-secondary">Ôn hôm nay</Link>
				</div>
			</div>
		);
	}

	if (phase === 'quiz') {
		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-6">
				<QuestionRenderer
					questions={questions}
					incremental
					onAnswer={enqueue}
					onComplete={() => { void finishQuiz(); }}
					onExit={() => { void finishQuiz(); }}
					exitLabel="Xong"
				/>
			</div>
		);
	}

	if (!word) return null;

	const example = word.examples[0];

	return (
		<div className="mx-auto flex w-full max-w-md flex-col px-4 py-8">
			<p className="label-caps text-center text-muted">Học từ mới · {index + 1}/{words.length}</p>
			<div className="card-paper mt-4 flex flex-col items-center gap-3 p-8 text-center">
				<p className="hanzi-display text-6xl font-black text-foreground">{word.simplified}</p>
				<SpeakButton text={word.simplified} label="Nghe" />
				<p className="text-xl font-bold text-accent">{word.pinyin}</p>
				{word.hanViet ? <p className="text-sm text-muted">{word.hanViet}</p> : null}
				<p className="text-lg font-extrabold text-foreground">{word.meaningVi}</p>
				{example ? (
					<div className="mt-2 w-full rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-left">
						<p className="hanzi-lg text-base font-bold text-foreground">{example.hanzi}</p>
						{example.pinyin ? <p className="text-sm text-accent">{example.pinyin}</p> : null}
						{example.meaningVi ? <p className="text-sm text-muted">{example.meaningVi}</p> : null}
						<div className="mt-2">
							<SpeakButton text={example.hanzi} label="Nghe câu" />
						</div>
					</div>
				) : null}
				{word.mnemonicVi ? <p className="text-sm text-foreground-secondary">{word.mnemonicVi}</p> : null}
			</div>
			<div className="mt-6 flex gap-2">
				<button
					type="button"
					onClick={() => setIndex((current) => Math.max(0, current - 1))}
					disabled={index === 0}
					className="btn-secondary flex-1 disabled:opacity-40"
				>
					Quay lại
				</button>
				<button
					type="button"
					onClick={() => {
						if (index < words.length - 1) setIndex((current) => current + 1);
						else void finishCards();
					}}
					className="btn-primary flex-1"
				>
					{index < words.length - 1 ? 'Tiếp' : 'Học các từ này'}
					<MaterialIcon name="arrow_forward" size={18} />
				</button>
			</div>
		</div>
	);
}
