'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { MAIN_NAV, isNavActive } from '@/config/navigation';

interface Props {
	dimmed?: boolean;
}

export default function AppSidebar({ dimmed = false }: Props) {
	const pathname = usePathname();
	const { data: session } = useSession();

	return (
		<aside className={`fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border bg-surface md:flex ${dimmed ? 'opacity-80' : ''}`}>
			<div className="mb-8 flex items-center gap-2 px-6 pt-8">
				<Image
					src="/app-icon.png"
					alt="Học Hán Ngữ"
					width={40}
					height={40}
					className="rounded-lg border border-border"
				/>
				<div>
					<Link href="/" className="block">
						<p className="text-2xl font-black tracking-tight text-foreground">Học Hán Ngữ</p>
					</Link>
					<p className="label-caps mt-0.5">Học tập thông minh</p>
				</div>
			</div>

			<nav className="flex flex-1 flex-col gap-1">
				{MAIN_NAV.map((item) => {
					const active = isNavActive(pathname, item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={active ? 'nav-pill-active' : 'nav-pill'}
						>
							<MaterialIcon name={item.icon} filled={active} size={20} />
							{item.label}
						</Link>
					);
				})}
				{session?.user?.role === 'admin' && (
					<Link
						href="/admin"
						className={isNavActive(pathname, '/admin') ? 'nav-pill-active' : 'nav-pill'}
					>
						<MaterialIcon name="admin_panel_settings" filled={isNavActive(pathname, '/admin')} size={20} />
						Admin CMS
					</Link>
				)}
			</nav>

			<div className="px-4 pb-8">
				<Link href="/review" className="btn-primary w-full py-2.5">
					Học ngay
				</Link>

				<div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
					{session?.user ? (
						<button
							type="button"
							onClick={() => void signOut({ callbackUrl: '/login' })}
							className="nav-pill !mx-0 w-full text-left"
						>
							<MaterialIcon name="logout" size={20} />
							Đăng xuất
						</button>
					) : (
						<Link href="/login" className="nav-pill !mx-0">
							<MaterialIcon name="login" size={20} />
							Đăng nhập
						</Link>
					)}
				</div>

				{session?.user && (
					<p className="mt-4 truncate px-4 text-xs text-muted">{session.user.name}</p>
				)}
			</div>
		</aside>
	);
}
