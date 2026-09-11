import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
	label: string;
	hint?: string;
	error?: string;
	required?: boolean;
	children: ReactNode;
	className?: string;
}

export default function FormField({ label, hint, error, required, children, className }: Props) {
	const id = useId();
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;

	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			<label htmlFor={id} className="text-sm font-bold text-foreground-secondary">
				{label}
				{required && <span className="text-error"> *</span>}
			</label>
			<div
				aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
				aria-invalid={error ? true : undefined}
			>
				{children}
			</div>
			{hint && !error && (
				<p id={hintId} className="text-xs text-muted">
					{hint}
				</p>
			)}
			{error && (
				<p id={errorId} className="text-xs font-medium text-error" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
