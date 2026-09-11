import { redirect } from 'next/navigation';
import UiLabClient from './UiLabClient';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function UiLabPage() {
	const session = await auth();
	if (!session?.user || session.user.role !== 'admin') {
		redirect('/');
	}

	return <UiLabClient />;
}
