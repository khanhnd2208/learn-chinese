import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Admin — Learn Chinese',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b border-border bg-surface px-8 py-4">
				<p className="text-xs font-bold uppercase tracking-wider text-muted">Admin CMS</p>
			</div>
			{children}
		</div>
	);
}
