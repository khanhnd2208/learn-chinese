import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { auth } from '@/lib/auth';
import { getViewableSet } from '@/services/chinese/cnSetService';
import SetStudyView from './SetStudyView';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function ChineseSetDetailPage({ params }: Props) {
	const [session, { id }] = await Promise.all([auth(), params]);
	if (!session?.user) redirect('/login');

	const set = await getViewableSet(session.user.id, id);
	if (!set) notFound();

	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
			<Link
				href={set.enrolled ? '/library' : '/explore'}
				className="flex items-center gap-1 text-sm text-muted hover:text-accent"
			>
				<MaterialIcon name="arrow_back" size={16} />
				{set.enrolled ? 'Thư viện' : 'Khám phá'}
			</Link>
			<SetStudyView set={set} />
		</div>
	);
}
