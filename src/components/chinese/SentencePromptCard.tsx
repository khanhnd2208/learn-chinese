'use client';

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { getSentenceTypography } from '@/lib/chinese/questionDisplay';

const MEANING_PREF_KEY = 'cn.sentence.showMeaningVi';

function readShowMeaning(): boolean {
	try {
		return localStorage.getItem(MEANING_PREF_KEY) !== '0';
	} catch {
		return true;
	}
}

function writeShowMeaning(show: boolean): void {
	try {
		localStorage.setItem(MEANING_PREF_KEY, show ? '1' : '0');
	} catch {
		// Preference is optional; the question still works if storage is blocked.
	}
}

function pinyinWithTarget(sentencePinyin: string | undefined, wordPinyin: string | undefined): string {
	if (sentencePinyin && wordPinyin && /____|__/.test(sentencePinyin)) {
		return sentencePinyin.replace(/____|__/g, wordPinyin);
	}
	return sentencePinyin || wordPinyin || '';
}

interface Props {
	sentenceTemplate: string;
	sentenceMeaningVi?: string;
	pinyin?: string;
	wordPinyin?: string;
	sentenceAudioText?: string;
	audioAvailable: boolean;
	revealUsed: boolean;
	/** Parent already revealed the target pinyin, for example after a first miss. */
	forceTargetPinyin?: boolean;
	onReveal: () => void;
	/** Return false when playback did not start, so a hint is not counted. */
	onPlay: (text: string) => void | boolean;
}

export default function SentencePromptCard({
	sentenceTemplate,
	sentenceMeaningVi,
	pinyin,
	wordPinyin,
	sentenceAudioText,
	audioAvailable,
	revealUsed,
	forceTargetPinyin = false,
	onReveal,
	onPlay,
}: Props) {
	const [showPinyin, setShowPinyin] = useState(false);
	const [showTargetPinyin, setShowTargetPinyin] = useState(false);
	const [showMeaning, setShowMeaning] = useState(true);
	const { hanziClass, cardPadding } = getSentenceTypography(sentenceTemplate);
	const canHearSentence = audioAvailable && !!sentenceAudioText;
	const visiblePinyin = showTargetPinyin
		? pinyinWithTarget(pinyin, wordPinyin)
		: showPinyin
			? pinyin
			: null;

	useEffect(() => {
		setShowMeaning(readShowMeaning());
	}, []);

	useEffect(() => {
		if (forceTargetPinyin) setShowTargetPinyin(true);
	}, [forceTargetPinyin]);

	const toggleMeaning = () => {
		setShowMeaning((current) => {
			const next = !current;
			writeShowMeaning(next);
			return next;
		});
	};

	const playSentence = () => {
		if (!sentenceAudioText) return;
		const played = onPlay(sentenceAudioText);
		if (played === false || revealUsed) return;
		onReveal();
	};

	const revealTargetPinyin = () => {
		setShowTargetPinyin(true);
		if (!revealUsed) onReveal();
	};

	return (
		<div className={`card-paper animate-float mx-auto min-h-[120px] w-full max-w-md sm:max-w-lg ${cardPadding} text-center`}>
			<p className="label-caps text-muted">Câu ví dụ</p>
			<p className={`hanzi-lg mt-3 break-words font-bold text-foreground ${hanziClass}`}>
				{sentenceTemplate}
			</p>
			{sentenceMeaningVi && showMeaning && (
				<p className="mt-3 text-base leading-relaxed text-foreground">{sentenceMeaningVi}</p>
			)}
			<div className="mt-3 flex flex-col items-center gap-2">
				<div className="flex flex-wrap items-center justify-center gap-2">
					{sentenceMeaningVi && (
						<button
							type="button"
							onClick={toggleMeaning}
							className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent"
							aria-pressed={showMeaning}
						>
							<MaterialIcon name={showMeaning ? 'visibility_off' : 'visibility'} size={12} />
							{showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
						</button>
					)}
					{pinyin && (
						<button
							type="button"
							onClick={() => setShowPinyin((open) => !open)}
							className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent"
							aria-expanded={showPinyin}
						>
							<MaterialIcon name="text_fields" size={12} />
							Pinyin
						</button>
					)}
					{canHearSentence ? (
						<button
							type="button"
							onClick={playSentence}
							className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent"
						>
							<MaterialIcon name="volume_up" size={12} />
							Nghe cả câu
						</button>
					) : !audioAvailable ? (
						<button
							type="button"
							onClick={revealTargetPinyin}
							className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent"
						>
							<MaterialIcon name="text_fields" size={12} />
							Hiện pinyin từ cần điền
						</button>
					) : null}
				</div>
				{canHearSentence && (
					<p className="text-xs text-muted">Nghe sẽ giữ nguyên bậc của từ</p>
				)}
				{!canHearSentence && !audioAvailable && (
					<p className="text-xs text-muted">Hiện pinyin này sẽ giữ nguyên bậc của từ</p>
				)}
				{visiblePinyin && (
					<p className="w-full break-words text-sm font-medium leading-relaxed text-accent">{visiblePinyin}</p>
				)}
			</div>
		</div>
	);
}
