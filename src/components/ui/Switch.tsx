'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	label?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
	{ checked = false, onCheckedChange, label, disabled, className, ...props },
	ref,
) {
	return (
		<label
			className={cn(
				'inline-flex min-h-11 cursor-pointer items-center gap-3',
				disabled && 'cursor-not-allowed opacity-50',
				className,
			)}
		>
			<button
				ref={ref}
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label}
				disabled={disabled}
				onClick={() => onCheckedChange?.(!checked)}
				className={cn(
					'relative h-6 w-11 shrink-0 rounded-pill border border-border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
					checked ? 'bg-accent' : 'bg-surface-secondary',
				)}
				{...props}
			>
				<span
					className={cn(
						'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface shadow-elevated transition-transform duration-fast',
						checked && 'translate-x-5',
					)}
				/>
			</button>
			{label && <span className="text-sm text-foreground">{label}</span>}
		</label>
	);
});

export default Switch;
