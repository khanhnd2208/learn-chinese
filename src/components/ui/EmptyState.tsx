import Link from 'next/link';
import type { ReactNode } from 'react';
import MaterialIcon from './MaterialIcon';
import Button from './Button';
import { Card, CardContent } from './Card';

interface Props {
	icon?: string;
	title: string;
	description?: string;
	action?: { label: string; href?: string; onClick?: () => void };
	secondaryAction?: { label: string; href?: string; onClick?: () => void };
	children?: ReactNode;
}

export default function EmptyState({
	icon = 'inbox',
	title,
	description,
	action,
	secondaryAction,
	children,
}: Props) {
	return (
		<Card className="p-8 text-center">
			<CardContent className="flex flex-col items-center gap-4 p-0">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-muted">
					<MaterialIcon name={icon} size={28} />
				</div>
				<div>
					<p className="text-lg font-black text-foreground">{title}</p>
					{description && <p className="mt-1 text-sm text-muted">{description}</p>}
				</div>
				{children}
				{(action || secondaryAction) && (
					<div className="flex flex-wrap items-center justify-center gap-3">
						{action &&
							(action.href ? (
								<Link href={action.href}>
									<Button>{action.label}</Button>
								</Link>
							) : (
								<Button onClick={action.onClick}>{action.label}</Button>
							))}
						{secondaryAction &&
							(secondaryAction.href ? (
								<Link href={secondaryAction.href}>
									<Button variant="secondary">{secondaryAction.label}</Button>
								</Link>
							) : (
								<Button variant="secondary" onClick={secondaryAction.onClick}>
									{secondaryAction.label}
								</Button>
							))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
