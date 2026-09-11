import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ error = false, className, ...props },
	ref,
) {
	return (
		<textarea
			ref={ref}
			className={cn(
				'min-h-[120px] w-full resize-y rounded-control border bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
				error ? 'border-error' : 'border-border',
				className,
			)}
			{...props}
		/>
	);
});

export default Textarea;
