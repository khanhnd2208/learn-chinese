/* ════════════════════════════════════════════════════════════════════════
   cnFlashcardService.ts — Read-only flashcard decks for user word sets
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { buildFlashcardCards } from '@/lib/chinese/flashcardExamples';
import type { FlashcardDeckDTO } from '@/types/chinese';

export async function getFlashcardDeck(userId: string, setId: string): Promise<FlashcardDeckDTO | null> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: {
			items: {
				include: {
					word: {
						include: {
							examples: { orderBy: { id: 'asc' } },
						},
					},
				},
				orderBy: { rawTerm: 'asc' },
			},
		},
	});
	if (!set) return null;

	const { cards, skippedCount } = buildFlashcardCards(set.items);

	return {
		setId: set.id,
		title: set.title,
		cards,
		skippedCount,
	};
}
