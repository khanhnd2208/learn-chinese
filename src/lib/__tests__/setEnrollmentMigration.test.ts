import { describe, expect, it } from 'vitest';
import { GLOBAL_SAMPLE_SET_DESCRIPTION } from '@/lib/chinese/hsk1SampleSets';
import {
	LIBRARY_COPY_SUFFIX,
	pendingSeeds,
	planSetEnrollmentMigration,
	type MigrationSetRef,
} from '@/lib/chinese/setEnrollmentMigration';

function set(partial: Partial<MigrationSetRef> & Pick<MigrationSetRef, 'id' | 'userId' | 'title'>): MigrationSetRef {
	return {
		description: '',
		shared: false,
		srsActive: false,
		createdAt: new Date('2026-01-01'),
		items: [{ wordId: 'w1', rawTerm: '你' }],
		...partial,
	};
}

describe('planSetEnrollmentMigration', () => {
	it('enrolls each owner and keeps their review switch', () => {
		const plan = planSetEnrollmentMigration([
			set({ id: 'owned', userId: 'learner', title: 'Của tôi', srsActive: true }),
		]);
		expect(plan.ownerEnrollments).toEqual([
			{ userId: 'learner', setId: 'owned', srsActive: true },
		]);
		expect(plan.copyMigrations).toEqual([]);
		expect(plan.legacySetIds).toEqual([]);
	});

	it('turns a matching library copy into a follow and drops the copy', () => {
		const plan = planSetEnrollmentMigration([
			set({
				id: 'original',
				userId: 'admin',
				title: 'Bài 1',
				shared: true,
				createdAt: new Date('2026-01-01'),
			}),
			set({
				id: 'copy',
				userId: 'learner',
				title: `Bài 1${LIBRARY_COPY_SUFFIX}`,
				srsActive: true,
				createdAt: new Date('2026-02-01'),
			}),
		]);
		expect(plan.copyMigrations).toEqual([
			{ userId: 'learner', setId: 'original', srsActive: true, deleteSetId: 'copy' },
		]);
		expect(plan.ownerEnrollments.map((row) => row.setId)).toEqual(['original']);
	});

	it('keeps an unmatched personal copy as a legacy set', () => {
		const plan = planSetEnrollmentMigration([
			set({ id: 'copy', userId: 'learner', title: `Không khớp${LIBRARY_COPY_SUFFIX}` }),
		]);
		expect(plan.copyMigrations).toEqual([]);
		expect(plan.legacySetIds).toEqual(['copy']);
		expect(plan.ownerEnrollments).toEqual([
			{ userId: 'learner', setId: 'copy', srsActive: false },
		]);
	});

	it('moves a per-user sample copy onto the published original', () => {
		const plan = planSetEnrollmentMigration([
			set({
				id: 'canonical',
				userId: 'admin',
				title: 'HSK1 Bài 1',
				description: GLOBAL_SAMPLE_SET_DESCRIPTION,
				shared: true,
			}),
			set({
				id: 'personal',
				userId: 'learner',
				title: 'HSK1 Bài 1',
				description: GLOBAL_SAMPLE_SET_DESCRIPTION,
				srsActive: true,
			}),
		], GLOBAL_SAMPLE_SET_DESCRIPTION);
		expect(plan.copyMigrations).toEqual([
			{ userId: 'learner', setId: 'canonical', srsActive: true, deleteSetId: 'personal' },
		]);
	});

	it('does not recreate an enrollment that already exists', () => {
		const pending = pendingSeeds(
			[{ userId: 'learner', setId: 'set-a', srsActive: true }],
			[{ userId: 'learner', setId: 'set-a' }],
		);
		expect(pending).toEqual([]);
	});
});
