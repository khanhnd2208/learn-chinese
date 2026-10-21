import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
	title: 'Quản trị — Học Hán Ngữ',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/');

	return (
		<div className="min-h-screen bg-background">
			<div className="border-b border-border bg-surface px-8 py-4">
				<div className="flex items-center justify-between gap-4">
					<p className="text-xs font-bold uppercase tracking-wider text-muted">Quản trị</p>
					<Link href="/dev/ui" className="text-xs font-bold text-accent hover:underline">
						UI Lab
					</Link>
				</div>
			</div>
			{children}
		</div>
	);
}
