interface Props {
	value: number;
	max?: number;
	className?: string;
	barClassName?: string;
}

export default function ProgressBar({ value, max = 100, className = '', barClassName = 'bg-accent' }: Props) {
	const pct = Math.min(100, Math.max(0, (value / max) * 100));
	return (
		<div className={`h-2 w-full overflow-hidden rounded-full border border-border/50 bg-accent-subtle ${className}`}>
			<div
				className={`h-full rounded-full transition-all duration-500 ease-out ${barClassName}`}
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}
