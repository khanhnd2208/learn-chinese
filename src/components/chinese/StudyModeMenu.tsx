'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	setId: string;
}

const MODES = [
	{ href: (setId: string) => `/sets/${setId}/flashcards`, label: 'Flashcard', icon: 'style' },
	{ href: (setId: string) => `/practice/${setId}?mode=smart_mixed`, label: 'Luyện tập tự do', icon: 'shuffle' },
	{ href: (setId: string) => `/practice/${setId}?mode=mcq`, label: 'Trắc nghiệm', icon: 'quiz' },
] as const;

/** Free practice. These modes do not change the review schedule. */
export default function StudyModeMenu({ setId }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<Button
				variant="secondary"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				Cách học khác
				<MaterialIcon name="expand_more" size={18} />
			</Button>
			{open && (
				<div className="absolute left-0 z-dropdown mt-2 min-w-56 rounded-card border border-border bg-surface p-2 shadow-overlay">
					{MODES.map((mode) => (
						<Link
							key={mode.label}
							href={mode.href(setId)}
							className="flex items-center gap-2 rounded-control px-3 py-2 text-sm font-bold text-foreground hover:bg-surface-hover"
							onClick={() => setOpen(false)}
						>
							<MaterialIcon name={mode.icon} size={18} />
							{mode.label}
						</Link>
					))}
					<p className="px-3 py-2 text-xs text-muted">Không đổi lịch ôn.</p>
				</div>
			)}
		</div>
	);
}
