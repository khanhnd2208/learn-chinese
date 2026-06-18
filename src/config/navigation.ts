export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Trang chủ', icon: 'home', shortLabel: 'Home' },
	{ href: '/sets', label: 'Bộ từ', icon: 'library_books', shortLabel: 'Sets' },
	{ href: '/hanzi-lab', label: 'Hanzi Lab', icon: 'science', shortLabel: 'Lab' },
	{ href: '/review', label: 'Ôn tập', icon: 'history', shortLabel: 'Review' },
	{ href: '/dashboard', label: 'Tiến bộ', icon: 'trending_up', shortLabel: 'Progress' },
];

export const BOTTOM_NAV: NavLink[] = [
	{ href: '/', label: 'Trang chủ', icon: 'home', shortLabel: 'Home' },
	{ href: '/review', label: 'Ôn tập', icon: 'refresh', shortLabel: 'Review' },
	{ href: '/sets', label: 'Bộ từ', icon: 'menu_book', shortLabel: 'Sets' },
	{ href: '/dashboard', label: 'Tiến bộ', icon: 'query_stats', shortLabel: 'Progress' },
];

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname.startsWith(href);
}
