'use client';

import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { PRACTICE_MCQ_MODE, PRACTICE_MIX_MODE } from '@/lib/chinese/questionLabels';

interface Props {
	setId: string;
	wordId?: string;
	/** `compact` for set list cards; `full` for set detail / word card */
	variant?: 'full' | 'compact';
}

function practiceHref(setId: string, mode: string, wordId?: string): string {
	const params = new URLSearchParams({ mode });
	if (wordId) params.set('word', wordId);
	return `/practice/${setId}?${params}`;
}

export default function PracticeModePicker({
	setId,
	wordId,
	variant = 'full',
}: Props) {
	if (variant === 'compact') {
		return (
			<div className="flex flex-col gap-2">
				<Link
					href={practiceHref(setId, PRACTICE_MIX_MODE.mode, wordId)}
					className="btn-primary w-full justify-center"
				>
					<MaterialIcon name={PRACTICE_MIX_MODE.icon} size={16} />
					{PRACTICE_MIX_MODE.label}
				</Link>
				<Link
					href={practiceHref(setId, PRACTICE_MCQ_MODE.mode, wordId)}
					className="btn-secondary w-full justify-center"
				>
					<MaterialIcon name={PRACTICE_MCQ_MODE.icon} size={16} />
					{PRACTICE_MCQ_MODE.label}
				</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
			<Link
				href={practiceHref(setId, PRACTICE_MIX_MODE.mode, wordId)}
				className="btn-primary flex w-full flex-col items-start gap-0.5 px-4 py-3 sm:w-auto sm:min-w-[220px]"
			>
				<span className="flex items-center gap-2">
					<MaterialIcon name={PRACTICE_MIX_MODE.icon} size={18} />
					<span className="font-bold">{PRACTICE_MIX_MODE.label}</span>
				</span>
				<span className="text-xs font-normal opacity-90">{PRACTICE_MIX_MODE.description}</span>
			</Link>
			<Link
				href={practiceHref(setId, PRACTICE_MCQ_MODE.mode, wordId)}
				className="btn-secondary flex w-full flex-col items-start gap-0.5 px-4 py-3 sm:w-auto sm:min-w-[220px]"
			>
				<span className="flex items-center gap-2">
					<MaterialIcon name={PRACTICE_MCQ_MODE.icon} size={18} />
					<span className="font-bold">{PRACTICE_MCQ_MODE.label}</span>
				</span>
				<span className="text-xs font-normal opacity-90">{PRACTICE_MCQ_MODE.description}</span>
			</Link>
		</div>
	);
}
