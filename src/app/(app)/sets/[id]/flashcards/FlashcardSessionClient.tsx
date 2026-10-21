'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFocusProgress } from '@/components/layout/FocusSession';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { useSpeech } from '@/lib/chinese/useSpeech';
import {
	highlightTargetSegments,
	nextExampleIndex,
	shuffleArray,
} from '@/lib/chinese/flashcardExamples';
import type { FlashcardCardDTO, FlashcardDeckDTO } from '@/types/chinese';

interface Props {
	deck: FlashcardDeckDTO;
}

function SpeakControl({
	label,
	speaking,
	supported,
	onPlay,
}: {
	label: string;
	speaking: boolean;
	supported: boolean;
	onPlay: () => void;
}) {
	if (!supported) {
		return <p data-no-flip className="text-xs text-muted">Trình duyệt không hỗ trợ phát âm</p>;
	}

	return (
		<Button
			data-no-flip
			type="button"
			variant="secondary"
			size="lg"
			onClick={(event) => {
				event.stopPropagation();
				onPlay();
			}}
			disabled={speaking}
			leftIcon={<MaterialIcon name="volume_up" size={20} />}
			aria-label={label}
		>
			{speaking ? 'Đang phát...' : label}
		</Button>
	);
}

export default function FlashcardSessionClient({ deck }: Props) {
	const { toast } = useToast();
	const { supported, speaking, failed, speak, stop } = useSpeech();
	const [cards, setCards] = useState<FlashcardCardDTO[]>(deck.cards);
	const [index, setIndex] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [done, setDone] = useState(false);
	const [exampleIndexByCardId, setExampleIndexByCardId] = useState<Record<string, number>>({});
	useFocusProgress(cards.length > 0 ? ((done ? cards.length : index) / cards.length) * 100 : 0);

	const card = cards[index];
	const exampleIndex = card ? exampleIndexByCardId[card.id] ?? 0 : 0;
	const example = card?.examples[exampleIndex] ?? null;
	const exampleSegments = useMemo(
		() => (card && example
			? highlightTargetSegments(example.hanzi, card.simplified, example.targetWordStart, example.targetWordEnd)
			: []),
		[card, example],
	);

	useEffect(() => {
		if (failed) toast('Không phát được âm thanh', 'error');
	}, [failed, toast]);

	useEffect(() => () => stop(), [stop]);

	const playChinese = useCallback((text: string) => {
		if (!supported) {
			toast('Trình duyệt không hỗ trợ phát âm', 'error');
			return;
		}
		if (!speak(text)) toast('Không phát được âm thanh', 'error');
	}, [speak, supported, toast]);

	const goToIndex = useCallback((nextIndex: number) => {
		stop();
		setIndex(nextIndex);
		setFlipped(false);
		setDone(false);
	}, [stop]);

	const flip = useCallback(() => {
		setFlipped((current) => !current);
	}, []);

	const goPrev = useCallback(() => {
		if (index <= 0) return;
		goToIndex(index - 1);
	}, [goToIndex, index]);

	const goNext = useCallback(() => {
		if (index >= cards.length - 1) {
			stop();
			setDone(true);
			setFlipped(false);
			return;
		}
		goToIndex(index + 1);
	}, [cards.length, goToIndex, index, stop]);

	const restart = useCallback(() => {
		stop();
		setCards(deck.cards);
		setIndex(0);
		setFlipped(false);
		setDone(false);
		setExampleIndexByCardId({});
	}, [deck.cards, stop]);

	const shuffleCards = useCallback(() => {
		if (!card) return;
		const shuffled = shuffleArray(cards);
		const nextIndex = Math.max(0, shuffled.findIndex((item) => item.id === card.id));
		stop();
		setCards(shuffled);
		setIndex(nextIndex);
		setFlipped(false);
	}, [card, cards, stop]);

	const cycleExample = useCallback(() => {
		if (!card || card.examples.length < 2) return;
		stop();
		setExampleIndexByCardId((current) => ({
			...current,
			[card.id]: nextExampleIndex(current[card.id] ?? 0, card.examples.length),
		}));
	}, [card, stop]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey || event.ctrlKey || event.metaKey) return;
			const tag = (event.target as HTMLElement | null)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

			if (done) {
				if (event.key === 'Enter') restart();
				return;
			}

			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				goPrev();
				return;
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				goNext();
				return;
			}
			if (event.key === ' ' || event.key === 'Enter') {
				if ((event.target as HTMLElement | null)?.closest('button, a')) return;
				event.preventDefault();
				flip();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [done, flip, goNext, goPrev, restart]);

	if (cards.length === 0) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
				<EmptyState
					icon="style"
					title="Chưa có thẻ học được"
					description={
						deck.skippedCount > 0
							? `${deck.skippedCount} mục chưa học được vì thiếu chữ Trung, pinyin hoặc nghĩa.`
							: 'Bộ từ này chưa có từ đủ dữ liệu để học flashcard.'
					}
					action={{ label: 'Về bộ từ', href: `/sets/${deck.setId}` }}
				/>
			</div>
		);
	}

	if (done) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
				<EmptyState
					icon="check_circle"
					title="Đã hết bộ flashcard"
					description={`Bạn đã xem ${cards.length} thẻ trong “${deck.title}”.`}
					action={{ label: 'Học lại', onClick: restart }}
					secondaryAction={{ label: 'Về bộ từ', href: `/sets/${deck.setId}` }}
				/>
			</div>
		);
	}

	if (!card) return null;

	return (
		<div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6 pb-safe md:px-8">
			<header className="flex items-center justify-between gap-3">
				<Link
					href={`/sets/${deck.setId}`}
					className="flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
				>
					<MaterialIcon name="arrow_back" size={16} />
					Bộ từ
				</Link>
				<div className="min-w-0 text-center">
					<p className="truncate text-sm font-bold text-foreground">{deck.title}</p>
					<p className="text-xs text-muted" aria-live="polite">
						{index + 1} / {cards.length}
					</p>
				</div>
				<Button
					variant="ghost"
					size="lg"
					aria-label="Xáo trộn"
					onClick={shuffleCards}
					leftIcon={<MaterialIcon name="shuffle" size={20} />}
				>
					<span className="hidden sm:inline">Xáo trộn</span>
				</Button>
			</header>

			{deck.skippedCount > 0 && (
				<p className="rounded-control border border-border bg-surface-container/60 px-3 py-2 text-xs text-muted">
					{deck.skippedCount} mục chưa học được vì thiếu dữ liệu liên kết, chữ Trung, pinyin hoặc nghĩa.
				</p>
			)}

			<div className="flex flex-1 items-center">
				<div
					className="w-full cursor-pointer tap-highlight-transparent"
					onClick={(event) => {
						if ((event.target as HTMLElement).closest('[data-no-flip], button, a')) return;
						flip();
					}}
					onKeyDown={(event) => {
						if (event.key !== 'Enter' && event.key !== ' ') return;
						if ((event.target as HTMLElement).closest('button, a')) return;
						event.preventDefault();
						flip();
					}}
					role="group"
					aria-label="Thẻ flashcard, chạm để lật"
				>
				<Card className="border-t-4 border-t-accent bg-surface">
					<div
						key={`${card.id}-${flipped ? 'back' : 'front'}`}
						className="flex min-h-80 max-h-[70vh] flex-col justify-center gap-6 overflow-y-auto p-6 text-center animate-fade-slide-up sm:min-h-96 sm:p-8"
					>
						{!flipped ? (
							<>
								<p className="label-caps">Mặt trước</p>
								<p className="hanzi-display text-foreground" lang="zh-Hans">{card.simplified}</p>
								<p className="text-lg font-bold text-accent">{card.pinyin}</p>
								<div className="flex justify-center">
									<SpeakControl
										label="Nghe từ"
										speaking={speaking}
										supported={supported}
										onPlay={() => playChinese(card.simplified)}
									/>
								</div>
								<p className="text-xs text-muted">Chạm vào thẻ để lật</p>
							</>
						) : (
							<>
								<p className="label-caps">Mặt sau</p>
								<p className="text-2xl font-black text-foreground sm:text-3xl">{card.meaningVi}</p>
								<div className="border-t border-border pt-4">
									{example ? (
										<div className="space-y-3">
											<p className="hanzi-lg text-2xl font-bold text-foreground sm:text-3xl" lang="zh-Hans">
												{exampleSegments.map((segment, segmentIndex) => (
													segment.highlight ? (
														<mark
															key={`${segment.text}-${segmentIndex}`}
															className="rounded-control bg-accent-subtle px-1 text-accent"
														>
															{segment.text}
														</mark>
													) : (
														<span key={`${segment.text}-${segmentIndex}`}>{segment.text}</span>
													)
												))}
											</p>
											<p className="text-sm font-medium text-accent">{example.pinyin}</p>
											{example.meaningVi ? (
												<p className="text-sm text-foreground-secondary">{example.meaningVi}</p>
											) : null}
											<div className="flex flex-wrap items-center justify-center gap-2">
												<SpeakControl
													label="Nghe câu"
													speaking={speaking}
													supported={supported}
													onPlay={() => playChinese(example.hanzi)}
												/>
												{card.examples.length > 1 && (
													<Button
														data-no-flip
														type="button"
														variant="tertiary"
														size="lg"
														onClick={(event) => {
															event.stopPropagation();
															cycleExample();
														}}
													>
														Đổi ví dụ
													</Button>
												)}
											</div>
										</div>
									) : (
										<p className="text-sm text-muted">Chưa có câu ví dụ đầy đủ</p>
									)}
								</div>
								<p className="text-xs text-muted">Chạm vào thẻ để xem từ</p>
							</>
						)}
					</div>
				</Card>
				</div>
			</div>

			<div className="space-y-3">
				<div className="grid grid-cols-3 gap-2">
					<Button variant="secondary" size="lg" className="px-2 sm:px-6" onClick={goPrev} disabled={index === 0} fullWidth>
						Trước
					</Button>
					<Button size="lg" className="px-2 sm:px-6" onClick={flip} fullWidth>
						Lật thẻ
					</Button>
					<Button variant="secondary" size="lg" className="px-2 sm:px-6" onClick={goNext} fullWidth>
						Tiếp
					</Button>
				</div>
				<p className={cn('hidden text-center text-xs text-muted md:block')}>
					Phím: ← Trước · Space lật thẻ · → Tiếp
				</p>
			</div>
		</div>
	);
}
