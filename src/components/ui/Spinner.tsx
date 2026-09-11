import { cn } from '@/lib/cn';

interface Props {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	label?: string;
}

const SIZE_CLASSES = {
	sm: 'h-4 w-4 border-2',
	md: 'h-5 w-5 border-2',
	lg: 'h-8 w-8 border-[3px]',
} as const;

export default function Spinner({ size = 'md', className, label = 'Đang tải' }: Props) {
	return (
		<span
			role="status"
			aria-label={label}
			className={cn(
				'inline-block animate-spin rounded-full border-current border-t-transparent',
				SIZE_CLASSES[size],
				className,
			)}
		/>
	);
}
