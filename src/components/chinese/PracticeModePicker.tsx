'use client';

import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import {
	PRACTICE_LEVEL_MODES,
	PRACTICE_MIX_MODE,
} from '@/lib/chinese/questionLabels';

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
			<div className="flex w-full flex-col gap-2">
				<Link
					href={practiceHref(setId, PRACTICE_MIX_MODE.mode, wordId)}
					className="btn-primary w-full justify-center"
				>
					<MaterialIcon name={PRACTICE_MIX_MODE.icon} size={16} />
					{PRACTICE_MIX_MODE.label}
				</Link>
				<div className="grid grid-cols-2 gap-1.5">
					{PRACTICE_LEVEL_MODES.map((m) => (
						<Link
							key={m.mode}
							href={practiceHref(setId, m.mode, wordId)}
							className="btn-secondary flex-col gap-0.5 px-2 py-2 text-xs leading-tight"
						>
							<span className="flex items-center gap-1 font-bold">
								<MaterialIcon name={m.icon} size={14} />
								{m.label}
							</span>
						</Link>
					))}
				</div>
				<p className="text-center text-[10px] text-muted">Theo level SRS · không ảnh hưởng lịch ôn</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
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

			<div>
				<p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
					Theo level độ khó SRS
				</p>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{PRACTICE_LEVEL_MODES.map((m) => (
						<Link
							key={m.mode}
							href={practiceHref(setId, m.mode, wordId)}
							className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:border-accent hover:bg-surface-hover"
						>
							<span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
								<MaterialIcon name={m.icon} size={16} className="text-accent" />
								{m.label}
							</span>
							<span className="text-xs leading-snug text-muted">{m.description}</span>
						</Link>
					))}
				</div>
				<p className="mt-2 text-xs text-muted">
					Mỗi level xen 3 kênh (nghĩa, âm đọc, câu). Luyện tập không thay đổi lịch SRS.
				</p>
			</div>
		</div>
	);
}
