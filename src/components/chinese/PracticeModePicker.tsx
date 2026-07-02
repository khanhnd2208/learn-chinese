'use client';

import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { PRACTICE_MIX_MODE } from '@/lib/chinese/questionLabels';

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
			<Link
				href={practiceHref(setId, PRACTICE_MIX_MODE.mode, wordId)}
				className="btn-primary w-full justify-center"
			>
				<MaterialIcon name={PRACTICE_MIX_MODE.icon} size={16} />
				{PRACTICE_MIX_MODE.label}
			</Link>
		);
	}

	return (
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
	);
}
