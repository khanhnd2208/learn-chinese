/* ════════════════════════════════════════════════════════════════════════
   cnSampleSetService.ts — Auto-provision global HSK1 sample sets per user
   ════════════════════════════════════════════════════════════════════════ */
import {
	GLOBAL_SAMPLE_SET_DESCRIPTION,
	HSK1_SAMPLE_SETS,
} from '@/lib/chinese/hsk1SampleSets';
import { buildUserSetSampleWorkbook } from '@/lib/chinese/userSetSampleWorkbook';
import { importUserWorkbookBuffer } from '@/services/chinese/cnExcelService';
import { activateSetInSrs } from '@/services/chinese/cnSrsEnrollmentService';
import { prisma } from '@/lib/prisma';

export async function ensureGlobalSampleSets(userId: string): Promise<void> {
	const existing = await prisma.cnWordSet.findMany({
		where: { userId, description: GLOBAL_SAMPLE_SET_DESCRIPTION },
		select: { id: true, title: true, srsActive: true },
	});
	const byTitle = new Map(existing.map((set) => [set.title, set]));

	for (const sample of HSK1_SAMPLE_SETS) {
		const found = byTitle.get(sample.boTu);
		if (found) {
			if (!found.srsActive) {
				await activateSetInSrs(userId, found.id);
			}
			continue;
		}

		const buffer = buildUserSetSampleWorkbook(sample.id);
		const { preview, createdSetIds } = await importUserWorkbookBuffer(userId, buffer, {
			setDescription: GLOBAL_SAMPLE_SET_DESCRIPTION,
			preserveSetTitle: true,
		});

		if (preview.errors.length) {
			console.error(
				`[ensureGlobalSampleSets] import failed for ${sample.boTu}:`,
				preview.errors.join('; '),
			);
			continue;
		}

		for (const setId of createdSetIds) {
			await activateSetInSrs(userId, setId);
		}
	}
}
