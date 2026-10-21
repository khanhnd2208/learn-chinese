import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { auth } from '@/lib/auth';
import { getUserSet, listUserSetTitles } from '@/services/chinese/cnSetService';
import SetStudyPanel from './SetStudyPanel';
import SetManagePanel from './SetManagePanel';
import SetSharePanel from '@/app/(app)/sets/SetSharePanel';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function ChineseSetDetailPage({ params }: Props) {
	const [session, { id }] = await Promise.all([auth(), params]);
	if (!session?.user) redirect('/login');

	const [set, allSets] = await Promise.all([
		getUserSet(session.user.id, id),
		listUserSetTitles(session.user.id),
	]);
	if (!set) notFound();

	const isAdmin = session.user.role === 'admin';

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<Link href="/sets" className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
				<MaterialIcon name="arrow_back" size={16} />
				Bộ từ
			</Link>
			{isAdmin && (
				<SetSharePanel
					key={`${set.id}-${set.shared}`}
					setId={set.id}
					title={set.title}
					itemCount={set.itemCount}
					shared={set.shared}
				/>
			)}
			<SetStudyPanel set={set} />
			<SetManagePanel set={set} allSets={allSets} isAdmin={isAdmin} />
		</div>
	);
}
