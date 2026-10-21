/* ════════════════════════════════════════════════════════════════════════
   cnFlashcardService.ts — Read-only flashcard decks for user word sets
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { buildFlashcardCards } from '@/lib/chinese/flashcardExamples';
import { canViewSet } from '@/services/chinese/cnEnrollmentService';
import { loadWordViewsForUser } from '@/services/chinese/cnWordViewService';
import type { FlashcardDeckDTO } from '@/types/chinese';

export async function getFlashcardDeck(userId: string, setId: string): Promise<FlashcardDeckDTO | null> {
	if (!(await canViewSet(userId, setId))) return null;
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId },
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

	const wordIds = set.items.map((item) => item.wordId).filter((id): id is string => !!id);
	const views = await loadWordViewsForUser(userId, wordIds);
	const items = set.items.map((item) => {
		if (!item.word) return item;
		const view = views.get(item.word.id);
		if (!view) return item;
		return {
			...item,
			word: {
				...item.word,
				pinyin: view.pinyin,
				meaningVi: view.meaningVi,
				examples: view.examples,
			},
		};
	});
	const { cards, skippedCount } = buildFlashcardCards(items);

	return {
		setId: set.id,
		title: set.title,
		cards,
		skippedCount,
	};
}
