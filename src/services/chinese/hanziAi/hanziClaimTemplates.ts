import type { PhoneticKind } from './hanziTrustRegistry';

export function buildPhoneticPublishExplanation(
	component: string,
	hostChar: string,
	kind: PhoneticKind,
	componentReading?: string,
): string {
	if (kind === 'modern') {
		return componentReading
			? `${component} là thành phần gợi âm; cách đọc hiện tại gần hoặc trùng với ${hostChar} (${componentReading}).`
			: `${component} là thành phần gợi âm hiện đại của ${hostChar}.`;
	}
	return `${component} có quan hệ gợi âm trong lịch sử hình thành chữ ${hostChar}; không dùng cách đọc hiện đại của ${component} để đoán trực tiếp âm ${hostChar}.`;
}

export function buildSemanticPublishExplanation(component: string, meaningVi: string | null): string {
	return meaningVi
		? `${component} gợi ý nghĩa liên quan đến “${meaningVi}”.`
		: `${component} là thành phần gợi nghĩa đã được kiểm chứng.`;
}

export function buildVisualPublishExplanation(component: string, hostChar: string): string {
	return `Thành phần ${component} dễ nhận thấy trong chữ ${hostChar}.`;
}

export const DECOMPOSITION_UNAVAILABLE_MESSAGE = 'Chưa có phân tích cấu tạo đáng tin cậy.';
export const DECOMPOSITION_VISUAL_ONLY_NOTE = 'Chỉ mô tả hình thể nhìn thấy — chưa khẳng định từ nguyên.';

/** Defense-in-depth only — not used to build published phonetic text. */
export const UNVERIFIED_PHONETIC_LANGUAGE =
	/\b(gợi âm|biến âm|cung cấp âm|gợi ý cách đọc|chỉ âm|âm đọc gần|đọc gần|phát âm gần)\b/i;

export const ANCIENT_FORM_LANGUAGE = /\b(dạng cổ|ancient form|thiếu bộ.*ở trên)\b/i;

export function containsUnverifiedPhoneticLanguage(text: string): boolean {
	return UNVERIFIED_PHONETIC_LANGUAGE.test(text);
}

export function containsAncientFormLanguage(text: string): boolean {
	return ANCIENT_FORM_LANGUAGE.test(text);
}
