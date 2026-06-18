import { z } from 'zod';

const shortText = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(500).nullable();

export const hanziComponentSchema = z.object({
	char: z.string().trim().min(1).max(8),
	position: z.number().int().min(0).max(20),
	role: z.enum(['semantic', 'phonetic', 'form', 'radical', 'unknown']),
	meaningVi: z.string().trim().max(200).nullable(),
	explanationVi: z.string().trim().min(1).max(500),
	isMainRadical: z.boolean(),
});

export const hanziCharacterAnalysisSchema = z.object({
	position: z.number().int().min(0).max(3),
	char: z.string().trim().min(1).max(4),
	pinyin: shortText,
	dictionaryReadings: z.array(shortText).max(12).default([]),
	hanViet: z.string().trim().max(100),
	meaningVi: shortText,
	radical: z.object({
		char: z.string().trim().min(1).max(8),
		nameVi: z.string().trim().max(100),
		meaningVi: z.string().trim().max(200),
	}).nullable(),
	structureType: z.enum([
		'single', 'left_right', 'top_bottom', 'enclosure', 'partial_enclosure',
		'three_part', 'overlapping', 'unknown',
	]),
	components: z.array(hanziComponentSchema).max(12),
	structureExplanationVi: z.string().trim().min(1).max(800),
	mnemonicVi: optionalText,
	etymologyStatus: z.enum(['not_provided', 'uncertain', 'supported']),
	similarCharacters: z.array(z.object({
		char: z.string().trim().min(1).max(4),
		differenceVi: z.string().trim().min(1).max(300),
	})).max(8),
});

export const hanziAnalysisResultSchema = z.object({
	schemaVersion: z.literal(1),
	term: z.string().trim().min(1).max(8),
	normalizedTerm: z.string().trim().min(1).max(8),
	script: z.enum(['simplified', 'traditional', 'mixed', 'unknown']),
	simplified: z.string().trim().max(8).nullable(),
	traditional: z.string().trim().max(8).nullable(),
	pinyin: shortText,
	hanViet: z.string().trim().max(200),
	primaryMeaningVi: shortText,
	otherMeaningsVi: z.array(shortText).max(10),
	wordClasses: z.array(z.string().trim().min(1).max(80)).max(10),
	usageNoteVi: optionalText,
	overallExplanationVi: z.string().trim().min(1).max(1200),
	overallMnemonicVi: optionalText,
	characters: z.array(hanziCharacterAnalysisSchema).min(1).max(4),
	examples: z.array(z.object({
		chinese: z.string().trim().min(1).max(300),
		pinyin: z.string().trim().min(1).max(500),
		meaningVi: z.string().trim().min(1).max(500),
		usageNoteVi: optionalText,
	})).max(2),
	warnings: z.array(z.string().trim().min(1).max(300)).max(10),
});

export type HanziAnalysisResult = z.infer<typeof hanziAnalysisResultSchema>;
export type HanziComponentAnalysis = z.infer<typeof hanziComponentSchema>;

