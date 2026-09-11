'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import MaterialIcon from './MaterialIcon';

interface SheetProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	className?: string;
}

/** Bottom sheet on mobile; centered dialog on md+ */
export default function Sheet({ open, onClose, title, children, className }: SheetProps) {
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setMounted(true), 0);
		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!open || !mounted) return;
		const prev = document.activeElement as HTMLElement | null;
		panelRef.current?.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
			prev?.focus();
		};
	}, [open, onClose, mounted]);

	if (!open || !mounted) return null;

	return createPortal(
		<div className="fixed inset-0 z-overlay flex items-end justify-center md:items-center md:p-4">
			<button
				type="button"
				className="absolute inset-0 bg-foreground/40"
				aria-label="Đóng"
				onClick={onClose}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className={cn(
					'relative z-dialog w-full max-w-lg rounded-t-dialog border border-border bg-surface p-6 pb-safe shadow-overlay md:rounded-dialog animate-fade-slide-up',
					className,
				)}
			>
				<div className="mb-4 flex items-center justify-between gap-4">
					<h2 id={titleId} className="text-lg font-black text-foreground">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-control p-1 text-muted hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
						aria-label="Đóng"
					>
						<MaterialIcon name="close" size={20} />
					</button>
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}
