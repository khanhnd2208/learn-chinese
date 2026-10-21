export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Learner navigation. The sidebar and the mobile bottom bar both use this list. */
export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Hôm nay', icon: 'home', shortLabel: 'Hôm nay' },
	{ href: '/review', label: 'Ôn tập', icon: 'history', shortLabel: 'Ôn tập' },
	{ href: '/library', label: 'Thư viện', icon: 'library_books', shortLabel: 'Thư viện' },
	{ href: '/explore', label: 'Khám phá', icon: 'explore', shortLabel: 'Khám phá' },
	{ href: '/dashboard', label: 'Tiến độ', icon: 'trending_up', shortLabel: 'Tiến độ' },
];

/** @deprecated Use MAIN_NAV. Kept so older imports stay valid. */
export const BOTTOM_NAV = MAIN_NAV;

export const ADMIN_NAV: NavLink[] = [
	{ href: '/admin/sets', label: 'Bộ từ', icon: 'library_books', shortLabel: 'Bộ từ' },
	{ href: '/admin', label: 'Nội dung', icon: 'edit_note', shortLabel: 'Nội dung' },
	{ href: '/admin/analytics', label: 'Phân tích', icon: 'analytics', shortLabel: 'Phân tích' },
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
	if (href === '/' || href === '/admin') return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}
