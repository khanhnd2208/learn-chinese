import { z } from 'zod';

/** The browser cannot send `correct`. The server grades the stored question. */
export const englishAnswerSchema = z.object({
	questionId: z.string().min(1),
	clientAnswerId: z.string().min(1).max(80),
	answer: z.string().max(500).optional(),
	skipped: z.boolean().optional(),
}).strict();

export const englishAudioOpenSchema = z.object({
	questionId: z.string().min(1),
	clientAnswerId: z.string().min(1).max(80),
}).strict();

export const englishDisputeSchema = z.object({
	questionId: z.string().min(1),
	clientAnswerId: z.string().min(1).max(80),
	answer: z.string().min(1).max(500),
}).strict();

export const englishSessionSchema = z.object({
	mode: z.enum(['learn', 'review', 'weak']),
	words: z.number().int().optional(),
	patterns: z.number().int().optional(),
	lastQuestionId: z.string().nullable().optional(),
}).strict();
