import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetManagePanel from '@/app/(app)/sets/[id]/SetManagePanel';
import SetSharePanel from '@/app/(app)/sets/SetSharePanel';
import { auth } from '@/lib/auth';
import { getUserSet, listUserSetTitles } from '@/services/chinese/cnSetService';
import SetCatalogForm from '../SetCatalogForm';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function AdminSetPage({ params }: Props) {
	const [session, { id }] = await Promise.all([auth(), params]);
	if (!session?.user) redirect('/login');

	const [set, titles] = await Promise.all([
		getUserSet(session.user.id, id),
		listUserSetTitles(session.user.id),
	]);
	if (!set) notFound();

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<Link href="/admin/sets" className="flex items-center gap-1 text-sm text-muted hover:text-accent">
				<MaterialIcon name="arrow_back" size={16} />
				Bộ từ
			</Link>
			<header>
				<p className="label-caps">{set.shared ? 'Đã xuất bản' : 'Nháp'}</p>
				<h1 className="mt-2 text-3xl font-black text-foreground">{set.title}</h1>
			</header>
			<SetSharePanel
				key={`${set.id}-${set.shared}`}
				setId={set.id}
				title={set.title}
				itemCount={set.itemCount}
				shared={set.shared}
			/>
			<SetCatalogForm setId={set.id} level={set.level} sortOrder={set.sortOrder} />
			<SetManagePanel set={set} allSets={titles} isAdmin />
		</div>
	);
}
