import { redirect, notFound } from 'next/navigation';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import HanziCard from '@/components/chinese/HanziCard';
import { auth } from '@/lib/auth';
import { getWordCard } from '@/services/chinese/cnContentService';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ setId?: string }> };

export default async function ChineseWordPage({ params, searchParams }: Props) {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const { id } = await params;
	const { setId } = await searchParams;
	const word = await getWordCard(id, session.user.id);
	if (!word) notFound();

	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
			<PageBreadcrumb
				crumbs={[
					{ label: setId ? 'Bộ từ' : 'Bộ từ', href: setId ? `/sets/${setId}` : '/sets' },
					{ label: 'Chi tiết từ' },
				]}
			/>
			<HanziCard word={word} setId={setId} />
		</div>
	);
}
