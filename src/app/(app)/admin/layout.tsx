import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Admin — Learn Chinese',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b border-border bg-surface px-8 py-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-xs font-bold uppercase tracking-wider text-muted">Admin CMS</p>
				<Link href="/dev/ui" className="text-xs font-bold text-accent hover:underline">
					UI Lab
				</Link>
			</div>
		</div>
			{children}
		</div>
	);
}
