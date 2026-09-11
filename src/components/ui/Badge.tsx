import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const VARIANT_CLASSES = {
	default: 'border-border bg-surface text-foreground-secondary',
	accent: 'border-accent/30 bg-accent-subtle text-accent',
	success: 'border-success/30 bg-success-subtle text-success',
	warning: 'border-warning/30 bg-warning/10 text-warning',
	error: 'border-error/30 bg-error/10 text-error',
} as const;

export type BadgeVariant = keyof typeof VARIANT_CLASSES;

interface Props {
	children: ReactNode;
	variant?: BadgeVariant;
	className?: string;
}

export default function Badge({ children, variant = 'default', className }: Props) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
				VARIANT_CLASSES[variant],
				className,
			)}
		>
			{children}
		</span>
	);
}
