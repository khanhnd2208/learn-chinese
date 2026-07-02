export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Trang chủ', icon: 'home', shortLabel: 'Home' },
	{ href: '/sets', label: 'Bộ từ', icon: 'library_books', shortLabel: 'Sets' },
	{ href: '/shared-sets', label: 'Chia sẻ bộ từ', icon: 'share', shortLabel: 'Chia sẻ' },
	{ href: '/hanzi-lab', label: 'Hanzi Lab', icon: 'science', shortLabel: 'Lab' },
	{ href: '/review', label: 'Luyện SRS', icon: 'history', shortLabel: 'SRS' },
	{ href: '/inferno', label: 'Địa Ngục', icon: 'local_fire_department', shortLabel: 'Inferno' },
	{ href: '/dashboard', label: 'Báo cáo học tập', icon: 'trending_up', shortLabel: 'Báo cáo' },
];

export const BOTTOM_NAV: NavLink[] = [
	{ href: '/', label: 'Trang chủ', icon: 'home', shortLabel: 'Home' },
	{ href: '/sets', label: 'Luyện tập', icon: 'menu_book', shortLabel: 'Luyện tập' },
	{ href: '/review', label: 'Luyện SRS', icon: 'refresh', shortLabel: 'SRS' },
	{ href: '/inferno', label: 'Địa Ngục', icon: 'local_fire_department', shortLabel: 'Địa ngục' },
	{ href: '/dashboard', label: 'Báo cáo học tập', icon: 'query_stats', shortLabel: 'Báo cáo' },
];

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname.startsWith(href);
}
