import type { AssessedPack } from '@/lib/english/contentValidation';
import type { EnglishStageName } from '@/lib/english/stage';
import { blankReport, fixedPartsInOrder, isFullVietnameseMeaning, splitBlank, uniqueTexts } from '@/lib/english/text';

export type QuestionKindName =
	| 'meaning_choice'
	| 'meaning_confusable'
	| 'listen_choice'
	| 'listen_type'
	| 'spell_type'
	| 'usage_fill'
	| 'pattern_order'
	| 'pattern_fill';

export interface StoredExample {
	id: string;
	english: string;
	meaningVi: string;
	target: string;
	audioFile: string;
	role: 'study' | 'grade';
	gradeEligible: boolean;
}

export interface StoredWord {
	id: string;
	lemma: string;
	ipa: string;
	meaningVi: string;
	audioFile: string;
	distractorMeanings: string[];
	distractorLemmas: string[];
	examples: StoredExample[];
}

export interface StoredSlotValue {
	id: string;
	value: string;
}

export interface StoredPatternExample {
	id: string;
	english: string;
	meaningVi: string;
	audioFile: string;
	slotValues: StoredSlotValue[];
}

export interface StoredPattern {
	id: string;
	purposeVi: string;
	frame: string;
	fixedParts: string[];
	slots: Array<{ id: string; labelVi: string; choices: string[] }>;
	examples: StoredPatternExample[];
}

export interface QuestionDraft {
	key: string;
	kind: QuestionKindName;
	skill: 'meaning' | 'sound' | 'usage' | 'pattern';
	stage: EnglishStageName;
	senseKey: string | null;
	patternKey: string | null;
	exampleKey: string | null;
	answer: string;
	audioFile: string;
	prompt: Record<string, unknown>;
}

export interface FillSegment {
	kind: 'blank' | 'text';
	text?: string;
}

function cleanChunk(value: string): string {
	return value.replace(/^[,\s.?!]+|[,\s.?!]+$/g, '').trim();
}

export function blankFixedParts(english: string, fixedParts: string[]): FillSegment[] | null {
	let rest = english;
	const segments: FillSegment[] = [];
	for (const fixed of fixedParts) {
		const needle = fixed.trim();
		const idx = rest.toLowerCase().indexOf(needle.toLowerCase());
		if (idx < 0) return null;
		const before = cleanChunk(rest.slice(0, idx));
		if (before) segments.push({ kind: 'text', text: before });
		segments.push({ kind: 'blank' });
		rest = rest.slice(idx + needle.length);
	}
	const tail = cleanChunk(rest);
	if (tail) segments.push({ kind: 'text', text: tail });
	if (segments.filter((segment) => segment.kind === 'blank').length !== fixedParts.length) return null;
	return segments;
}

export function patternChunks(
	frame: string,
	slots: Array<{ id: string }>,
	slotValues: StoredSlotValue[],
): string[] | null {
	const parts = frame.split('___');
	if (parts.length !== slots.length + 1) return null;
	const chunks: string[] = [];
	parts.forEach((part, index) => {
		const fixed = cleanChunk(part);
		if (fixed) chunks.push(fixed);
		const slot = slots[index];
		if (!slot) return;
		const value = cleanChunk(slotValues.find((item) => item.id === slot.id)?.value ?? '');
		if (!value) return;
		chunks.push(value);
	});
	return chunks.length >= 2 ? chunks : null;
}

function choiceList(answer: string, distractors: string[]): string[] | null {
	const choices = uniqueTexts([answer, ...distractors]);
	if (choices.length < 3 || !choices.some((choice) => choice.toLowerCase() === answer.toLowerCase())) return null;
	return choices.slice(0, 4);
}

function usageSafe(word: StoredWord, example: StoredExample): boolean {
	if (example.role !== 'grade' || !example.gradeEligible) return false;
	if (!example.audioFile.trim() || !isFullVietnameseMeaning(example.meaningVi, word.meaningVi)) return false;
	return blankReport(example.english, example.target).ok;
}

function pushUsage(drafts: QuestionDraft[], word: StoredWord, example: StoredExample, stage: EnglishStageName) {
	const blank = splitBlank(example.english);
	if (!blank || !usageSafe(word, example)) return;
	drafts.push({
		key: `sense:${word.id}:example:${example.id}:usage:${stage}`,
		kind: 'usage_fill',
		skill: 'usage',
		stage,
		senseKey: word.id,
		patternKey: null,
		exampleKey: example.id,
		answer: example.target,
		audioFile: example.audioFile,
		prompt: {
			kind: 'usage_fill',
			before: blank.before,
			after: blank.after,
			meaningVi: example.meaningVi,
			firstLetter: stage === 'new' ? example.target.slice(0, 1) : null,
			exampleId: example.id,
		},
	});
}

function questionsForWord(word: StoredWord): QuestionDraft[] {
	const drafts: QuestionDraft[] = [];
	if (!word.audioFile.trim() || !word.lemma.trim() || !word.meaningVi.trim()) return drafts;
	const meanings = choiceList(word.meaningVi, word.distractorMeanings);
	const lemmas = choiceList(word.lemma, word.distractorLemmas);
	if (meanings) {
		drafts.push({
			key: `sense:${word.id}:meaning:new`,
			kind: 'meaning_choice',
			skill: 'meaning',
			stage: 'new',
			senseKey: word.id,
			patternKey: null,
			exampleKey: null,
			answer: word.meaningVi,
			audioFile: word.audioFile,
			prompt: { kind: 'meaning_choice', lemma: word.lemma, ipa: word.ipa, choices: meanings },
		});
		for (const stage of ['recall', 'maintain'] as const) {
			drafts.push({
				key: `sense:${word.id}:meaning:${stage}`,
				kind: 'meaning_confusable',
				skill: 'meaning',
				stage,
				senseKey: word.id,
				patternKey: null,
				exampleKey: null,
				answer: word.meaningVi,
				audioFile: word.audioFile,
				prompt: { kind: 'meaning_confusable', lemma: word.lemma, ipa: word.ipa, choices: meanings },
			});
		}
	}
	if (lemmas) {
		drafts.push({
			key: `sense:${word.id}:sound:new`,
			kind: 'listen_choice',
			skill: 'sound',
			stage: 'new',
			senseKey: word.id,
			patternKey: null,
			exampleKey: null,
			answer: word.lemma,
			audioFile: word.audioFile,
			prompt: { kind: 'listen_choice', choices: lemmas },
		});
	}
	drafts.push({
		key: `sense:${word.id}:sound:recall`,
		kind: 'listen_type',
		skill: 'sound',
		stage: 'recall',
		senseKey: word.id,
		patternKey: null,
		exampleKey: null,
		answer: word.lemma,
		audioFile: word.audioFile,
		prompt: { kind: 'listen_type', meaningVi: word.meaningVi },
	});
	drafts.push({
		key: `sense:${word.id}:sound:maintain`,
		kind: 'spell_type',
		skill: 'sound',
		stage: 'maintain',
		senseKey: word.id,
		patternKey: null,
		exampleKey: null,
		answer: word.lemma,
		audioFile: word.audioFile,
		prompt: { kind: 'spell_type', meaningVi: word.meaningVi },
	});
	for (const example of word.examples) {
		for (const stage of ['new', 'recall', 'maintain'] as const) pushUsage(drafts, word, example, stage);
	}
	return drafts;
}

function patternExampleSafe(pattern: StoredPattern, example: StoredPatternExample): boolean {
	if (!example.audioFile.trim() || !isFullVietnameseMeaning(example.meaningVi, pattern.purposeVi)) return false;
	return fixedPartsInOrder(example.english, pattern.fixedParts);
}

function questionsForPattern(pattern: StoredPattern): QuestionDraft[] {
	const drafts: QuestionDraft[] = [];
	const usable = pattern.examples.filter((example) => patternExampleSafe(pattern, example));
	if (usable.length < 2 || pattern.fixedParts.length < 1) return drafts;
	const first = usable[0];
	if (!first) return drafts;
	const chunks = patternChunks(pattern.frame, pattern.slots, first.slotValues);
	if (chunks) {
		drafts.push({
			key: `pattern:${pattern.id}:order:new`,
			kind: 'pattern_order',
			skill: 'pattern',
			stage: 'new',
			senseKey: null,
			patternKey: pattern.id,
			exampleKey: first.id,
			answer: chunks.join('|'),
			audioFile: first.audioFile,
			prompt: { kind: 'pattern_order', purposeVi: pattern.purposeVi, chunks, exampleId: first.id },
		});
	}
	for (const example of usable) {
		const segments = blankFixedParts(example.english, pattern.fixedParts);
		if (!segments) continue;
		for (const stage of ['recall', 'maintain'] as const) {
			drafts.push({
				key: `pattern:${pattern.id}:example:${example.id}:fill:${stage}`,
				kind: 'pattern_fill',
				skill: 'pattern',
				stage,
				senseKey: null,
				patternKey: pattern.id,
				exampleKey: example.id,
				answer: pattern.fixedParts.join('|'),
				audioFile: example.audioFile,
				prompt: {
					kind: 'pattern_fill',
					purposeVi: pattern.purposeVi,
					meaningVi: example.meaningVi,
					segments,
					exampleId: example.id,
				},
			});
		}
	}
	return drafts;
}

export function questionsFromContent(input: { words: StoredWord[]; patterns: StoredPattern[] }): QuestionDraft[] {
	return [
		...input.words.flatMap(questionsForWord),
		...input.patterns.flatMap(questionsForPattern),
	];
}

export function draftsForAssessedPack(assessment: AssessedPack): QuestionDraft[] {
	if (!assessment.pack) return [];
	const words: StoredWord[] = assessment.words.filter((word) => word.publishable).map((assessed) => {
		const word = assessment.pack?.words[assessed.index];
		if (!word) return null;
		return {
			id: `word:${assessed.index}`,
			lemma: word.lemma,
			ipa: word.ipa,
			meaningVi: word.meaningVi,
			audioFile: word.audioFile,
			distractorMeanings: word.distractorMeanings,
			distractorLemmas: word.distractorLemmas,
			examples: word.examples.map((example, index) => {
				const result = assessed.examples.find((item) => item.index === index);
				const gradeEligible = result?.gradeEligible === true;
				return {
					id: `word:${assessed.index}:example:${index}`,
					english: example.english,
					meaningVi: example.meaningVi,
					target: example.target,
					audioFile: example.audioFile,
					role: gradeEligible ? 'grade' as const : 'study' as const,
					gradeEligible,
				};
			}),
		};
	}).filter((word): word is StoredWord => word != null);

	const patterns: StoredPattern[] = assessment.patterns.filter((pattern) => pattern.publishable).map((assessed) => {
		const pattern = assessment.pack?.patterns[assessed.index];
		if (!pattern) return null;
		return {
			id: `pattern:${assessed.index}`,
			purposeVi: pattern.purposeVi,
			frame: pattern.frame,
			fixedParts: pattern.fixedParts,
			slots: pattern.slots,
			examples: pattern.examples.map((example, index) => ({
				id: `pattern:${assessed.index}:example:${index}`,
				english: example.english,
				meaningVi: example.meaningVi,
				audioFile: example.audioFile,
				slotValues: example.slotValues,
			})),
		};
	}).filter((pattern): pattern is StoredPattern => pattern != null);

	return questionsFromContent({ words, patterns });
}
