'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/layout/AppSidebar';
import BottomNavBar from '@/components/layout/BottomNavBar';
import TopAppBar from '@/components/layout/TopAppBar';
import UserMessageModal from '@/components/ui/UserMessageModal';

interface Props {
	children: React.ReactNode;
}

/** Full-focus routes: hide mobile chrome but keep sidebar navigable */
function isFocusSession(pathname: string): boolean {
	return pathname.startsWith('/practice/') || pathname === '/review' || pathname === '/hht' || pathname === '/inferno';
}

export default function AppShell({ children }: Props) {
	const pathname = usePathname();
	const focusSession = isFocusSession(pathname);

	return (
		<div className="relative min-h-screen md:pl-[var(--sidebar-width)]">
			<AppSidebar />
			{!focusSession && <TopAppBar />}
			<main className={`relative min-h-screen overflow-y-auto bg-background ${focusSession ? 'pb-8' : 'pb-24 md:pb-0'}`}>
				{children}
			</main>
			{!focusSession && <BottomNavBar />}
			<UserMessageModal />
		</div>
	);
}
