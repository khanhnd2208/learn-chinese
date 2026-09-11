import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import Spinner from './Spinner';

const VARIANT_CLASSES = {
	primary:
		'bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.98]',
	secondary:
		'border border-border bg-transparent text-foreground-secondary hover:border-accent hover:text-accent',
	tertiary:
		'bg-surface-container text-foreground hover:bg-surface-hover',
	destructive:
		'bg-error text-white hover:bg-error/90',
	ghost:
		'text-foreground-secondary hover:bg-surface-hover hover:text-foreground',
	link: 'text-accent underline-offset-4 hover:underline p-0 h-auto',
} as const;

const SIZE_CLASSES = {
	sm: 'h-8 px-3 text-[10px]',
	md: 'h-10 px-4 text-xs',
	lg: 'h-12 px-6 text-sm',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;
export type ButtonSize = keyof typeof SIZE_CLASSES;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = 'primary',
		size = 'md',
		loading = false,
		leftIcon,
		rightIcon,
		fullWidth = false,
		disabled,
		className,
		children,
		type = 'button',
		...props
	},
	ref,
) {
	const isDisabled = disabled || loading;
	const isLink = variant === 'link';

	return (
		<button
			ref={ref}
			type={type}
			disabled={isDisabled}
			className={cn(
				'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
				!isLink && 'rounded-pill',
				!isLink && SIZE_CLASSES[size],
				VARIANT_CLASSES[variant],
				fullWidth && 'w-full',
				className,
			)}
			{...props}
		>
			{loading ? <Spinner size="sm" className={variant === 'primary' ? 'text-accent-foreground' : 'text-accent'} /> : leftIcon}
			{children}
			{!loading && rightIcon}
		</button>
	);
});

export default Button;
