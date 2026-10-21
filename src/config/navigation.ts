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
	{ href: '/review', label: 'Luyện SRS', icon: 'history', shortLabel: 'SRS' },
	{ href: '/learn', label: 'Học từ mới', icon: 'school', shortLabel: 'Học mới' },
	{ href: '/dashboard', label: 'Báo cáo học tập', icon: 'trending_up', shortLabel: 'Báo cáo' },
];

export const BOTTOM_NAV: NavLink[] = [
	{ href: '/', label: 'Trang chủ', icon: 'home', shortLabel: 'Home' },
	{ href: '/sets', label: 'Luyện tập', icon: 'menu_book', shortLabel: 'Luyện tập' },
	{ href: '/review', label: 'Luyện SRS', icon: 'refresh', shortLabel: 'SRS' },
	{ href: '/learn', label: 'Học từ mới', icon: 'school', shortLabel: 'Học mới' },
	{ href: '/dashboard', label: 'Báo cáo học tập', icon: 'query_stats', shortLabel: 'Báo cáo' },
];

/** HHT và Địa Ngục. Route và dữ liệu giữ nguyên. Đặt NEXT_PUBLIC_EXPERIMENTAL_MODES=0 để ẩn cả mục này. */
export const EXPERIMENTAL_NAV: NavLink = {
	href: '/experiments',
	label: 'Thử nghiệm',
	icon: 'science',
	shortLabel: 'Thử nghiệm',
};

export function experimentalModesVisible(): boolean {
	return process.env.NEXT_PUBLIC_EXPERIMENTAL_MODES !== '0';
}

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname.startsWith(href);
}
