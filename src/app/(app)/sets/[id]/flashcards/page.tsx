import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getFlashcardDeck } from '@/services/chinese/cnFlashcardService';
import EmptyState from '@/components/ui/EmptyState';
import FlashcardSessionClient from './FlashcardSessionClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function FlashcardPage({ params }: Props) {
	const [session, { id }] = await Promise.all([auth(), params]);
	if (!session?.user) redirect('/login');

	const deck = await getFlashcardDeck(session.user.id, id);
	if (!deck) notFound();

	if (deck.cards.length === 0 && deck.skippedCount === 0) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
				<EmptyState
					icon="style"
					title="Bộ từ trống"
					description="Thêm từ có dữ liệu rồi quay lại học flashcard."
					action={{ label: 'Về bộ từ', href: `/sets/${deck.setId}` }}
				/>
			</div>
		);
	}

	return <FlashcardSessionClient deck={deck} />;
}
