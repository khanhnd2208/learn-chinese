import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { auth } from '@/lib/auth';
import { getUserSet, listUserSets } from '@/services/chinese/cnSetService';
import SetStudyPanel from './SetStudyPanel';
import SetManagePanel from './SetManagePanel';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function ChineseSetDetailPage({ params }: Props) {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const { id } = await params;
	const [set, allSets] = await Promise.all([
		getUserSet(session.user.id, id),
		listUserSets(session.user.id),
	]);
	if (!set) notFound();

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<Link href="/sets" className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
				<MaterialIcon name="arrow_back" size={16} />
				Bộ từ
			</Link>
			<div className="md:hidden">
				<SetStudyPanel set={set} />
			</div>
			<SetManagePanel set={set} allSets={allSets} />
		</div>
	);
}
