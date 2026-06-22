import type { HanziKnownFacts } from './hanziAiTypes';

export const HANZI_AI_SYSTEM_PROMPT = `Bạn là chuyên gia tiếng Trung hiện đại hỗ trợ người Việt học chữ Hán.
Chỉ trả về một JSON object đúng schema được yêu cầu, không Markdown và không văn bản ngoài JSON.
Viết tiếng Việt ngắn gọn, dễ hiểu, tránh thuật ngữ tiếng Anh (wordClasses viết tiếng Việt như "danh từ", "tính từ").

QUY TẮC PHÂN TÍCH (bắt buộc):
1. Mặc định mọi thành phần dùng role=form hoặc role=semantic. CẤM role=phonetic — server sẽ xác minh gợi âm từ registry.
2. structureExplanationVi: CHỈ mô tả vị trí/hình thể (trái-phải, trên-dưới). CẤM viết gợi âm, biến âm, "đọc gần", "cung cấp âm".
3. mnemonicVi và overallMnemonicVi: CHỈ liên tưởng ghi nhớ. Có thể dùng → trong mnemonic. KHÔNG trình bày như từ nguyên chắc chắn.
4. CẤM: 木 gợi âm trong 休; 侵 có nghĩa ngủ hoặc dạng cổ của 寢; 頁 yè → yōu; biến âm từ X sang Y.
5. 休 là chữ hội ý (亻 + 木), không phải hình thanh — không gán gợi âm cho bất kỳ thành phần nào.
6. 寢, 鬱: chỉ mô tả hình thể nhìn thấy; không suy luận từ nguyên sâu; thêm warning nếu không chắc.
7. Bộ thủ: ghi dạng hiển thị (亻, 氵) và nêu bộ chuẩn nếu biết (人, 水).
8. wordClasses, usageNoteVi, nghĩa từ, ví dụ: ưu tiên chính xác và tự nhiên tiếng Việt.
9. Không điền normalizedTerm/requestTerm — server quyết định. term phải khớp input.
10. structureType chỉ dùng: single, left_right, top_bottom, enclosure, partial_enclosure, three_part, overlapping, unknown.

Known facts trust=expert_verified: giữ nguyên. Không tạo URL/HTML/Markdown.
Output schemaVersion=1 (draft); server áp dụng trust policy trước khi công bố.`;

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
			term: 'string', script: 'simplified|traditional|mixed|unknown',
			simplified: 'string|null', traditional: 'string|null', pinyin: 'string', hanViet: 'string',
			primaryMeaningVi: 'string', otherMeaningsVi: ['string'], wordClasses: ['string'], usageNoteVi: 'string|null',
			overallExplanationVi: 'string', overallMnemonicVi: 'string|null',
			characters: [{
				position: 0, char: '字', pinyin: 'zì', dictionaryReadings: ['zì'], hanViet: 'TỰ', meaningVi: 'chữ',
				radical: { char: '子', nameVi: 'tử', meaningVi: 'con' }, structureType: 'top_bottom',
				components: [{ char: '宀', position: 0, role: 'form', meaningVi: 'mái nhà', explanationVi: 'Phần trên của chữ.', isMainRadical: false }],
				structureExplanationVi: 'Mô tả vị trí/hình thể only', mnemonicVi: 'string|null', etymologyNoteVi: 'string|null',
				etymologyStatus: 'not_provided|uncertain|supported',
				similarCharacters: [{ char: '仔', differenceVi: 'string' }],
			}],
			examples: [{ chinese: 'string', pinyin: 'string', meaningVi: 'string', usageNoteVi: 'string|null' }],
			warnings: ['string'],
		},
	};
}
