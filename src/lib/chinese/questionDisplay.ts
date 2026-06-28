import { isAudioQuestion, isFillSentenceQuestion } from '@/lib/chinese/questionLabels';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

export type RevealPrimaryKind = 'hanzi' | 'pinyin' | 'meaning';

export interface WrongAnswerReveal {
	mode: 'word' | 'sentence' | 'audio';
	primary: { kind: RevealPrimaryKind; text: string };
	secondary?: { kind: RevealPrimaryKind; text: string };
	tertiary?: { kind: RevealPrimaryKind; text: string };
	sentence?: {
		hanzi: string;
		meaningVi?: string;
	};
	fillWord?: {
		hanzi: string;
		pinyin?: string;
		meaningVi?: string;
	};
}

function firstMeaningSegment(meaningVi?: string): string | undefined {
	if (!meaningVi) return undefined;
	return meaningVi.split(/[;；]/)[0]?.trim() || meaningVi;
}

function resolveWordReveal(q: CnPracticeQuestionDTO): WrongAnswerReveal {
	const type = q.type;

	if (type === 'hanzi_to_meaning') {
		return {
			mode: 'word',
			primary: { kind: 'meaning', text: q.correctAnswer },
			...(q.pinyin ? { secondary: { kind: 'pinyin', text: q.pinyin } } : {}),
		};
	}

	if (type === 'meaning_to_hanzi' || type === 'meaning_to_hanzi_typed') {
		return {
			mode: 'word',
			primary: { kind: 'hanzi', text: q.correctAnswer },
			...(q.pinyin ? { secondary: { kind: 'pinyin', text: q.pinyin } } : {}),
		};
	}

	if (type === 'pinyin_to_hanzi') {
		return {
			mode: 'word',
			primary: { kind: 'hanzi', text: q.correctAnswer },
			...(q.meaningVi ? { secondary: { kind: 'meaning', text: firstMeaningSegment(q.meaningVi)! } } : {}),
		};
	}

	if (type === 'hanzi_to_pinyin' || type === 'hanzi_to_pinyin_typed') {
		return {
			mode: 'word',
			primary: { kind: 'pinyin', text: q.correctAnswer },
		};
	}

	if (type === 'audio_to_hanzi' || type === 'audio_to_hanzi_typed') {
		return {
			mode: 'audio',
			primary: { kind: 'hanzi', text: q.hanzi ?? q.correctAnswer },
			...(q.pinyin ? { secondary: { kind: 'pinyin', text: q.pinyin } } : {}),
			...(q.meaningVi ? { tertiary: { kind: 'meaning', text: firstMeaningSegment(q.meaningVi)! } } : {}),
		};
	}

	if (type === 'audio_to_meaning') {
		return {
			mode: 'audio',
			primary: { kind: 'meaning', text: q.correctAnswer },
			...(q.hanzi ? { secondary: { kind: 'hanzi', text: q.hanzi } } : {}),
			...(q.pinyin ? { tertiary: { kind: 'pinyin', text: q.pinyin } } : {}),
		};
	}

	return {
		mode: 'word',
		primary: { kind: 'hanzi', text: q.correctAnswer },
	};
}

function resolveSentenceReveal(q: CnPracticeQuestionDTO): WrongAnswerReveal {
	const completedHanzi = q.sentenceTemplate
		? q.sentenceTemplate.replace(/____|__/g, q.correctAnswer)
		: q.correctAnswer;

	const wordMeaning = firstMeaningSegment(q.meaningVi);
	const completedMeaning = q.sentenceMeaningVi && wordMeaning
		? q.sentenceMeaningVi.replace(/__/g, wordMeaning)
		: q.sentenceMeaningVi;

	return {
		mode: 'sentence',
		primary: { kind: 'hanzi', text: completedHanzi },
		sentence: {
			hanzi: completedHanzi,
			meaningVi: completedMeaning,
		},
		fillWord: {
			hanzi: q.correctAnswer,
			pinyin: q.wordPinyin,
			meaningVi: wordMeaning,
		},
	};
}

export function resolveWrongAnswerReveal(q: CnPracticeQuestionDTO): WrongAnswerReveal {
	if (isFillSentenceQuestion(q.type)) {
		return resolveSentenceReveal(q);
	}
	if (isAudioQuestion(q.type)) {
		return resolveWordReveal(q);
	}
	return resolveWordReveal(q);
}

export function hanCharCount(text: string): number {
	return [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;
}

export interface SentenceTypography {
	hanziClass: string;
	cardPadding: string;
}

export function getSentenceTypography(sentence: string): SentenceTypography {
	const count = hanCharCount(sentence.replace(/____|__/g, ''));
	if (count > 20) {
		return { hanziClass: 'text-lg leading-loose', cardPadding: 'p-4 sm:p-5' };
	}
	if (count > 14) {
		return { hanziClass: 'text-xl leading-relaxed', cardPadding: 'p-5 sm:p-6' };
	}
	return { hanziClass: 'text-2xl leading-relaxed', cardPadding: 'p-6 sm:p-8' };
}

export function completeSentenceTemplate(template: string, answer: string): string {
	return template.replace(/____|__/g, answer);
}

export function completeSentenceMeaning(template: string | undefined, wordMeaning: string | undefined): string | undefined {
	if (!template || !wordMeaning) return template;
	return template.replace(/__/g, wordMeaning);
}

export function revealPrimaryClass(kind: RevealPrimaryKind): string {
	switch (kind) {
		case 'hanzi':
			return 'hanzi-lg text-3xl sm:text-4xl font-black text-foreground';
		case 'pinyin':
			return 'text-2xl font-bold text-accent';
		case 'meaning':
			return 'text-lg sm:text-xl font-extrabold text-foreground';
	}
}

export function revealSecondaryClass(kind: RevealPrimaryKind): string {
	switch (kind) {
		case 'hanzi':
			return 'hanzi-lg text-2xl font-bold text-foreground';
		case 'pinyin':
			return 'text-sm font-medium text-accent';
		case 'meaning':
			return 'text-sm text-muted';
	}
}
