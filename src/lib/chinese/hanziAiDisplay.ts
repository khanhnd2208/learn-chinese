import type { HanziComponentAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import type { HanziPartLexiconEntry } from '@/services/chinese/hanziAi/hanziAiTypes';
import {
	DECOMPOSITION_UNAVAILABLE_MESSAGE,
	DECOMPOSITION_VISUAL_ONLY_NOTE,
} from '@/services/chinese/hanziAi/hanziClaimTemplates';

type ComponentRole = HanziComponentAnalysis['role'];

export const HANZI_SCRIPT_LABELS: Record<string, string> = {
	simplified: 'Giản thể',
	traditional: 'Phồn thể',
	mixed: 'Hỗn hợp',
	unknown: 'Chưa rõ hệ chữ',
};

export const HANZI_COMPONENT_ROLE_LABELS: Record<ComponentRole, { label: string; hint: string; verified?: boolean }> = {
	semantic: {
		label: 'Gợi ý nghĩa',
		hint: 'Phần này thường gợi ý nghĩa — không phải toàn bộ nghĩa của chữ.',
	},
	phonetic: {
		label: 'Gợi âm (đã kiểm chứng)',
		hint: 'Thành phần gợi âm có căn cứ từ registry; không dùng để đoán âm máy móc.',
		verified: true,
	},
	form: {
		label: 'Thành phần nhìn thấy',
		hint: 'Phần hình thể dễ nhận ra trên chữ hiện đại.',
	},
	radical: {
		label: 'Bộ thủ',
		hint: 'Bộ dùng để tra chữ trong từ điển Hán.',
	},
	unknown: {
		label: 'Chưa rõ vai trò',
		hint: '',
	},
};

export const HANZI_PHONETIC_KIND_LABELS = {
	modern: 'Gợi âm hiện đại (đã kiểm chứng)',
	historical: 'Gợi âm lịch sử (đã kiểm chứng)',
} as const;

export const HANZI_STRUCTURE_LABELS: Record<
	'single' | 'left_right' | 'top_bottom' | 'enclosure' | 'partial_enclosure' | 'three_part' | 'overlapping' | 'unknown',
	string
> = {
	single: 'Một chữ đứng riêng',
	left_right: 'Ghép trái — phải',
	top_bottom: 'Ghép trên — dưới',
	enclosure: 'Bao bọc bên ngoài',
	partial_enclosure: 'Bao bọc một phần',
	three_part: 'Ghép ba phần',
	overlapping: 'Chồng lên nhau',
	unknown: 'Kiểu ghép chưa rõ',
};

export const HANZI_ETYMOLOGY_LABELS: Record<'not_provided' | 'uncertain' | 'supported', string> = {
	not_provided: 'Chưa có ghi chú từ nguyên',
	uncertain: 'Từ nguyên chưa chắc chắn',
	supported: 'Có căn cứ từ nguyên',
};

export { DECOMPOSITION_UNAVAILABLE_MESSAGE, DECOMPOSITION_VISUAL_ONLY_NOTE };

export function formatHanziScript(script: string): string {
	return HANZI_SCRIPT_LABELS[script] ?? HANZI_SCRIPT_LABELS.unknown;
}

export function formatHanziComponentRole(role: ComponentRole): { label: string; hint: string; verified?: boolean } {
	return HANZI_COMPONENT_ROLE_LABELS[role] ?? HANZI_COMPONENT_ROLE_LABELS.unknown;
}

export function formatHanziPhoneticKind(kind: 'modern' | 'historical' | null | undefined): string | null {
	if (!kind) return null;
	return HANZI_PHONETIC_KIND_LABELS[kind];
}

export function formatHanziStructureType(
	structureType: 'single' | 'left_right' | 'top_bottom' | 'enclosure' | 'partial_enclosure' | 'three_part' | 'overlapping' | 'unknown',
): string {
	return HANZI_STRUCTURE_LABELS[structureType] ?? HANZI_STRUCTURE_LABELS.unknown;
}

export function formatHanziEtymologyStatus(status: 'not_provided' | 'uncertain' | 'supported'): string {
	return HANZI_ETYMOLOGY_LABELS[status];
}

export function getComponentDisplayText(component: HanziComponentAnalysis): string | null {
	if (component.publishExplanationVi) return component.publishExplanationVi;
	if (component.claimTrust === 'unverified') return null;
	return component.explanationVi;
}

export interface PartDisplayFallbacks {
	hanViet?: string | null;
	meaningVi?: string | null;
}

export interface ResolvedPartDisplay {
	char: string;
	pinyin: string | null;
	hanViet: string | null;
	meaningVi: string | null;
	incomplete: boolean;
}

export function resolvePartDisplay(
	char: string,
	lexiconEntry: HanziPartLexiconEntry | undefined,
	fallbacks?: PartDisplayFallbacks,
): ResolvedPartDisplay {
	const hanViet = lexiconEntry?.hanViet ?? fallbacks?.hanViet ?? null;
	const meaningVi = lexiconEntry?.meaningVi ?? fallbacks?.meaningVi ?? null;
	const pinyin = lexiconEntry?.pinyin ?? null;
	const incomplete = !pinyin || !hanViet || !meaningVi;
	return {
		char,
		pinyin,
		hanViet: hanViet ? hanViet.toUpperCase() : null,
		meaningVi,
		incomplete,
	};
}
