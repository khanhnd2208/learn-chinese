import { z } from 'zod';
import {
	EN_ALTERNATIVES_REQUIRED,
	EN_MAX_PATTERNS_PER_PACK,
	EN_MAX_WORDS_PER_PACK,
	EN_PATTERN_MIN_EXAMPLES,
	EN_USAGE_MIN_GRADE_EXAMPLES,
} from '@/lib/english/constants';
import {
	blankReport,
	fixedPartsInOrder,
	isFullVietnameseMeaning,
	uniqueTexts,
} from '@/lib/english/text';

const exampleSchema = z.object({
	english: z.string().default(''),
	meaningVi: z.string().default(''),
	target: z.string().default(''),
	audioFile: z.string().default(''),
	alternativesTried: z.array(z.string()).default([]),
	stillPlausible: z.array(z.string()).default([]),
	adminCleared: z.boolean().optional(),
});

const wordSchema = z.object({
	lemma: z.string().default(''),
	ipa: z.string().default(''),
	stress: z.string().default(''),
	partOfSpeech: z.string().default(''),
	forms: z.array(z.string()).default([]),
	meaningVi: z.string().default(''),
	collocations: z.array(z.string()).max(2).default([]),
	pitfallVi: z.string().default(''),
	audioFile: z.string().default(''),
	distractorMeanings: z.array(z.string()).default([]),
	distractorLemmas: z.array(z.string()).default([]),
	examples: z.array(exampleSchema).max(3).default([]),
});

const patternExampleSchema = z.object({
	english: z.string().default(''),
	meaningVi: z.string().default(''),
	audioFile: z.string().default(''),
	slotValues: z.array(z.object({
		id: z.string(),
		value: z.string(),
	})).default([]),
});

const patternSchema = z.object({
	purposeVi: z.string().default(''),
	frame: z.string().default(''),
	fixedParts: z.array(z.string()).default([]),
	slots: z.array(z.object({
		id: z.string(),
		labelVi: z.string().default(''),
		choices: z.array(z.string()).default([]),
	})).default([]),
	pitfallVi: z.string().default(''),
	senseLemmas: z.array(z.string()).default([]),
	examples: z.array(patternExampleSchema).max(4).default([]),
});

export const englishPackSchema = z.object({
	title: z.string().default(''),
	description: z.string().default(''),
	audioFiles: z.array(z.string()).default([]),
	words: z.array(wordSchema).max(EN_MAX_WORDS_PER_PACK).default([]),
	patterns: z.array(patternSchema).max(EN_MAX_PATTERNS_PER_PACK).default([]),
});

export type EnglishPack = z.infer<typeof englishPackSchema>;
export type PackWord = EnglishPack['words'][number];
export type PackExample = PackWord['examples'][number];
export type PackPattern = EnglishPack['patterns'][number];

export interface ContentIssue {
	path: string;
	code: string;
	message: string;
	blocksGrade: boolean;
}

export interface AssessedExample {
	index: number;
	gradeEligible: boolean;
	issues: ContentIssue[];
}

export interface AssessedWord {
	index: number;
	publishable: boolean;
	gradeExampleCount: number;
	examples: AssessedExample[];
	issues: ContentIssue[];
}

export interface AssessedPattern {
	index: number;
	publishable: boolean;
	issues: ContentIssue[];
}

export interface AssessedPack {
	schemaError: string | null;
	pack: EnglishPack | null;
	issues: ContentIssue[];
	words: AssessedWord[];
	patterns: AssessedPattern[];
}

function issue(path: string, code: string, message: string, blocksGrade: boolean): ContentIssue {
	return { path, code, message, blocksGrade };
}

function audioListed(file: string, files: string[]): boolean {
	const name = file.trim();
	return name.length > 0 && files.includes(name);
}

export function normalizeEnglishPack(pack: EnglishPack): EnglishPack {
	return {
		...pack,
		audioFiles: uniqueTexts(pack.audioFiles),
		words: pack.words.map((word, index) => {
			const others = pack.words.filter((_, other) => other !== index);
			const meanings = word.distractorMeanings.length
				? word.distractorMeanings
				: others.map((other) => other.meaningVi);
			const lemmas = word.distractorLemmas.length
				? word.distractorLemmas
				: others.map((other) => other.lemma);
			return {
				...word,
				distractorMeanings: uniqueTexts(meanings).filter((meaning) => meaning.toLowerCase() !== word.meaningVi.trim().toLowerCase()),
				distractorLemmas: uniqueTexts(lemmas).filter((lemma) => lemma.toLowerCase() !== word.lemma.trim().toLowerCase()),
			};
		}),
	};
}

function assessExample(
	word: PackWord,
	example: PackExample,
	exampleIndex: number,
	audioFiles: string[],
): AssessedExample {
	const path = `words.${word.lemma || '?'}.examples.${exampleIndex}`;
	const issues: ContentIssue[] = [];
	const blank = blankReport(example.english, example.target);
	if (!blank.ok) {
		issues.push(issue(path, blank.code ?? 'one_blank', 'Câu điền phải có đúng một chỗ trống và đúng dạng từ mục tiêu.', true));
	}
	const forms = new Set([word.lemma, ...word.forms].map((form) => form.trim().toLowerCase()).filter(Boolean));
	if (!forms.has(example.target.trim().toLowerCase())) {
		issues.push(issue(path, 'word_form', 'Đáp án điền phải là từ đang học hoặc một dạng của từ đó.', true));
	}
	if (!isFullVietnameseMeaning(example.meaningVi, word.meaningVi)) {
		issues.push(issue(path, 'meaning_vi', 'Câu điền cần nghĩa tiếng Việt đầy đủ, không chỉ ghi nghĩa từ.', true));
	}
	if (!audioListed(example.audioFile, audioFiles)) {
		issues.push(issue(path, 'audio', 'Câu dùng để chấm cần file audio có trong bảng đối chiếu.', true));
	}
	if (example.alternativesTried.map((item) => item.trim()).filter(Boolean).length < EN_ALTERNATIVES_REQUIRED) {
		issues.push(issue(path, 'alternatives', `Cần thử ít nhất ${EN_ALTERNATIVES_REQUIRED} từ khác có thể điền.`, true));
	}
	const plausible = example.stillPlausible.map((item) => item.trim()).filter(Boolean);
	if (plausible.length > 0 && !example.adminCleared) {
		issues.push(issue(
			path,
			'ambiguous',
			`Còn từ khác hợp với cả câu Anh và nghĩa Việt: ${plausible.join(', ')}. Câu này chỉ được làm ví dụ học.`,
			true,
		));
	}
	return { index: exampleIndex, gradeEligible: issues.length === 0, issues };
}

function assessWord(word: PackWord, index: number, audioFiles: string[]): AssessedWord {
	const path = `words.${word.lemma || index}`;
	const issues: ContentIssue[] = [];
	if (!word.lemma.trim()) issues.push(issue(path, 'lemma', 'Thiếu từ tiếng Anh.', true));
	if (!word.ipa.trim()) issues.push(issue(path, 'ipa', 'Thiếu IPA.', true));
	if (!word.partOfSpeech.trim()) issues.push(issue(path, 'part_of_speech', 'Thiếu loại từ.', true));
	if (!word.meaningVi.trim()) issues.push(issue(path, 'meaning_vi', 'Thiếu nghĩa tiếng Việt của từ.', true));
	if (word.collocations.map((item) => item.trim()).filter(Boolean).length < 1) {
		issues.push(issue(path, 'collocation', 'Cần 1–2 collocation.', true));
	}
	if (!audioListed(word.audioFile, audioFiles)) {
		issues.push(issue(path, 'audio', 'Từ cần file audio có trong bảng đối chiếu trước khi xuất bản.', true));
	}
	if (word.distractorMeanings.length < 2) {
		issues.push(issue(path, 'distractors', 'Cần ít nhất hai nghĩa dễ nhầm để làm câu chọn nghĩa.', true));
	}
	if (word.distractorLemmas.length < 2) {
		issues.push(issue(path, 'distractor_lemmas', 'Cần ít nhất hai từ dễ nhầm để làm câu nghe–chọn.', true));
	}
	const examples = word.examples.map((example, exampleIndex) => assessExample(word, example, exampleIndex, audioFiles));
	const gradeExampleCount = examples.filter((example) => example.gradeEligible).length;
	if (gradeExampleCount < EN_USAGE_MIN_GRADE_EXAMPLES) {
		issues.push(issue(
			path,
			'usage_examples',
			`Cần ít nhất ${EN_USAGE_MIN_GRADE_EXAMPLES} câu điền đã đủ điều kiện trước khi mở kỹ năng dùng từ.`,
			true,
		));
	}
	const wordLevel = issues.filter((item) => item.code !== 'usage_examples');
	return {
		index,
		publishable: wordLevel.length === 0,
		gradeExampleCount,
		examples,
		issues: [...issues, ...examples.flatMap((example) => example.issues)],
	};
}

function assessPattern(pattern: PackPattern, index: number, audioFiles: string[]): AssessedPattern {
	const path = `patterns.${index}`;
	const issues: ContentIssue[] = [];
	if (!pattern.purposeVi.trim()) issues.push(issue(path, 'purpose', 'Thiếu mục đích giao tiếp của mẫu câu.', true));
	if (!pattern.frame.includes('___')) issues.push(issue(path, 'frame', 'Khung mẫu cần có vị trí thay thế ___ .', true));
	if (pattern.fixedParts.map((part) => part.trim()).filter(Boolean).length < 1) {
		issues.push(issue(path, 'fixed_parts', 'Cần ít nhất một phần cố định để chấm.', true));
	}
	const blanks = pattern.frame.split('___').length - 1;
	if (pattern.slots.length !== blanks) {
		issues.push(issue(path, 'slots', 'Số vị trí thay thế phải khớp với số chỗ ___ trong khung.', true));
	}
	if (pattern.slots.some((slot) => !slot.id.trim() || !slot.labelVi.trim() || slot.choices.filter(Boolean).length < 1)) {
		issues.push(issue(path, 'slot_choices', 'Mỗi vị trí thay thế cần nhãn và ít nhất một lựa chọn.', true));
	}
	if (pattern.examples.length < EN_PATTERN_MIN_EXAMPLES) {
		issues.push(issue(path, 'examples', `Mẫu câu cần ít nhất ${EN_PATTERN_MIN_EXAMPLES} ví dụ với bộ thành phần khác nhau.`, true));
	}
	pattern.examples.forEach((example, exampleIndex) => {
		const examplePath = `${path}.examples.${exampleIndex}`;
		if (!isFullVietnameseMeaning(example.meaningVi, pattern.purposeVi)) {
			issues.push(issue(examplePath, 'meaning_vi', 'Ví dụ mẫu câu cần nghĩa tiếng Việt đầy đủ.', true));
		}
		if (!audioListed(example.audioFile, audioFiles)) {
			issues.push(issue(examplePath, 'audio', 'Ví dụ mẫu câu cần file audio có trong bảng đối chiếu.', true));
		}
		if (!fixedPartsInOrder(example.english, pattern.fixedParts)) {
			issues.push(issue(examplePath, 'fixed_parts', 'Câu ví dụ phải chứa các phần cố định đúng thứ tự.', true));
		}
		const missingSlot = pattern.slots.some((slot) => !example.slotValues.some((value) => value.id === slot.id && value.value.trim()));
		if (missingSlot) issues.push(issue(examplePath, 'slot_values', 'Ví dụ thiếu giá trị cho vị trí thay thế.', true));
	});
	return { index, publishable: issues.length === 0, issues };
}

export function assessEnglishPack(input: unknown): AssessedPack {
	const parsed = englishPackSchema.safeParse(input);
	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message ?? 'Gói nội dung không đúng cấu trúc.';
		return { schemaError: message, pack: null, issues: [], words: [], patterns: [] };
	}
	if (!parsed.data.title.trim()) {
		const titleIssue = issue('title', 'title', 'Thiếu tên bộ học.', true);
		return { schemaError: null, pack: parsed.data, issues: [titleIssue], words: [], patterns: [] };
	}
	const pack = normalizeEnglishPack(parsed.data);
	const words = pack.words.map((word, index) => assessWord(word, index, pack.audioFiles));
	const patterns = pack.patterns.map((pattern, index) => assessPattern(pattern, index, pack.audioFiles));
	const issues = [
		...words.flatMap((word) => word.issues),
		...patterns.flatMap((pattern) => pattern.issues),
	];
	return { schemaError: null, pack, issues, words, patterns };
}
