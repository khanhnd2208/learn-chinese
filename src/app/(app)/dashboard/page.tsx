import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import LearningReportTabs from '@/components/chinese/LearningReportTabs';
import SrsReportPanel from '@/components/chinese/SrsReportPanel';
import { auth } from '@/lib/auth';
import { getChineseDashboard } from '@/services/chinese/cnDashboardService';

export const dynamic = 'force-dynamic';

export default async function ChineseDashboardPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const dashboard = await getChineseDashboard(session.user.id);

	return (
		<Suspense fallback={
			<div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted md:px-8">
				Đang tải báo cáo học tập...
			</div>
		}>
			<LearningReportTabs srsPanel={<SrsReportPanel dashboard={dashboard} />} />
		</Suspense>
	);
}
