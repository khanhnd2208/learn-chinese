import { cn } from '@/lib/cn';

interface CardProps {
	children: React.ReactNode;
	className?: string;
	interactive?: boolean;
}

export function Card({ children, className, interactive = false }: CardProps) {
	return (
		<div
			className={cn(
				'rounded-card border border-border bg-surface',
				interactive && 'transition-colors hover:border-accent',
				className,
			)}
		>
			{children}
		</div>
	);
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('flex flex-col gap-1 p-4 pb-0', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
	return <h3 className={cn('text-lg font-black text-foreground', className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
	return <p className={cn('text-sm text-muted', className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('flex items-center gap-2 border-t border-border p-4', className)}>{children}</div>;
}
