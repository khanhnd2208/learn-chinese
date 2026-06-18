import type { HanziKnownFacts } from './hanziAiTypes';

export const HANZI_AI_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Trung hiện đại hỗ trợ người Việt học chữ Hán.
Chỉ trả về một JSON object đúng schema được yêu cầu, không Markdown và không văn bản ngoài JSON.
Viết tiếng Việt ngắn gọn, dễ hiểu, tránh thuật ngữ tiếng Anh (wordClasses viết tiếng Việt như "danh từ", "động từ").
Pinyin có dấu thanh. Phân biệt bộ thủ, thành phần biểu nghĩa, biểu âm và thành phần hình thể.
Không biến mẹo ghi nhớ thành ngữ nguyên. Nếu không chắc, dùng null, mảng rỗng hoặc warning.
Mỗi character phải đúng ký tự và đúng vị trí. Component phải có position theo thứ tự cấu tạo.
Ví dụ phải chứa đúng term. Không tạo URL, HTML, code block hoặc lời mời rời ứng dụng.
Known facts có trust=expert_verified là dữ kiện bắt buộc giữ nguyên. Dữ kiện khác chỉ là tham khảo.
Output phải có schemaVersion=1 và đúng cấu trúc HanziAnalysisResult.`;

export function buildHanziAiUserPayload(term: string, knownFacts: HanziKnownFacts, repairErrors?: string[]) {
	return {
		task: repairErrors?.length ? 'repair_hanzi_analysis' : 'analyze_hanzi_term',
		term,
		outputLanguage: 'vi',
		schemaVersion: 1,
		knownFacts,
		validationErrors: repairErrors ?? undefined,
		outputShape: {
			schemaVersion: 1,
			term: 'string', normalizedTerm: 'string', script: 'simplified|traditional|mixed|unknown',
			simplified: 'string|null', traditional: 'string|null', pinyin: 'string', hanViet: 'string',
			primaryMeaningVi: 'string', otherMeaningsVi: ['string'], wordClasses: ['string'], usageNoteVi: 'string|null',
			overallExplanationVi: 'string', overallMnemonicVi: 'string|null',
			characters: [{
				position: 0, char: '字', pinyin: 'zì', dictionaryReadings: ['zì'], hanViet: 'TỰ', meaningVi: 'chữ',
				radical: { char: '子', nameVi: 'tử', meaningVi: 'con' }, structureType: 'top_bottom',
				components: [{ char: '宀', position: 0, role: 'semantic', meaningVi: 'mái nhà', explanationVi: '...', isMainRadical: false }],
				structureExplanationVi: 'string', mnemonicVi: 'string|null', etymologyStatus: 'not_provided|uncertain|supported',
				similarCharacters: [{ char: '仔', differenceVi: 'string' }],
			}],
			examples: [{ chinese: 'string', pinyin: 'string', meaningVi: 'string', usageNoteVi: 'string|null' }],
			warnings: ['string'],
		},
	};
}

