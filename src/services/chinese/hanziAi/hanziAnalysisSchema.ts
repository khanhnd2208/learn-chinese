import { z } from 'zod';
import {
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
} from './hanziTrustRegistry';

const shortText = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(500).nullable();

export const structureKindSchema = z.enum([
	'pictograph',
	'simple_ideograph',
	'associative_compound',
	'phono_semantic',
	'visual_description_only',
	'unknown',
]);

export const structureTypeSchema = z.enum([
	'single', 'left_right', 'top_bottom', 'enclosure', 'partial_enclosure',
	'three_part', 'overlapping', 'unknown',
]);

export const claimTrustSchema = z.enum(['curated', 'expert_verified', 'unverified']);
export const claimRelationSchema = z.enum(['visual', 'semantic', 'phonetic']);
export const phoneticKindSchema = z.enum(['modern', 'historical']);
export const decompositionDisplayModeSchema = z.enum(['full', 'visual_only', 'hidden']);
export const publishStatusSchema = z.enum(['ready', 'needs_review']);

/** AI draft shape (v1-compatible input before trust policy). */
export const hanziComponentDraftSchema = z.object({
	char: z.string().trim().min(1).max(8),
	position: z.number().int().min(0).max(20),
	role: z.enum(['semantic', 'phonetic', 'form', 'radical', 'unknown']),
	meaningVi: z.string().trim().max(200).nullable(),
	explanationVi: z.string().trim().min(1).max(500),
	isMainRadical: z.boolean(),
});

export const hanziCharacterDraftSchema = z.object({
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
		standardChar: z.string().trim().max(8).nullable().optional(),
		variantNoteVi: z.string().trim().max(300).nullable().optional(),
	}).nullable(),
	structureType: structureTypeSchema,
	components: z.array(hanziComponentDraftSchema).max(12),
	structureExplanationVi: z.string().trim().min(1).max(800),
	mnemonicVi: optionalText,
	etymologyNoteVi: optionalText.nullish().transform((v) => v ?? null),
	etymologyStatus: z.enum(['not_provided', 'uncertain', 'supported']),
	similarCharacters: z.array(z.object({
		char: z.string().trim().min(1).max(4),
		differenceVi: z.string().trim().min(1).max(300),
	})).max(8),
});

export const hanziAiDraftSchema = z.object({
	schemaVersion: z.literal(1).optional(),
	term: z.string().trim().min(1).max(8),
	normalizedTerm: z.string().trim().min(1).max(8).optional(),
	requestedTerm: z.string().trim().min(1).max(8).optional(),
	displayTerm: z.string().trim().min(1).max(8).optional(),
	canonicalTerm: z.string().trim().min(1).max(8).optional(),
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
	characters: z.array(hanziCharacterDraftSchema).min(1).max(4),
	examples: z.array(z.object({
		chinese: z.string().trim().min(1).max(300),
		pinyin: z.string().trim().min(1).max(500),
		meaningVi: z.string().trim().min(1).max(500),
		usageNoteVi: optionalText,
	})).max(2),
	warnings: z.array(z.string().trim().min(1).max(300)).max(10),
});

/** Published v2 result after trust policy. */
export const hanziComponentSchema = z.object({
	char: z.string().trim().min(1).max(8),
	position: z.number().int().min(0).max(20),
	relation: claimRelationSchema,
	role: z.enum(['semantic', 'phonetic', 'form', 'radical', 'unknown']),
	phoneticKind: phoneticKindSchema.nullable().optional(),
	claimTrust: claimTrustSchema,
	publishExplanationVi: z.string().trim().max(500).nullable(),
	meaningVi: z.string().trim().max(200).nullable(),
	explanationVi: z.string().trim().min(1).max(500),
	isMainRadical: z.boolean(),
});

export const hanziCharacterAnalysisSchema = z.object({
	position: z.number().int().min(0).max(3),
	char: z.string().trim().min(1).max(4),
	pinyin: shortText,
	dictionaryReadings: z.array(shortText).max(12).default([]),
	pinyinInTerm: z.string().trim().max(40).nullable().optional(),
	toneBehavior: z.enum(['neutral_tone', 'unchanged', 'unknown']).nullable().optional(),
	hanViet: z.string().trim().max(100),
	meaningVi: shortText,
	radical: z.object({
		char: z.string().trim().min(1).max(8),
		nameVi: z.string().trim().max(100),
		meaningVi: z.string().trim().max(200),
		standardChar: z.string().trim().max(8).nullable().optional(),
		variantNoteVi: z.string().trim().max(300).nullable().optional(),
	}).nullable(),
	structureType: structureTypeSchema,
	structureKind: structureKindSchema.optional(),
	decompositionDisplayMode: decompositionDisplayModeSchema,
	components: z.array(hanziComponentSchema).max(12),
	structureExplanationVi: z.string().trim().min(1).max(800),
	mnemonicVi: optionalText,
	etymologyNoteVi: optionalText.nullish().transform((v) => v ?? null),
	etymologyStatus: z.enum(['not_provided', 'uncertain', 'supported']),
	similarCharacters: z.array(z.object({
		char: z.string().trim().min(1).max(4),
		differenceVi: z.string().trim().min(1).max(300),
	})).max(8),
});

export const hanziAnalysisResultSchema = z.object({
	schemaVersion: z.literal(2),
	policyVersion: z.string().default(HANZI_TRUST_POLICY_VERSION),
	registryVersion: z.number().int().default(HANZI_TRUST_REGISTRY_VERSION),
	requestedTerm: z.string().trim().min(1).max(8),
	displayTerm: z.string().trim().min(1).max(8),
	canonicalTerm: z.string().trim().min(1).max(8),
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
	lexicalStatus: publishStatusSchema,
	decompositionStatus: z.enum(['full', 'visual_only', 'hidden']),
	exampleStatus: publishStatusSchema,
	characters: z.array(hanziCharacterAnalysisSchema).min(1).max(4),
	examples: z.array(z.object({
		chinese: z.string().trim().min(1).max(300),
		pinyin: z.string().trim().min(1).max(500),
		meaningVi: z.string().trim().min(1).max(500),
		usageNoteVi: optionalText,
	})).max(2),
	warnings: z.array(z.string().trim().min(1).max(300)).max(10),
});

/** Legacy v1 stored results (read-only). */
export const hanziAnalysisResultSchemaV1 = z.object({
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
	characters: z.array(hanziCharacterDraftSchema).min(1).max(4),
	examples: z.array(z.object({
		chinese: z.string().trim().min(1).max(300),
		pinyin: z.string().trim().min(1).max(500),
		meaningVi: z.string().trim().min(1).max(500),
		usageNoteVi: optionalText,
	})).max(2),
	warnings: z.array(z.string().trim().min(1).max(300)).max(10),
});

export type HanziAiDraftResult = z.infer<typeof hanziAiDraftSchema>;
export type HanziAnalysisResult = z.infer<typeof hanziAnalysisResultSchema>;
export type HanziComponentAnalysis = z.infer<typeof hanziComponentSchema>;
export type HanziCharacterAnalysis = z.infer<typeof hanziCharacterAnalysisSchema>;
