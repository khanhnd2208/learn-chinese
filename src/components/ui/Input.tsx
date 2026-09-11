import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputSize = 'sm' | 'md';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	inputSize?: InputSize;
	error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ inputSize = 'md', error = false, className, ...props },
	ref,
) {
	return (
		<input
			ref={ref}
			className={cn(
				'w-full rounded-control border bg-surface text-sm text-foreground transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
				inputSize === 'sm' ? 'h-9 px-3' : 'h-10 px-3',
				error ? 'border-error' : 'border-border',
				className,
			)}
			{...props}
		/>
	);
});

export default Input;
