'use client';

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { getSentenceTypography } from '@/lib/chinese/questionDisplay';

interface Props {
	sentenceTemplate: string;
	sentenceMeaningVi?: string;
	pinyin?: string;
	onRevealPinyin?: () => void;
}

export default function SentencePromptCard({
	sentenceTemplate,
	sentenceMeaningVi,
	pinyin,
	onRevealPinyin,
}: Props) {
	const [showPinyin, setShowPinyin] = useState(false);
	const { hanziClass, cardPadding } = getSentenceTypography(sentenceTemplate);

	return (
		<div className={`card-paper animate-float mx-auto min-h-[120px] w-full max-w-md sm:max-w-lg ${cardPadding} text-center`}>
			<p className="label-caps text-muted">Câu ví dụ</p>
			<p className={`hanzi-lg mt-3 break-words font-bold text-foreground ${hanziClass}`}>
				{sentenceTemplate}
			</p>
			{sentenceMeaningVi && (
				<p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">{sentenceMeaningVi}</p>
			)}
			{pinyin && (
				<div className="mt-3 flex flex-col items-center gap-2">
					<button
						type="button"
						onClick={() => {
							if (!showPinyin) onRevealPinyin?.();
							setShowPinyin((open) => !open);
						}}
						className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent"
						aria-expanded={showPinyin}
					>
						<MaterialIcon name="text_fields" size={12} />
						Pinyin
					</button>
					{showPinyin && (
						<p className="w-full break-words text-sm font-medium leading-relaxed text-accent">{pinyin}</p>
					)}
				</div>
			)}
		</div>
	);
}
