'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/layout/AppSidebar';
import BottomNavBar from '@/components/layout/BottomNavBar';
import { FocusSessionBar, FocusSessionProvider } from '@/components/layout/FocusSession';
import TopAppBar from '@/components/layout/TopAppBar';
import UserMessageModal from '@/components/ui/UserMessageModal';

interface Props {
	children: React.ReactNode;
}

/** Full-focus routes hide the sidebar and both nav bars. */
function isFocusSession(pathname: string): boolean {
	return pathname.startsWith('/practice/')
		|| pathname === '/review'
		|| pathname === '/learn'
		|| pathname === '/hht'
		|| pathname === '/inferno'
		|| /\/sets\/[^/]+\/flashcards$/.test(pathname);
}

export default function AppShell({ children }: Props) {
	const pathname = usePathname();
	const focusSession = isFocusSession(pathname);

	return (
		<FocusSessionProvider>
			<div className={`relative min-h-screen ${focusSession ? '' : 'md:pl-[var(--sidebar-width)]'}`}>
				{!focusSession && <AppSidebar />}
				{focusSession ? <FocusSessionBar /> : <TopAppBar />}
				<main className={`relative min-h-screen overflow-y-auto bg-background ${focusSession ? 'pb-8' : 'pb-24 md:pb-0'}`}>
					{children}
				</main>
				{!focusSession && <BottomNavBar />}
				<UserMessageModal />
			</div>
		</FocusSessionProvider>
	);
}
