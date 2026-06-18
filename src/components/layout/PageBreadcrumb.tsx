import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Crumb {
	label: string;
	href?: string;
}

interface Props {
	crumbs: Crumb[];
}

export default function PageBreadcrumb({ crumbs }: Props) {
	return (
		<nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
			{crumbs.map((crumb, i) => (
				<span key={i} className="flex items-center gap-2">
					{i > 0 && <span aria-hidden>/</span>}
					{crumb.href ? (
						<Link href={crumb.href} className="flex items-center gap-1 transition-colors hover:text-accent">
							{i === 0 && <MaterialIcon name="arrow_back" size={16} />}
							{crumb.label}
						</Link>
					) : (
						<span className="font-medium text-foreground">{crumb.label}</span>
					)}
				</span>
			))}
		</nav>
	);
}
