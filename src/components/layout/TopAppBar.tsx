'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { showEnglishSwitch } from '@/lib/english/access';
import { ADMIN_NAV, EXPERIMENTAL_NAV, experimentalModesVisible } from '@/config/navigation';

export default function TopAppBar() {
	const { data: session } = useSession();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [menuOpen]);

	const isAdmin = session?.user?.role === 'admin';

	return (
		<header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-border bg-background px-6 md:hidden">
			<div className="flex w-full items-center justify-between">
				<div className="flex items-center gap-2">
					<Image
						src="/app-icon.png"
						alt=""
						width={32}
						height={32}
						className="rounded-md border border-border"
					/>
					<span className="text-2xl font-black tracking-tighter text-accent">Học Hán Ngữ</span>
				</div>
				<div className="flex items-center gap-3">
					<ThemeToggle />
					<div className="relative" ref={menuRef}>
						<button
							type="button"
							onClick={() => setMenuOpen(!menuOpen)}
							className="tap-highlight-transparent rounded-full transition-opacity hover:opacity-80"
							aria-label="Menu tài khoản"
							aria-expanded={menuOpen}
						>
							{session?.user?.image ? (
								<Image
									src={session.user.image}
									alt="Ảnh đại diện"
									width={32}
									height={32}
									className="rounded-full border border-border object-cover"
								/>
							) : (
								<div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-dim">
									<MaterialIcon name="person" size={18} />
								</div>
							)}
						</button>
						{menuOpen && (
							<div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-lg border border-border bg-surface py-1 shadow-lg">
								{session?.user?.name && (
									<p className="truncate border-b border-border px-4 py-2 text-xs text-muted">
										{session.user.name}
									</p>
								)}
								{showEnglishSwitch(session?.user?.role) && (
									<Link
										href="/english"
										className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent"
										onClick={() => setMenuOpen(false)}
									>
										<MaterialIcon name="translate" size={18} />
										Tiếng Anh
									</Link>
								)}
								{experimentalModesVisible() && (
									<Link
										href={EXPERIMENTAL_NAV.href}
										className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent"
										onClick={() => setMenuOpen(false)}
									>
										<MaterialIcon name={EXPERIMENTAL_NAV.icon} size={18} />
										{EXPERIMENTAL_NAV.label}
									</Link>
								)}
								{isAdmin && ADMIN_NAV.map((item) => (
									<Link
										key={item.href}
										href={item.href}
										className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent"
										onClick={() => setMenuOpen(false)}
									>
										<MaterialIcon name={item.icon} size={18} />
										{item.label}
									</Link>
								))}
								{session?.user ? (
									<button
										type="button"
										onClick={() => void signOut({ callbackUrl: '/login' })}
										className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent"
									>
										<MaterialIcon name="logout" size={18} />
										Đăng xuất
									</button>
								) : (
									<Link
										href="/login"
										className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-accent"
										onClick={() => setMenuOpen(false)}
									>
										<MaterialIcon name="login" size={18} />
										Đăng nhập
									</Link>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
