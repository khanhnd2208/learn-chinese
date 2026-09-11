import { cn } from '@/lib/cn';

interface Props {
	className?: string;
	lines?: number;
}

export default function Skeleton({ className, lines = 1 }: Props) {
	if (lines === 1) {
		return (
			<div
				className={cn('animate-pulse rounded-control bg-surface-secondary', className)}
				aria-hidden
			/>
		);
	}

	return (
		<div className={cn('space-y-2', className)} aria-hidden>
			{Array.from({ length: lines }, (_, i) => (
				<div
					key={i}
					className="h-4 animate-pulse rounded-control bg-surface-secondary"
					style={{ width: i === lines - 1 ? '70%' : '100%' }}
				/>
			))}
		</div>
	);
}
