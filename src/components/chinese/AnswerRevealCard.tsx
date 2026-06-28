'use client';

import {
	resolveWrongAnswerReveal,
	revealPrimaryClass,
	revealSecondaryClass,
	type RevealPrimaryKind,
} from '@/lib/chinese/questionDisplay';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

interface Props {
	question: CnPracticeQuestionDTO;
}

function RevealLine({
	kind,
	text,
	variant,
}: {
	kind: RevealPrimaryKind;
	text: string;
	variant: 'primary' | 'secondary' | 'tertiary';
}) {
	const className = variant === 'primary'
		? revealPrimaryClass(kind)
		: revealSecondaryClass(kind);

	return <p className={className}>{text}</p>;
}

function FillWordLine({
	hanzi,
	pinyin,
	meaningVi,
}: {
	hanzi: string;
	pinyin?: string;
	meaningVi?: string;
}) {
	const parts = [hanzi, pinyin, meaningVi].filter(Boolean);
	return (
		<p className="text-sm text-foreground-secondary">
			<span className="hanzi-lg font-bold text-foreground">{parts[0]}</span>
			{parts.slice(1).map((part, i) => (
				<span key={`${part}-${i}`}>
					<span className="mx-1.5 text-muted">·</span>
					<span className={i === 0 && pinyin ? 'text-accent font-medium' : 'text-muted'}>{part}</span>
				</span>
			))}
		</p>
	);
}

export default function AnswerRevealCard({ question }: Props) {
	const reveal = resolveWrongAnswerReveal(question);

	if (reveal.mode === 'sentence' && reveal.sentence) {
		return (
			<div className="mt-2 space-y-2 pl-2 text-center sm:text-left">
				<p className="hanzi-lg break-words text-lg font-bold leading-relaxed text-foreground sm:text-xl">
					{reveal.sentence.hanzi}
				</p>
				{reveal.sentence.meaningVi && (
					<p className="text-sm leading-relaxed text-muted">{reveal.sentence.meaningVi}</p>
				)}
				{reveal.fillWord && (
					<div className="rounded-lg border border-border/60 bg-surface/50 px-3 py-2">
						<p className="label-caps mb-1 text-muted">Từ điền</p>
						<FillWordLine
							hanzi={reveal.fillWord.hanzi}
							pinyin={reveal.fillWord.pinyin}
							meaningVi={reveal.fillWord.meaningVi}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="mt-2 space-y-1 pl-2 text-center sm:text-left">
			<RevealLine kind={reveal.primary.kind} text={reveal.primary.text} variant="primary" />
			{reveal.secondary && (
				<RevealLine kind={reveal.secondary.kind} text={reveal.secondary.text} variant="secondary" />
			)}
			{reveal.tertiary && (
				<RevealLine kind={reveal.tertiary.kind} text={reveal.tertiary.text} variant="tertiary" />
			)}
		</div>
	);
}
