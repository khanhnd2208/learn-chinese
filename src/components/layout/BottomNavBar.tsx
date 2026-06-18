'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { BOTTOM_NAV, isNavActive } from '@/config/navigation';

interface Props {
	hidden?: boolean;
	dimmed?: boolean;
}

export default function BottomNavBar({ hidden = false, dimmed = false }: Props) {
	const pathname = usePathname();

	if (hidden) return null;

	return (
		<nav
			className={`fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t border-border bg-surface px-4 pb-safe md:hidden ${
				dimmed ? 'pointer-events-none opacity-50 grayscale' : ''
			}`}
		>
			{BOTTOM_NAV.map((item) => {
				const active = isNavActive(pathname, item.href);
				return (
					<Link
						key={item.href}
						href={item.href}
						className={`flex h-full w-full flex-col items-center justify-center tap-highlight-transparent transition-colors ${
							active
								? 'font-bold text-accent'
								: 'text-muted active:bg-surface-container'
						}`}
					>
						<MaterialIcon name={item.icon} filled={active} size={22} />
						<span className="label-caps mt-1 !text-[10px]">{item.shortLabel}</span>
					</Link>
				);
			})}
		</nav>
	);
}
