import type { CnPracticeSubmitItem } from '@/types/chinese';

/** Pass-through — core question types use client MCQ grading only */
export async function reconcileSubmitItems(
	items: CnPracticeSubmitItem[],
): Promise<CnPracticeSubmitItem[]> {
	return items;
}
