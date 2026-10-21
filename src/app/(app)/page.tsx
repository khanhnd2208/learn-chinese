import Link from 'next/link';
import { redirect } from 'next/navigation';
import SetCard, { type SetCardModel } from '@/components/chinese/SetCard';
import SmartStudyButton from '@/components/chinese/SmartStudyButton';
import LanguageSwitch from '@/components/english/LanguageSwitch';
import { Card, CardContent } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { getChineseDashboard } from '@/services/chinese/cnDashboardService';
import { listEnrolledSets } from '@/services/chinese/cnEnrollmentService';
import { getLearnQueue } from '@/services/chinese/cnLearnService';

export const dynamic = 'force-dynamic';

const ONBOARDING = [
	{ title: 'Khám phá', description: 'Chọn một bộ từ đã xuất bản.', href: '/explore' },
	{ title: 'Theo học', description: 'Bộ gốc cập nhật ngay khi admin sửa.', href: '/library' },
	{ title: 'Ôn', description: 'Mỗi ngày ôn các từ đến hạn.', href: '/review' },
] as const;

function toCard(set: Awaited<ReturnType<typeof listEnrolledSets>>[number]): SetCardModel {
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		level: set.level,
		itemCount: set.itemCount,
		enrolled: set.enrolled,
		legacy: set.legacy,
		srsActive: set.srsActive,
		newCount: set.newCount,
		learningCount: set.learningCount,
		masteredCount: set.masteredCount,
		dueCount: set.dueCount,
	};
}

export default async function ChineseHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const userId = session.user.id;
	const [sets, dashboard, learnQueue] = await Promise.all([
		listEnrolledSets(userId),
		getChineseDashboard(userId),
		getLearnQueue(userId),
	]);
	const hasSets = sets.length > 0;
	const newToday = Math.min(learnQueue.remainingToday, learnQueue.totalUnintroduced);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="flex items-start justify-between gap-4">
				<div>
					<p className="label-caps">Hôm nay</p>
					<h1 className="mt-2 text-3xl font-black text-foreground">Học Hán Ngữ</h1>
				</div>
				<LanguageSwitch />
			</section>

			<SmartStudyButton
				dueCount={dashboard.dueWordsToday}
				newCount={newToday}
				enrolled={hasSets}
				hasSets={hasSets}
			/>

			<section className="grid grid-cols-3 gap-3">
				{[
					{ label: 'Chuỗi', value: dashboard.streak },
					{ label: 'Đến hạn', value: dashboard.dueWordsToday },
					{ label: 'Đã nắm', value: dashboard.wordsMastered },
				].map((stat) => (
					<Card key={stat.label}>
						<CardContent className="text-center">
							<p className="text-2xl font-black text-accent">{stat.value}</p>
							<p className="text-xs text-muted">{stat.label}</p>
						</CardContent>
					</Card>
				))}
			</section>

			{!hasSets ? (
				<section className="space-y-3">
					<h2 className="text-xl font-black text-foreground">Bắt đầu</h2>
					<ol className="grid gap-3 md:grid-cols-3">
						{ONBOARDING.map((step, index) => (
							<li key={step.title}>
								<Link href={step.href}>
									<Card interactive>
										<CardContent>
											<p className="text-xs font-bold text-muted">Bước {index + 1}</p>
											<p className="font-black text-foreground">{step.title}</p>
											<p className="mt-1 text-sm text-muted">{step.description}</p>
										</CardContent>
									</Card>
								</Link>
							</li>
						))}
					</ol>
				</section>
			) : (
				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-black text-foreground">Tiếp tục học</h2>
						<Link href="/library" className="text-sm font-bold text-accent">Thư viện</Link>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{sets.slice(0, 3).map((set) => (
							<SetCard key={set.id} variant="home" set={toCard(set)} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}
