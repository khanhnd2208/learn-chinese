/* ════════════════════════════════════════════════════════════════════════
   setEnrollmentMigration.ts — Pure plan for the enrollment backfill
   ════════════════════════════════════════════════════════════════════════ */
import { normalizeTerm } from '@/lib/chinese/hanziUtils';

export const LIBRARY_COPY_SUFFIX = ' (từ thư viện)';

export interface MigrationSetItem {
	wordId: string | null;
	rawTerm: string;
}

export interface MigrationSetRef {
	id: string;
	userId: string;
	title: string;
	description: string;
	shared: boolean;
	srsActive: boolean;
	createdAt: Date;
	items: MigrationSetItem[];
}

export interface EnrollmentSeed {
	userId: string;
	setId: string;
	srsActive: boolean;
}

export interface CopyMigration {
	userId: string;
	setId: string;
	srsActive: boolean;
	deleteSetId: string;
}

export interface MigrationPlan {
	ownerEnrollments: EnrollmentSeed[];
	copyMigrations: CopyMigration[];
	/** Personal sets and unmatched copies that stay in Thư viện. */
	legacySetIds: string[];
}

export function libraryCopyOriginalTitle(title: string): string | null {
	if (!title.endsWith(LIBRARY_COPY_SUFFIX)) return null;
	const original = title.slice(0, -LIBRARY_COPY_SUFFIX.length).trim();
	return original || null;
}

function termSignature(items: MigrationSetItem[]): string {
	return items
		.map((item) => normalizeTerm(item.rawTerm))
		.filter(Boolean)
		.sort()
		.join('\n');
}

/** Same raw terms. Fully linked word ids must also match when both sides have them. */
export function wordSetsMatch(a: MigrationSetItem[], b: MigrationSetItem[]): boolean {
	if (termSignature(a) !== termSignature(b)) return false;
	const idsA = a.map((item) => item.wordId).filter((id): id is string => !!id);
	const idsB = b.map((item) => item.wordId).filter((id): id is string => !!id);
	if (idsA.length !== a.length || idsB.length !== b.length) return true;
	return [...idsA].sort().join('\n') === [...idsB].sort().join('\n');
}

function earliest<T extends { createdAt: Date }>(sets: T[]): T | null {
	if (!sets.length) return null;
	return [...sets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null;
}

function findOriginal(
	sets: MigrationSetRef[],
	title: string,
	items: MigrationSetItem[],
	description?: string,
): MigrationSetRef | null {
	const matches = sets.filter((set) =>
		set.shared
		&& set.title === title
		&& (description === undefined || set.description === description)
		&& wordSetsMatch(set.items, items),
	);
	return earliest(matches);
}

export function planSetEnrollmentMigration(
	sets: MigrationSetRef[],
	sampleDescription?: string,
): MigrationPlan {
	const deleteIds = new Set<string>();
	const copyMigrations: CopyMigration[] = [];
	const legacySetIds: string[] = [];

	for (const set of sets) {
		const originalTitle = libraryCopyOriginalTitle(set.title);
		if (originalTitle) {
			const original = findOriginal(sets, originalTitle, set.items);
			if (original && original.id !== set.id) {
				copyMigrations.push({
					userId: set.userId,
					setId: original.id,
					srsActive: set.srsActive,
					deleteSetId: set.id,
				});
				deleteIds.add(set.id);
				continue;
			}
			legacySetIds.push(set.id);
			continue;
		}

		if (sampleDescription && !set.shared && set.description === sampleDescription) {
			const original = findOriginal(sets, set.title, set.items, sampleDescription);
			if (original && original.id !== set.id) {
				copyMigrations.push({
					userId: set.userId,
					setId: original.id,
					srsActive: set.srsActive,
					deleteSetId: set.id,
				});
				deleteIds.add(set.id);
				continue;
			}
			legacySetIds.push(set.id);
		}
	}

	const ownerEnrollments: EnrollmentSeed[] = sets
		.filter((set) => !deleteIds.has(set.id))
		.map((set) => ({
			userId: set.userId,
			setId: set.id,
			srsActive: set.srsActive,
		}));

	return { ownerEnrollments, copyMigrations, legacySetIds };
}

/** Combine seeds for the same user and set. Review stays on if any source had it on. */
export function mergeEnrollmentSeeds(seeds: EnrollmentSeed[]): EnrollmentSeed[] {
	const merged = new Map<string, EnrollmentSeed>();
	for (const seed of seeds) {
		const key = `${seed.userId}:${seed.setId}`;
		const previous = merged.get(key);
		if (!previous) merged.set(key, { ...seed });
		else previous.srsActive = previous.srsActive || seed.srsActive;
	}
	return [...merged.values()];
}

export function pendingSeeds(
	seeds: EnrollmentSeed[],
	existing: Array<{ userId: string; setId: string }>,
): EnrollmentSeed[] {
	const keys = new Set(existing.map((row) => `${row.userId}:${row.setId}`));
	return seeds.filter((seed) => !keys.has(`${seed.userId}:${seed.setId}`));
}
