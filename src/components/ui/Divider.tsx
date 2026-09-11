import { cn } from '@/lib/cn';

interface Props {
	className?: string;
	orientation?: 'horizontal' | 'vertical';
}

export default function Divider({ className, orientation = 'horizontal' }: Props) {
	return (
		<hr
			className={cn(
				'border-0 bg-border',
				orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
				className,
			)}
			role="separator"
		/>
	);
}
