'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { showEnglishSwitch } from '@/lib/english/access';

export default function LanguageSwitch({ always = false }: { always?: boolean }) {
	const pathname = usePathname();
	const { data } = useSession();
	if (!always && !showEnglishSwitch(data?.user?.role)) return null;
	const english = pathname === '/english' || pathname.startsWith('/english/');
	const item = (href: string, label: string, active: boolean) => (
		<Link
			href={href}
			aria-current={active ? 'page' : undefined}
			className={`rounded-pill px-3 py-1 text-xs font-bold ${active ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground'}`}
		>
			{label}
		</Link>
	);
	return (
		<div className="inline-flex rounded-pill border border-border bg-surface p-1" aria-label="Chọn ngôn ngữ">
			{item('/', 'Tiếng Trung', !english)}
			{item('/english', 'Tiếng Anh', english)}
		</div>
	);
}
