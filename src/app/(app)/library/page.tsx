import { redirect } from 'next/navigation';
import SetCard, { type SetCardModel } from '@/components/chinese/SetCard';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { listEnrolledSets } from '@/services/chinese/cnEnrollmentService';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const sets = await listEnrolledSets(session.user.id);

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
			<header>
				<p className="label-caps">Thư viện</p>
				<h1 className="mt-2 text-3xl font-black text-foreground">Bộ từ đang học</h1>
			</header>
			{sets.length === 0 ? (
				<EmptyState
					icon="explore"
					title="Chưa theo học bộ từ nào"
					description="Khám phá một bộ từ đã xuất bản, rồi bấm Theo học."
					action={{ label: 'Khám phá', href: '/explore' }}
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{sets.map((set) => {
						const card: SetCardModel = {
							id: set.id,
							title: set.title,
							description: set.description,
							level: set.level,
							itemCount: set.itemCount,
							enrolled: true,
							legacy: set.legacy,
							srsActive: set.srsActive,
							newCount: set.newCount,
							learningCount: set.learningCount,
							masteredCount: set.masteredCount,
							dueCount: set.dueCount,
						};
						return <SetCard key={set.id} variant="library" set={card} />;
					})}
				</div>
			)}
		</div>
	);
}
