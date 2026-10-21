import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { assessEnglishPack, type AssessedPack, type EnglishPack } from '@/lib/english/contentValidation';
import { questionsFromContent, type QuestionDraft, type StoredPattern, type StoredWord } from '@/lib/english/questions';
import { audioFileExists } from '@/services/english/enAudioService';

export interface EnglishPackSaveResult {
	setId: string;
	issues: AssessedPack['issues'];
	schemaError: string | null;
}

export interface EnglishPublishResult {
	publishedSenses: number;
	publishedPatterns: number;
	issues: AssessedPack['issues'];
}

function json(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function asSlots(value: unknown): StoredPattern['slots'] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const row = item as { id?: unknown; labelVi?: unknown; choices?: unknown };
		if (typeof row.id !== 'string') return [];
		return [{
			id: row.id,
			labelVi: typeof row.labelVi === 'string' ? row.labelVi : '',
			choices: Array.isArray(row.choices) ? row.choices.filter((choice): choice is string => typeof choice === 'string') : [],
		}];
	});
}

function asSlotValues(value: unknown): Array<{ id: string; value: string }> {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const row = item as { id?: unknown; value?: unknown };
		if (typeof row.id !== 'string' || typeof row.value !== 'string') return [];
		return [{ id: row.id, value: row.value }];
	});
}

async function existingAudio(names: string[], exists: (file: string) => Promise<boolean>): Promise<string[]> {
	const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
	const checks = await Promise.all(unique.map(async (name) => ({ name, ok: await exists(name) })));
	return checks.filter((item) => item.ok).map((item) => item.name);
}

async function writeQuestions(drafts: QuestionDraft[]) {
	for (const draft of drafts) {
		const current = await prisma.enQuestion.findUnique({ where: { key: draft.key }, select: { status: true } });
		if (current?.status === 'suspended') continue;
		const exampleId = draft.skill === 'usage' ? draft.exampleKey : null;
		const patternExampleId = draft.skill === 'pattern' ? draft.exampleKey : null;
		const data = {
			kind: draft.kind,
			skill: draft.skill,
			stage: draft.stage,
			senseId: draft.senseKey,
			patternId: draft.patternKey,
			exampleId,
			patternExampleId,
			prompt: json(draft.prompt),
			answer: draft.answer,
			audioPath: draft.audioFile,
			status: 'published' as const,
		};
		await prisma.enQuestion.upsert({
			where: { key: draft.key },
			create: { key: draft.key, ...data },
			update: data,
		});
	}
}

export async function saveEnglishPack(input: unknown): Promise<EnglishPackSaveResult> {
	const assessment = assessEnglishPack(input);
	if (assessment.schemaError || !assessment.pack) {
		throw new AppError(assessment.schemaError ?? 'Gói nội dung không đúng cấu trúc', 400);
	}
	const pack = assessment.pack;
	const setId = await prisma.$transaction(async (tx) => {
		const set = await tx.enSet.create({
			data: { title: pack.title.trim(), description: pack.description.trim(), status: 'draft' },
		});
		const senseIdByLemma = new Map<string, string>();
		for (const [index, word] of pack.words.entries()) {
			const assessed = assessment.words[index];
			const createdWord = await tx.enWord.create({
				data: {
					lemma: word.lemma.trim(),
					ipa: word.ipa.trim(),
					stress: word.stress.trim(),
					partOfSpeech: word.partOfSpeech.trim(),
					forms: word.forms.map((form) => form.trim()).filter(Boolean),
					audioPath: word.audioFile.trim(),
					status: 'draft',
				},
			});
			const sense = await tx.enSense.create({
				data: {
					wordId: createdWord.id,
					meaningVi: word.meaningVi.trim(),
					partOfSpeech: word.partOfSpeech.trim(),
					collocations: word.collocations.map((item) => item.trim()).filter(Boolean),
					pitfallVi: word.pitfallVi.trim(),
					distractorMeanings: word.distractorMeanings,
					distractorLemmas: word.distractorLemmas,
					status: 'draft',
				},
			});
			senseIdByLemma.set(word.lemma.trim().toLowerCase(), sense.id);
			await tx.enSetItem.create({
				data: { setId: set.id, senseId: sense.id, position: index },
			});
			for (const [exampleIndex, example] of word.examples.entries()) {
				const grade = assessed?.examples.find((item) => item.index === exampleIndex)?.gradeEligible === true;
				await tx.enExample.create({
					data: {
						senseId: sense.id,
						english: example.english.trim(),
						meaningVi: example.meaningVi.trim(),
						target: example.target.trim(),
						audioPath: example.audioFile.trim(),
						role: grade ? 'grade' : 'study',
						alternatives: example.alternativesTried.map((item) => item.trim()).filter(Boolean),
						ambiguityNote: example.stillPlausible.map((item) => item.trim()).filter(Boolean).join(', '),
						status: 'draft',
					},
				});
			}
		}
		for (const [index, pattern] of pack.patterns.entries()) {
			const created = await tx.enPattern.create({
				data: {
					purposeVi: pattern.purposeVi.trim(),
					frame: pattern.frame.trim(),
					fixedParts: pattern.fixedParts.map((part) => part.trim()).filter(Boolean),
					slots: json(pattern.slots),
					pitfallVi: pattern.pitfallVi.trim(),
					status: 'draft',
				},
			});
			for (const lemma of pattern.senseLemmas) {
				const senseId = senseIdByLemma.get(lemma.trim().toLowerCase());
				if (!senseId) continue;
				await tx.enPatternSense.create({ data: { patternId: created.id, senseId } });
			}
			for (const example of pattern.examples) {
				await tx.enPatternExample.create({
					data: {
						patternId: created.id,
						english: example.english.trim(),
						meaningVi: example.meaningVi.trim(),
						slotValues: json(example.slotValues),
						audioPath: example.audioFile.trim(),
						status: 'draft',
					},
				});
			}
			await tx.enSetItem.create({
				data: { setId: set.id, patternId: created.id, position: pack.words.length + index },
			});
		}
		return set.id;
	});
	return { setId, issues: assessment.issues, schemaError: null };
}

export async function publishEnglishSet(
	setId: string,
	exists: (file: string) => Promise<boolean> = audioFileExists,
): Promise<EnglishPublishResult> {
	const set = await prisma.enSet.findUnique({
		where: { id: setId },
		include: {
			items: {
				include: {
					sense: { include: { word: true, examples: true } },
					pattern: { include: { examples: true } },
				},
			},
		},
	});
	if (!set) throw new AppError('Không tìm thấy bộ học', 404);
	const issues: AssessedPack['issues'] = [];
	let publishedSenses = 0;
	let publishedPatterns = 0;

	for (const item of set.items) {
		if (item.sense) {
			const sense = item.sense;
			const names = [sense.word.audioPath, ...sense.examples.map((example) => example.audioPath)];
			const audioFiles = await existingAudio(names, exists);
			const pack: EnglishPack = {
				title: set.title,
				description: set.description,
				audioFiles,
				words: [{
					lemma: sense.word.lemma,
					ipa: sense.word.ipa,
					stress: sense.word.stress,
					partOfSpeech: sense.word.partOfSpeech,
					forms: sense.word.forms,
					meaningVi: sense.meaningVi,
					collocations: sense.collocations,
					pitfallVi: sense.pitfallVi,
					audioFile: sense.word.audioPath,
					distractorMeanings: sense.distractorMeanings,
					distractorLemmas: sense.distractorLemmas,
					examples: sense.examples.map((example) => ({
						english: example.english,
						meaningVi: example.meaningVi,
						target: example.target,
						audioFile: example.audioPath,
						alternativesTried: example.alternatives,
						stillPlausible: example.ambiguityNote ? example.ambiguityNote.split(',').map((part) => part.trim()).filter(Boolean) : [],
						adminCleared: example.role === 'grade' && example.ambiguityNote.length > 0,
					})),
				}],
				patterns: [],
			};
			const assessment = assessEnglishPack(pack);
			issues.push(...assessment.issues.map((issue) => ({ ...issue, path: `${sense.word.lemma}: ${issue.path}` })));
			const assessed = assessment.words[0];
			if (!assessed?.publishable) continue;
			const stored: StoredWord = {
				id: sense.id,
				lemma: sense.word.lemma,
				ipa: sense.word.ipa,
				meaningVi: sense.meaningVi,
				audioFile: sense.word.audioPath,
				distractorMeanings: sense.distractorMeanings,
				distractorLemmas: sense.distractorLemmas,
				examples: sense.examples.map((example) => {
					const grade = assessed.examples.find((item) => sense.examples[item.index]?.id === example.id)?.gradeEligible === true;
					return {
						id: example.id,
						english: example.english,
						meaningVi: example.meaningVi,
						target: example.target,
						audioFile: example.audioPath,
						role: grade ? 'grade' as const : 'study' as const,
						gradeEligible: grade,
					};
				}),
			};
			await prisma.enWord.update({ where: { id: sense.wordId }, data: { status: 'published' } });
			await prisma.enSense.update({ where: { id: sense.id }, data: { status: 'published' } });
			for (const example of stored.examples) {
				await prisma.enExample.update({
					where: { id: example.id },
					data: { role: example.role, status: 'published' },
				});
			}
			await prisma.enQuestion.updateMany({
				where: { senseId: sense.id, status: { not: 'suspended' } },
				data: { status: 'draft' },
			});
			await writeQuestions(questionsFromContent({ words: [stored], patterns: [] }));
			publishedSenses += 1;
		}
		if (item.pattern) {
			const pattern = item.pattern;
			const audioFiles = await existingAudio(pattern.examples.map((example) => example.audioPath), exists);
			const slots = asSlots(pattern.slots);
			const pack: EnglishPack = {
				title: set.title,
				description: set.description,
				audioFiles,
				words: [],
				patterns: [{
					purposeVi: pattern.purposeVi,
					frame: pattern.frame,
					fixedParts: pattern.fixedParts,
					slots,
					pitfallVi: pattern.pitfallVi,
					senseLemmas: [],
					examples: pattern.examples.map((example) => ({
						english: example.english,
						meaningVi: example.meaningVi,
						audioFile: example.audioPath,
						slotValues: asSlotValues(example.slotValues),
					})),
				}],
			};
			const assessment = assessEnglishPack(pack);
			issues.push(...assessment.issues);
			if (!assessment.patterns[0]?.publishable) continue;
			const stored: StoredPattern = {
				id: pattern.id,
				purposeVi: pattern.purposeVi,
				frame: pattern.frame,
				fixedParts: pattern.fixedParts,
				slots,
				examples: pattern.examples.map((example) => ({
					id: example.id,
					english: example.english,
					meaningVi: example.meaningVi,
					audioFile: example.audioPath,
					slotValues: asSlotValues(example.slotValues),
				})),
			};
			await prisma.enPattern.update({ where: { id: pattern.id }, data: { status: 'published' } });
			await prisma.enPatternExample.updateMany({ where: { patternId: pattern.id }, data: { status: 'published' } });
			await prisma.enQuestion.updateMany({
				where: { patternId: pattern.id, status: { not: 'suspended' } },
				data: { status: 'draft' },
			});
			await writeQuestions(questionsFromContent({ words: [], patterns: [stored] }));
			publishedPatterns += 1;
		}
	}

	if (publishedSenses + publishedPatterns > 0) {
		await prisma.enSet.update({ where: { id: set.id }, data: { status: 'published' } });
	}
	return { publishedSenses, publishedPatterns, issues };
}

export async function listEnglishAdminSets() {
	const sets = await prisma.enSet.findMany({
		orderBy: { updatedAt: 'desc' },
		take: 20,
		include: { _count: { select: { items: true, enrollments: true } } },
	});
	return sets.map((set) => ({
		id: set.id,
		title: set.title,
		status: set.status,
		items: set._count.items,
		learners: set._count.enrollments,
	}));
}
