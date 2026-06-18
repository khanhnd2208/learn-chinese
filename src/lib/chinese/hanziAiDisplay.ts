import type { HanziComponentAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisSchema';

type ComponentRole = HanziComponentAnalysis['role'];

export const HANZI_COMPONENT_ROLE_LABELS: Record<ComponentRole, { label: string; hint: string }> = {
	semantic: {
		label: 'Gợi ý nghĩa',
		hint: 'Phần này giúp bạn hiểu hoặc đoán nghĩa của chữ.',
	},
	phonetic: {
		label: 'Gợi ý cách đọc',
		hint: 'Phần này gợi ý âm đọc; không nhất thiết trùng hệt pinyin hiện tại.',
	},
	form: {
		label: 'Hình dạng',
		hint: 'Phần này chủ yếu là hình thể, ít mang nghĩa trực tiếp.',
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

export function formatHanziComponentRole(role: ComponentRole): { label: string; hint: string } {
	return HANZI_COMPONENT_ROLE_LABELS[role] ?? HANZI_COMPONENT_ROLE_LABELS.unknown;
}

export function formatHanziStructureType(
	structureType: 'single' | 'left_right' | 'top_bottom' | 'enclosure' | 'partial_enclosure' | 'three_part' | 'overlapping' | 'unknown',
): string {
	return HANZI_STRUCTURE_LABELS[structureType] ?? HANZI_STRUCTURE_LABELS.unknown;
}
