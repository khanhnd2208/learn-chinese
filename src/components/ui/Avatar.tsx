import Image from 'next/image';
import { cn } from '@/lib/cn';

interface Props {
	src?: string | null;
	alt?: string;
	name?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const SIZE_MAP = { sm: 32, md: 40, lg: 48 } as const;

export default function Avatar({ src, alt = '', name, size = 'md', className }: Props) {
	const px = SIZE_MAP[size];
	const initials = name
		?.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<div
			className={cn(
				'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-container font-bold text-accent',
				size === 'sm' && 'h-8 w-8 text-xs',
				size === 'md' && 'h-10 w-10 text-sm',
				size === 'lg' && 'h-12 w-12 text-base',
				className,
			)}
			aria-hidden={!alt && !name}
		>
			{src ? (
				<Image src={src} alt={alt} width={px} height={px} className="h-full w-full object-cover" />
			) : (
				<span>{initials ?? '?'}</span>
			)}
		</div>
	);
}
