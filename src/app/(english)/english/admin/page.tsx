import { redirect } from 'next/navigation';
import EnglishAdmin from '@/components/english/EnglishAdmin';
import { auth } from '@/lib/auth';
import { listPendingEnglishDisputes } from '@/services/english/enAnswerService';
import { listEnglishAdminSets } from '@/services/english/enContentService';

export const dynamic = 'force-dynamic';

export default async function EnglishAdminPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (session.user.role !== 'admin') redirect('/english');
	const [sets, disputes] = await Promise.all([
		listEnglishAdminSets(),
		listPendingEnglishDisputes(),
	]);
	return <EnglishAdmin sets={sets} disputes={disputes} />;
}
