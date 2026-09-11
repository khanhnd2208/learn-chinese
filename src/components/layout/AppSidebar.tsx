'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MAIN_NAV, isNavActive } from '@/config/navigation';
import { reviewBadgePressureClass, useReviewStatus } from '@/lib/chinese/useDueTodayCount';

interface Props {
	dimmed?: boolean;
}

export default function AppSidebar({ dimmed = false }: Props) {
	const pathname = usePathname();
	const { data: session } = useSession();
	const reviewStatus = useReviewStatus();

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
					const showDueBadge = item.href === '/review' && reviewStatus != null && reviewStatus.dueTotal > 0;
					const pressureClass = reviewBadgePressureClass(reviewStatus?.pressure);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={active ? 'nav-pill-active' : 'nav-pill'}
						>
							<MaterialIcon name={item.icon} filled={active} size={20} />
							<span className="flex flex-1 items-center justify-between gap-2">
								{item.label}
								{showDueBadge && (
									<span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${pressureClass}`}>
										{reviewStatus.dueTotal > 99 ? '99+' : reviewStatus.dueTotal}
									</span>
								)}
								{item.href === '/review' && reviewStatus != null && reviewStatus.dueTotal === 0 && reviewStatus.streak > 0 && (
									<span className="text-[10px] font-bold text-success">
										{reviewStatus.streak}d
									</span>
								)}
							</span>
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

				<div className="mt-4 flex items-center justify-between px-2">
					<span className="label-caps">Giao diện</span>
					<ThemeToggle />
				</div>

				<div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
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
