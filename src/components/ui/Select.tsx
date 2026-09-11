import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
	{ error = false, className, children, ...props },
	ref,
) {
	return (
		<select
			ref={ref}
			className={cn(
				'h-10 w-full rounded-control border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
				error ? 'border-error' : 'border-border',
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
});

export default Select;
