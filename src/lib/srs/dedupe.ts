/** Drop answers already stored for this user. The same id inside one batch counts once. */
export function omitDuplicateAnswers<T>(
	items: T[],
	idOf: (item: T) => string | null | undefined,
	alreadyStored: Iterable<string>,
): T[] {
	const seen = new Set(alreadyStored);
	const fresh: T[] = [];
	for (const item of items) {
		const id = idOf(item);
		if (id && seen.has(id)) continue;
		if (id) seen.add(id);
		fresh.push(item);
	}
	return fresh;
}
