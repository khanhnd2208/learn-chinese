/* ════════════════════════════════════════════════════════════════════════
   cnSampleSetService.ts — Publish HSK1 starter sets once, owned by an admin
   ════════════════════════════════════════════════════════════════════════ */
import {
	GLOBAL_SAMPLE_SET_DESCRIPTION,
	HSK1_SAMPLE_SETS,
} from '@/lib/chinese/hsk1SampleSets';
import { buildUserSetSampleWorkbook } from '@/lib/chinese/userSetSampleWorkbook';
import { importUserWorkbookBuffer } from '@/services/chinese/cnExcelService';
import { prisma } from '@/lib/prisma';

/**
 * Ensure the three HSK1 starter sets exist as this admin's published sets.
 * Learners follow them from Khám phá. This does not copy a set per user.
 */
export async function ensureGlobalSampleSets(adminUserId: string): Promise<void> {
	const existing = await prisma.cnWordSet.findMany({
		where: {
			description: GLOBAL_SAMPLE_SET_DESCRIPTION,
			OR: [{ shared: true }, { userId: adminUserId }],
		},
		select: {
			id: true,
			title: true,
			userId: true,
			shared: true,
			level: true,
			sortOrder: true,
			publishedAt: true,
		},
	});

	for (const [index, sample] of HSK1_SAMPLE_SETS.entries()) {
		const sortOrder = index + 1;
		const matches = existing.filter((set) => set.title === sample.boTu);
		const found = matches.find((set) => set.shared) ?? matches.find((set) => set.userId === adminUserId);
		if (found) {
			const alreadyPublished = found.shared
				&& found.level === 1
				&& found.sortOrder === sortOrder
				&& found.userId === adminUserId
				&& found.publishedAt;
			if (!alreadyPublished) {
				await prisma.cnWordSet.update({
					where: { id: found.id },
					data: {
						userId: adminUserId,
						shared: true,
						level: 1,
						sortOrder,
						publishedAt: found.publishedAt ?? new Date(),
					},
				});
			}
			continue;
		}

		const buffer = await buildUserSetSampleWorkbook(sample.id);
		const { preview, createdSetIds } = await importUserWorkbookBuffer(adminUserId, buffer, {
			setDescription: GLOBAL_SAMPLE_SET_DESCRIPTION,
			preserveSetTitle: true,
			canCreateWords: true,
		});

		if (preview.errors.length) {
			console.error(
				`[ensureGlobalSampleSets] import failed for ${sample.boTu}:`,
				preview.errors.join('; '),
			);
			continue;
		}

		const publishedAt = new Date();
		for (const setId of createdSetIds) {
			await prisma.cnWordSet.update({
				where: { id: setId },
				data: {
					shared: true,
					level: 1,
					sortOrder,
					publishedAt,
				},
			});
		}
	}
}
