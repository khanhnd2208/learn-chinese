import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
	label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ label, className, id, ...props },
	ref,
) {
	const inputId = id ?? (label ? `checkbox-${label.replace(/\s/g, '-')}` : undefined);

	return (
		<label
			htmlFor={inputId}
			className={cn(
				'inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground',
				props.disabled && 'cursor-not-allowed opacity-50',
				className,
			)}
		>
			<input
				ref={ref}
				id={inputId}
				type="checkbox"
				className="h-4 w-4 shrink-0 rounded border-border accent-accent focus-visible:ring-2 focus-visible:ring-accent"
				{...props}
			/>
			{label && <span>{label}</span>}
		</label>
	);
});

export default Checkbox;
