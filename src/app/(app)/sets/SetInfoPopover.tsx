'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	title: string;
	children: ReactNode;
	label?: string;
	align?: 'left' | 'right';
}

function useFinePointer(): boolean {
	const [fine, setFine] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
		const sync = () => setFine(mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	}, []);

	return fine;
}

export default function SetInfoPopover({
	title,
	children,
	label = 'Thông tin',
	align = 'left',
}: Props) {
	const finePointer = useFinePointer();
	const [open, setOpen] = useState(false);
	const [pinned, setPinned] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const openTimer = useRef<number>(0);
	const closeTimer = useRef<number>(0);
	const titleId = useId();
	const panelId = useId();

	const clearTimers = useCallback(() => {
		window.clearTimeout(openTimer.current);
		window.clearTimeout(closeTimer.current);
	}, []);

	const close = useCallback(() => {
		clearTimers();
		setOpen(false);
		setPinned(false);
	}, [clearTimers]);

	useEffect(() => {
		if (!open) return;

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) close();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.stopPropagation();
			close();
			triggerRef.current?.focus();
		};
		const onFocusIn = (event: FocusEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) close();
		};

		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('focusin', onFocusIn);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('focusin', onFocusIn);
		};
	}, [open, close]);

	useEffect(() => () => clearTimers(), [clearTimers]);

	const onMouseEnter = () => {
		if (!finePointer) return;
		window.clearTimeout(closeTimer.current);
		openTimer.current = window.setTimeout(() => setOpen(true), 80);
	};

	const onMouseLeave = () => {
		if (!finePointer || pinned) return;
		window.clearTimeout(openTimer.current);
		closeTimer.current = window.setTimeout(() => setOpen(false), 150);
	};

	const onClick = () => {
		clearTimers();
		if (open && !pinned) {
			setPinned(true);
			return;
		}
		const next = !open;
		setOpen(next);
		setPinned(next);
	};

	const onFocus = () => {
		clearTimers();
		setOpen(true);
	};

	return (
		<div
			ref={rootRef}
			className={cn('relative inline-flex', open && 'z-dropdown')}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<button
				ref={triggerRef}
				type="button"
				className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
				aria-label={label}
				aria-expanded={open}
			aria-controls={panelId}
			aria-haspopup="dialog"
			onClick={onClick}
			onFocus={onFocus}
		>
				<MaterialIcon name="info" size={20} />
			</button>
			{open && (
				<div
					id={panelId}
					role="dialog"
					aria-modal="false"
					aria-labelledby={titleId}
					className={cn(
						'absolute top-full z-dropdown pt-2',
						align === 'right' ? 'right-0' : 'left-0',
					)}
				>
					<div className="w-[min(20rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-4 text-left shadow-elevated animate-fade-slide-up">
						<p id={titleId} className="text-sm font-black text-foreground">
							{title}
						</p>
						<div className="mt-2 space-y-3 text-sm text-foreground-secondary">
							{children}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
