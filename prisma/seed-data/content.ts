/* ════════════════════════════════════════════════════════════════════════
   Sample Chinese content — HSK1 phong phú cho người mới học vài buổi đầu
   Đủ test: 7 dạng bài, SRS 3 kênh, Dashboard, câu điền
   ════════════════════════════════════════════════════════════════════════ */

export interface SimilarGroupSeed {
	key: string;
	note: string;
}

export interface HanziSeed {
	char: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	components: string[];
	radical: string;
	mnemonicVi: string;
	similarGroupKey?: string;
}

export interface WordSeed {
	simplified: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	partOfSpeech: string;
	hskLevel: number;
	mnemonicVi: string;
	chars: string[];
	example?: { hanzi: string; pinyin: string; meaningVi: string };
	pattern?: { template: string; samples: string };
}

/** 2 nhóm chữ gần giống — test Hanzi Lab + similar_char */
export const SIMILAR_GROUPS: SimilarGroupSeed[] = [
	{ key: '青', note: '请/情/清/晴 — cùng thanh "thanh", khác bộ thủ' },
	{ key: '分', note: '分/份/纷/粉 — cùng âm "phân", khác bộ thủ' },
];

/** ~70 hán tự — đủ cho từ vựng HSK1 + nhóm tương tự */
export const HANZI: HanziSeed[] = [
	// ── Đại từ & cơ bản ──
	{ char: '我', pinyin: 'wǒ', hanViet: 'NGÃ', meaningVi: 'tôi', components: [], radical: '戈', mnemonicVi: 'Tôi cầm vũ khí (戈) bảo vệ bản thân.' },
	{ char: '你', pinyin: 'nǐ', hanViet: 'NHỈ', meaningVi: 'bạn', components: ['亻', '尔'], radical: '亻', mnemonicVi: 'Người (亻) đứng trước bạn.' },
	{ char: '他', pinyin: 'tā', hanViet: 'THA', meaningVi: 'anh ấy', components: ['亻', '也'], radical: '亻', mnemonicVi: 'Người (亻) khác — anh ấy.' },
	{ char: '她', pinyin: 'tā', hanViet: 'THA', meaningVi: 'cô ấy', components: ['女', '也'], radical: '女', mnemonicVi: 'Người phụ nữ (女) — cô ấy.' },
	{ char: '是', pinyin: 'shì', hanViet: 'THỊ', meaningVi: 'là', components: ['日', '正'], radical: '日', mnemonicVi: 'Mặt trời (日) đúng (正) — là.' },
	{ char: '不', pinyin: 'bù', hanViet: 'BẤT', meaningVi: 'không', components: [], radical: '一', mnemonicVi: 'Một nét ngang cắt — phủ định.' },
	{ char: '很', pinyin: 'hěn', hanViet: 'NGẬN', meaningVi: 'rất', components: ['彳', '艮'], radical: '彳', mnemonicVi: 'Bước đi (彳) mạnh — rất.' },
	{ char: '人', pinyin: 'rén', hanViet: 'NHÂN', meaningVi: 'người', components: [], radical: '人', mnemonicVi: 'Hình người đang đi.' },
	{ char: '在', pinyin: 'zài', hanViet: 'TẠI', meaningVi: 'ở, tại', components: ['才', '土'], radical: '土', mnemonicVi: 'Người (才) ở trên đất (土).' },
	{ char: '有', pinyin: 'yǒu', hanViet: 'HỮU', meaningVi: 'có', components: ['月', '又'], radical: '月', mnemonicVi: 'Tay (又) cầm thịt (月) — có.' },
	{ char: '这', pinyin: 'zhè', hanViet: 'GIÁ', meaningVi: 'này, đây', components: ['辶', '文'], radical: '辶', mnemonicVi: 'Đi đến (辶) văn tự (文) — cái này.' },
	{ char: '那', pinyin: 'nà', hanViet: 'NA', meaningVi: 'kia, đó', components: ['阝', '那'], radical: '阝', mnemonicVi: 'Ở nơi xa — cái kia.' },
	// ── Số đếm ──
	{ char: '一', pinyin: 'yī', hanViet: 'NHẤT', meaningVi: 'một', components: [], radical: '一', mnemonicVi: 'Một nét ngang — số một.' },
	{ char: '二', pinyin: 'èr', hanViet: 'NHỊ', meaningVi: 'hai', components: [], radical: '二', mnemonicVi: 'Hai nét ngang — số hai.' },
	{ char: '三', pinyin: 'sān', hanViet: 'TAM', meaningVi: 'ba', components: [], radical: '一', mnemonicVi: 'Ba nét ngang — số ba.' },
	{ char: '四', pinyin: 'sì', hanViet: 'TỨ', meaningVi: 'bốn', components: ['囗', '儿'], radical: '囗', mnemonicVi: 'Bốn góc trong khung — số bốn.' },
	{ char: '五', pinyin: 'wǔ', hanViet: 'NGŨ', meaningVi: 'năm', components: [], radical: '二', mnemonicVi: 'Chữ ngũ — số năm.' },
	{ char: '六', pinyin: 'liù', hanViet: 'LỤC', meaningVi: 'sáu', components: ['亠', '八'], radical: '八', mnemonicVi: 'Trên đầu (亠) tám (八) — sáu.' },
	{ char: '七', pinyin: 'qī', hanViet: 'THẤT', meaningVi: 'bảy', components: [], radical: '一', mnemonicVi: 'Chữ thất — số bảy.' },
	{ char: '八', pinyin: 'bā', hanViet: 'BÁT', meaningVi: 'tám', components: [], radical: '八', mnemonicVi: 'Hai nét tách — số tám.' },
	{ char: '九', pinyin: 'jiǔ', hanViet: 'CỬU', meaningVi: 'chín', components: [], radical: '乙', mnemonicVi: 'Chữ cửu — số chín.' },
	{ char: '十', pinyin: 'shí', hanViet: 'THẬP', meaningVi: 'mười', components: [], radical: '十', mnemonicVi: 'Chữ thập — số mười.' },
	// ── Học tập ──
	{ char: '学', pinyin: 'xué', hanViet: 'HỌC', meaningVi: 'học', components: ['⺍', '子'], radical: '子', mnemonicVi: 'Đứa trẻ (子) cúi đầu học.' },
	{ char: '生', pinyin: 'shēng', hanViet: 'SINH', meaningVi: 'sinh, sống', components: [], radical: '生', mnemonicVi: 'Cây mọc từ đất — sinh sống.' },
	{ char: '老', pinyin: 'lǎo', hanViet: 'LÃO', meaningVi: 'già, lâu năm', components: ['耂', '匕'], radical: '老', mnemonicVi: 'Người già cầm gậy.' },
	{ char: '师', pinyin: 'shī', hanViet: 'SƯ', meaningVi: 'thầy', components: ['巾', '币'], radical: '巾', mnemonicVi: 'Người có chuyên môn — thầy.' },
	{ char: '校', pinyin: 'xiào', hanViet: 'HIỆU', meaningVi: 'trường học', components: ['木', '交'], radical: '木', mnemonicVi: 'Cây (木) nơi giao học — trường.' },
	{ char: '书', pinyin: 'shū', hanViet: 'THƯ', meaningVi: 'sách', components: [], radical: '丨', mnemonicVi: 'Cuốn sách xếp chồng.' },
	// ── Gia đình ──
	{ char: '爸', pinyin: 'bà', hanViet: 'BA', meaningVi: 'bố, cha', components: ['父', '巴'], radical: '父', mnemonicVi: 'Người cha (父) — bố.' },
	{ char: '妈', pinyin: 'mā', hanViet: 'MA', meaningVi: 'mẹ', components: ['女', '马'], radical: '女', mnemonicVi: 'Người phụ nữ (女) như ngựa chạy — mẹ.' },
	{ char: '家', pinyin: 'jiā', hanViet: 'GIA', meaningVi: 'nhà, gia đình', components: ['宀', '豕'], radical: '宀', mnemonicVi: 'Mái nhà (宀) có heo — gia đình.' },
	// ── Địa danh ──
	{ char: '中', pinyin: 'zhōng', hanViet: 'TRUNG', meaningVi: 'giữa, Trung', components: ['口', '丨'], radical: '丨', mnemonicVi: 'Cây xuyên giữa — trung tâm.' },
	{ char: '国', pinyin: 'guó', hanViet: 'QUỐC', meaningVi: 'nước', components: ['囗', '玉'], radical: '囗', mnemonicVi: 'Vùng đất (囗) có ngọc — quốc gia.' },
	{ char: '越', pinyin: 'yuè', hanViet: 'VIỆT', meaningVi: 'vượt, Việt', components: ['走', '戉'], radical: '走', mnemonicVi: 'Đi vượt qua — Việt Nam.' },
	{ char: '南', pinyin: 'nán', hanViet: 'NAM', meaningVi: 'phía nam', components: ['十', '冂', '干'], radical: '十', mnemonicVi: 'Hướng phía nam — nam.' },
	// ── Nhóm Thanh 青 ──
	{ char: '请', pinyin: 'qǐng', hanViet: 'THỈNH', meaningVi: 'xin, mời', components: ['讠', '青'], radical: '讠', mnemonicVi: 'Bộ lời nói (讠) + thanh → mời/xin.', similarGroupKey: '青' },
	{ char: '情', pinyin: 'qíng', hanViet: 'TÌNH', meaningVi: 'tình cảm', components: ['忄', '青'], radical: '忄', mnemonicVi: 'Bộ tâm (忄) + thanh → tình cảm.', similarGroupKey: '青' },
	{ char: '清', pinyin: 'qīng', hanViet: 'THANH', meaningVi: 'trong sạch', components: ['氵', '青'], radical: '氵', mnemonicVi: 'Bộ nước (氵) + thanh → trong sạch.', similarGroupKey: '青' },
	{ char: '晴', pinyin: 'qíng', hanViet: 'TÌNH', meaningVi: 'trời quang', components: ['日', '青'], radical: '日', mnemonicVi: 'Bộ mặt trời (日) + thanh → trời quang.', similarGroupKey: '青' },
	// ── Nhóm Phân 分 ──
	{ char: '分', pinyin: 'fēn', hanViet: 'PHÂN', meaningVi: 'chia, phần', components: ['八', '刀'], radical: '刀', mnemonicVi: 'Dùng dao (刀) chia đôi (八) — phân chia.', similarGroupKey: '分' },
	{ char: '份', pinyin: 'fèn', hanViet: 'PHẬN', meaningVi: 'phần, bản', components: ['亻', '分'], radical: '亻', mnemonicVi: 'Người (亻) + phân → phần việc.', similarGroupKey: '分' },
	{ char: '纷', pinyin: 'fēn', hanViet: 'PHÂN', meaningVi: 'hỗn loạn', components: ['纟', '分'], radical: '纟', mnemonicVi: 'Bộ tơ (纟) + phân → rối ren.', similarGroupKey: '分' },
	{ char: '粉', pinyin: 'fěn', hanViet: 'PHẨN', meaningVi: 'bột, phấn', components: ['米', '分'], radical: '米', mnemonicVi: 'Gạo (米) nghiền nhỏ — bột phấn.', similarGroupKey: '分' },
	// ── Giao tiếp ──
	{ char: '好', pinyin: 'hǎo', hanViet: 'HẢO', meaningVi: 'tốt, khỏe', components: ['女', '子'], radical: '女', mnemonicVi: 'Con (子) gái (女) — điều tốt.' },
	{ char: '谢', pinyin: 'xiè', hanViet: 'TẠ', meaningVi: 'cảm ơn', components: ['讠', '射'], radical: '讠', mnemonicVi: 'Lời nói (讠) bắn (射) ra lời cảm ơn.' },
	{ char: '什', pinyin: 'shén', hanViet: 'THẬP', meaningVi: 'gì (trong 什么)', components: ['亻', '十'], radical: '亻', mnemonicVi: 'Người (亻) hỏi mười (十) — cái gì.' },
	{ char: '么', pinyin: 'me', hanViet: 'MA', meaningVi: 'trợ từ câu hỏi', components: [], radical: '丿', mnemonicVi: 'Trợ từ nhẹ ở cuối câu hỏi.' },
	{ char: '问', pinyin: 'wèn', hanViet: 'VẤN', meaningVi: 'hỏi', components: ['门', '口'], radical: '门', mnemonicVi: 'Miệng (口) ở cửa (门) — đến hỏi.' },
	{ char: '再', pinyin: 'zài', hanViet: 'TÁI', meaningVi: 'lần nữa', components: ['一', '冉'], radical: '冂', mnemonicVi: 'Lần nữa quay lại.' },
	{ char: '见', pinyin: 'jiàn', hanViet: 'KIỆN', meaningVi: 'gặp, thấy', components: [], radical: '见', mnemonicVi: 'Mắt nhìn thấy — gặp.' },
	{ char: '叫', pinyin: 'jiào', hanViet: 'KHIẾU', meaningVi: 'gọi, kêu', components: ['口', '丩'], radical: '口', mnemonicVi: 'Miệng (口) kêu gọi.' },
	{ char: '客', pinyin: 'kè', hanViet: 'KHÁCH', meaningVi: 'khách', components: ['宀', '各'], radical: '宀', mnemonicVi: 'Người (各) đến nhà (宀) — khách.' },
	{ char: '气', pinyin: 'qì', hanViet: 'KHÍ', meaningVi: 'khí, hơi', components: [], radical: '气', mnemonicVi: 'Hơi thở, không khí.' },
	{ char: '名', pinyin: 'míng', hanViet: 'DANH', meaningVi: 'tên, danh', components: ['夕', '口'], radical: '口', mnemonicVi: 'Buổi tối (夕) gọi tên (口).' },
	{ char: '字', pinyin: 'zì', hanViet: 'TỰ', meaningVi: 'chữ', components: ['宀', '子'], radical: '子', mnemonicVi: 'Trong nhà (宀) dạy con (子) viết chữ.' },
	{ char: '对', pinyin: 'duì', hanViet: 'ĐỐI', meaningVi: 'đúng, đối', components: ['又', '寸'], radical: '寸', mnemonicVi: 'Tay (又) đo (寸) — đúng.' },
	{ char: '起', pinyin: 'qǐ', hanViet: 'KHỞI', meaningVi: 'dậy, bắt đầu', components: ['走', '己'], radical: '走', mnemonicVi: 'Đi (走) lên — dậy, khởi đầu.' },
	{ char: '没', pinyin: 'méi', hanViet: 'MỘT', meaningVi: 'không (phủ định)', components: ['氵', '殳'], radical: '氵', mnemonicVi: 'Chìm trong nước (氵) — không còn.' },
	{ char: '关', pinyin: 'guān', hanViet: 'QUAN', meaningVi: 'quan hệ, đóng', components: ['丷', '天'], radical: '丷', mnemonicVi: 'Cánh cửa đóng — liên quan.' },
	{ char: '系', pinyin: 'xì', hanViet: 'HỆ', meaningVi: 'hệ, liên kết', components: ['糸', '丿'], radical: '糸', mnemonicVi: 'Sợi chỉ (糸) buộc — hệ thống.' },
	// ── Thời gian & xã hội ──
	{ char: '今', pinyin: 'jīn', hanViet: 'KIM', meaningVi: 'nay, bây giờ', components: [], radical: '人', mnemonicVi: 'Thời điểm hiện tại — hôm nay.' },
	{ char: '天', pinyin: 'tiān', hanViet: 'THIÊN', meaningVi: 'trời, ngày', components: ['一', '大'], radical: '大', mnemonicVi: 'Người (大) dưới một (一) trời.' },
	{ char: '明', pinyin: 'míng', hanViet: 'MINH', meaningVi: 'sáng, rõ', components: ['日', '月'], radical: '日', mnemonicVi: 'Mặt trời (日) và trăng (月) — sáng.' },
	{ char: '朋', pinyin: 'péng', hanViet: 'BẰNG', meaningVi: 'bạn bè', components: ['月', '月'], radical: '月', mnemonicVi: 'Hai người (月) như nhau — bạn.' },
	{ char: '友', pinyin: 'yǒu', hanViet: 'HỮU', meaningVi: 'bạn', components: ['又', '又'], radical: '又', mnemonicVi: 'Hai bàn tay nắm — hữu nghị.' },
	{ char: '高', pinyin: 'gāo', hanViet: 'CAO', meaningVi: 'cao', components: ['亠', '口', '冂', '口'], radical: '高', mnemonicVi: 'Tháp cao nhiều tầng — cao.' },
	{ char: '兴', pinyin: 'xìng', hanViet: 'HƯNG', meaningVi: 'hưng phấn', components: [], radical: '八', mnemonicVi: 'Cùng nhau (八) làm việc — hưng phấn.' },
	// ── Động từ thường dùng ──
	{ char: '吃', pinyin: 'chī', hanViet: 'NGẬT', meaningVi: 'ăn', components: ['口', '乞'], radical: '口', mnemonicVi: 'Miệng (口) ăn — ngật.' },
	{ char: '喝', pinyin: 'hē', hanViet: 'HÁT', meaningVi: 'uống', components: ['口', '曷'], radical: '口', mnemonicVi: 'Miệng (口) nuốt — uống.' },
	{ char: '看', pinyin: 'kàn', hanViet: 'KHÁN', meaningVi: 'xem, nhìn', components: ['手', '目'], radical: '目', mnemonicVi: 'Tay (手) che mắt (目) — nhìn.' },
	{ char: '去', pinyin: 'qù', hanViet: 'KHỨ', meaningVi: 'đi', components: ['土', '厶'], radical: '厶', mnemonicVi: 'Rời đất (土) — đi.' },
	{ char: '睡', pinyin: 'shuì', hanViet: 'THỤY', meaningVi: 'ngủ', components: ['目', '垂'], radical: '目', mnemonicVi: 'Mắt (目) nhắm — ngủ.' },
	{ char: '觉', pinyin: 'jiào', hanViet: 'GIÁC', meaningVi: 'giấc ngủ', components: ['⺍', '见'], radical: '见', mnemonicVi: 'Đầu (⺍) thấy (见) trong mơ — giấc ngủ.' },
	// ── Ẩm thực & đồ vật ──
	{ char: '茶', pinyin: 'chá', hanViet: 'TRÀ', meaningVi: 'trà', components: ['艹', '人', '木'], radical: '艹', mnemonicVi: 'Cây (艹) người (人) hái trên cây (木) — trà.' },
	{ char: '水', pinyin: 'shuǐ', hanViet: 'THỦY', meaningVi: 'nước', components: [], radical: '水', mnemonicVi: 'Dòng nước chảy.' },
	{ char: '饭', pinyin: 'fàn', hanViet: 'PHẠN', meaningVi: 'cơm, bữa ăn', components: ['饣', '反'], radical: '饣', mnemonicVi: 'Thức ăn (饣) lật (反) — cơm.' },
	{ char: '钱', pinyin: 'qián', hanViet: 'TIỀN', meaningVi: 'tiền', components: ['钅', '戋'], radical: '钅', mnemonicVi: 'Kim loại (钅) nhỏ — tiền.' },
	{ char: '多', pinyin: 'duō', hanViet: 'ĐA', meaningVi: 'nhiều', components: ['夕', '夕'], radical: '夕', mnemonicVi: 'Hai buổi tối — nhiều.' },
	{ char: '少', pinyin: 'shǎo', hanViet: 'THIỂU', meaningVi: 'ít', components: ['小'], radical: '小', mnemonicVi: 'Nhỏ bé — ít.' },
	{ char: '漂', pinyin: 'piào', hanViet: 'PHIỀU', meaningVi: 'nổi, trôi', components: ['氵', '票'], radical: '氵', mnemonicVi: 'Nước (氵) mang theo — nổi trôi.' },
	{ char: '亮', pinyin: 'liàng', hanViet: 'LƯỢNG', meaningVi: 'sáng', components: ['亠', '几'], radical: '亠', mnemonicVi: 'Đầu (亠) trên bàn (几) — sáng.' },
	{ char: '店', pinyin: 'diàn', hanViet: 'ĐIỆM', meaningVi: 'cửa hàng', components: ['广', '占'], radical: '广', mnemonicVi: 'Trong nhà (广) bày hàng — cửa tiệm.' },
	// ── Công việc & phương tiện ──
	{ char: '工', pinyin: 'gōng', hanViet: 'CÔNG', meaningVi: 'công việc', components: [], radical: '工', mnemonicVi: 'Cái cờ công — lao động.' },
	{ char: '作', pinyin: 'zuò', hanViet: 'TÁC', meaningVi: 'làm', components: ['亻', '乍'], radical: '亻', mnemonicVi: 'Người (亻) làm việc — tác.' },
	{ char: '电', pinyin: 'diàn', hanViet: 'ĐIỆN', meaningVi: 'điện', components: ['曰', '乚'], radical: '曰', mnemonicVi: 'Tia điện chạy.' },
	{ char: '脑', pinyin: 'nǎo', hanViet: 'NÃO', meaningVi: 'não', components: ['月', '凶'], radical: '月', mnemonicVi: 'Bộ thịt (月) + não — óc.' },
	{ char: '飞', pinyin: 'fēi', hanViet: 'PHI', meaningVi: 'bay', components: [], radical: '飞', mnemonicVi: 'Cánh chim bay.' },
	{ char: '机', pinyin: 'jī', hanViet: 'CƠ', meaningVi: 'máy, cơ hội', components: ['木', '几'], radical: '木', mnemonicVi: 'Gỗ (木) trên bàn (几) — máy móc.' },
	// ── Từ khó (test nâng cao) ──
	{ char: '折', pinyin: 'zhé', hanViet: 'CHIẾT', meaningVi: 'bẻ gãy', components: ['扌', '斤'], radical: '扌', mnemonicVi: 'Bàn tay (扌) cầm rìu (斤) — bẻ gãy.' },
	{ char: '磨', pinyin: 'mó', hanViet: 'MA', meaningVi: 'mài, nghiền', components: ['广', '木', '石'], radical: '石', mnemonicVi: 'Trong nhà (广) gỗ (木) trên đá (石) — mài.' },
	{ char: '喜', pinyin: 'xǐ', hanViet: 'HỶ', meaningVi: 'thích', components: ['口', '口', '口'], radical: '口', mnemonicVi: 'Nhiều miệng cười — thích.' },
	{ char: '欢', pinyin: 'huān', hanViet: 'HOAN', meaningVi: 'vui', components: ['又', '欠'], radical: '欠', mnemonicVi: 'Vui mừng — hoan hỉ.' },
];

/** ~58 từ vựng — HSK1 phong phú + từ đơn similar_char + 2 từ nâng cao */
export const WORDS: WordSeed[] = [
	// ═══ BUỔI 1: Chào hỏi & lịch sự ═══
	{
		simplified: '你好', pinyin: 'nǐ hǎo', hanViet: 'NHỈ HẢO', meaningVi: 'xin chào', partOfSpeech: 'lời chào', hskLevel: 1,
		mnemonicVi: '你 + 好 = chúc bạn khỏe',
		chars: ['你', '好'],
		example: { hanzi: '你好！', pinyin: 'Nǐ hǎo!', meaningVi: 'Xin chào!' },
		pattern: { template: '你好 + Name', samples: '你好，王老师！|Nǐ hǎo, Wáng lǎoshī!|Chào thầy Vương!||你好吗？|Nǐ hǎo ma?|Bạn khỏe không?' },
	},
	{
		simplified: '谢谢', pinyin: 'xièxie', hanViet: 'TẠ TẠ', meaningVi: 'cảm ơn', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '谢 lặp hai lần — cảm ơn nhiều',
		chars: ['谢'],
		example: { hanzi: '谢谢你！', pinyin: 'Xièxie nǐ!', meaningVi: 'Cảm ơn bạn!' },
		pattern: { template: '谢谢 + Person', samples: '谢谢你！|Xièxie nǐ!|Cảm ơn bạn!||谢谢老师。|Xièxie lǎoshī.|Cảm ơn thầy/cô.' },
	},
	{
		simplified: '再见', pinyin: 'zàijiàn', hanViet: 'TÁI KIỆN', meaningVi: 'tạm biệt', partOfSpeech: 'lời chào', hskLevel: 1,
		mnemonicVi: '再 + 见 = gặp lại — tạm biệt',
		chars: ['再', '见'],
		example: { hanzi: '再见！', pinyin: 'Zàijiàn!', meaningVi: 'Tạm biệt!' },
		pattern: { template: '再见 + Name', samples: '再见，老师！|Zàijiàn, lǎoshī!|Tạm biệt thầy/cô!||明天见！|Míngtiān jiàn!|Ngày mai gặp lại!' },
	},
	{
		simplified: '不客气', pinyin: 'bù kèqi', hanViet: 'BẤT KHÁCH KHÍ', meaningVi: 'không có gì / không khách sáo', partOfSpeech: 'lời đáp', hskLevel: 1,
		mnemonicVi: '不 + 客气 = đừng khách sáo',
		chars: ['不', '客', '气'],
		example: { hanzi: '不客气！', pinyin: 'Bù kèqi!', meaningVi: 'Không có gì!' },
		pattern: { template: 'A: 谢谢 B: 不客气', samples: '不客气！|Bù kèqi!|Không có gì!||不用谢。|Bù yòng xiè.|Không cần cảm ơn.' },
	},
	{
		simplified: '对不起', pinyin: 'duìbuqǐ', hanViet: 'ĐỐI BẤT KHỞI', meaningVi: 'xin lỗi', partOfSpeech: 'lời xin lỗi', hskLevel: 1,
		mnemonicVi: '对 + 不起 = không đứng được — xin lỗi',
		chars: ['对', '不', '起'],
		example: { hanzi: '对不起！', pinyin: 'Duìbuqǐ!', meaningVi: 'Xin lỗi!' },
		pattern: { template: '对不起 + Reason', samples: '对不起，我迟到了。|Duìbuqǐ, wǒ chídào le.|Xin lỗi, tôi đến muộn.||对不起！|Duìbuqǐ!|Xin lỗi!' },
	},
	{
		simplified: '没关系', pinyin: 'méiguānxi', hanViet: 'MỘT QUAN HỆ', meaningVi: 'không sao', partOfSpeech: 'lời đáp', hskLevel: 1,
		mnemonicVi: '没 + 关系 = không liên quan — không sao',
		chars: ['没', '关', '系'],
		example: { hanzi: '没关系！', pinyin: 'Méiguānxi!', meaningVi: 'Không sao!' },
		pattern: { template: 'A: 对不起 B: 没关系', samples: '没关系！|Méiguānxi!|Không sao!||没关系，不要紧。|Méiguānxi, bù yàojǐn.|Không sao, không đáng lo.' },
	},
	{
		simplified: '请问', pinyin: 'qǐngwèn', hanViet: 'THỈNH VẤN', meaningVi: 'xin hỏi, làm ơn', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '请 + 问 = lịch sự xin phép hỏi',
		chars: ['请', '问'],
		example: { hanzi: '请问，这是什么？', pinyin: 'Qǐngwèn, zhè shì shénme?', meaningVi: 'Xin hỏi, đây là cái gì?' },
		pattern: { template: '请问 + Question', samples: '请问，这是什么？|Qǐngwèn, zhè shì shénme?|Xin hỏi, đây là cái gì?||请问，学校在哪儿？|Qǐngwèn, xuéxiào zài nǎr?|Xin hỏi, trường ở đâu?' },
	},
	{
		simplified: '什么', pinyin: 'shénme', hanViet: 'THẬP MA', meaningVi: 'cái gì', partOfSpeech: 'đại từ', hskLevel: 1,
		mnemonicVi: '什 + 么 = hỏi cái gì',
		chars: ['什', '么'],
		example: { hanzi: '这是什么？', pinyin: 'Zhè shì shénme?', meaningVi: 'Đây là cái gì?' },
		pattern: { template: '这是什么？', samples: '这是什么？|Zhè shì shénme?|Đây là cái gì?||你叫什么名字？|Nǐ jiào shénme míngzi?|Bạn tên gì?' },
	},

	// ═══ BUỔI 2: Giới thiệu bản thân ═══
	{
		simplified: '我', pinyin: 'wǒ', hanViet: 'NGÃ', meaningVi: 'tôi', partOfSpeech: 'đại từ', hskLevel: 1,
		mnemonicVi: 'Chữ tôi — người nói về mình',
		chars: ['我'],
		example: { hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh.' },
		pattern: { template: '我 + 是 + Noun', samples: '我是学生。|Wǒ shì xuésheng.|Tôi là học sinh.||我是越南人。|Wǒ shì Yuènán rén.|Tôi là người Việt Nam.' },
	},
	{
		simplified: '学生', pinyin: 'xuésheng', hanViet: 'HỌC SINH', meaningVi: 'học sinh / sinh viên', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '学 + 生 = người đang học → học sinh',
		chars: ['学', '生'],
		example: { hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh/sinh viên.' },
		pattern: { template: '我是 + Noun', samples: '我是学生。|Wǒ shì xuésheng.|Tôi là học sinh.||他是学生。|Tā shì xuésheng.|Anh ấy là học sinh.' },
	},
	{
		simplified: '老师', pinyin: 'lǎoshī', hanViet: 'LÃO SƯ', meaningVi: 'giáo viên', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '老 + 师 = thầy/cô giáo',
		chars: ['老', '师'],
		example: { hanzi: '他是老师。', pinyin: 'Tā shì lǎoshī.', meaningVi: 'Anh ấy là giáo viên.' },
		pattern: { template: '他是 + Noun', samples: '他是老师。|Tā shì lǎoshī.|Anh ấy là giáo viên.||她是我老师。|Tā shì wǒ lǎoshī.|Cô ấy là giáo viên của tôi.' },
	},
	{
		simplified: '名字', pinyin: 'míngzi', hanViet: 'DANH TỰ', meaningVi: 'tên', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '名 + 字 = danh tự — tên',
		chars: ['名', '字'],
		example: { hanzi: '你叫什么名字？', pinyin: 'Nǐ jiào shénme míngzi?', meaningVi: 'Bạn tên gì?' },
		pattern: { template: '叫 + 名字', samples: '我叫安娜。|Wǒ jiào Ānnà.|Tôi tên Anna.||你叫什么名字？|Nǐ jiào shénme míngzi?|Bạn tên gì?' },
	},
	{
		simplified: '叫', pinyin: 'jiào', hanViet: 'KHIẾU', meaningVi: 'gọi, tên là', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Miệng kêu — gọi tên',
		chars: ['叫'],
		example: { hanzi: '我叫安娜。', pinyin: 'Wǒ jiào Ānnà.', meaningVi: 'Tôi tên là Anna.' },
		pattern: { template: 'A 叫 B', samples: '我叫安娜。|Wǒ jiào Ānnà.|Tôi tên Anna.||你叫什么？|Nǐ jiào shénme?|Bạn tên gì?' },
	},
	{
		simplified: '是', pinyin: 'shì', hanViet: 'THỊ', meaningVi: 'là', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Mặt trời đúng — là',
		chars: ['是'],
		example: { hanzi: '他是老师。', pinyin: 'Tā shì lǎoshī.', meaningVi: 'Anh ấy là giáo viên.' },
		pattern: { template: 'A 是 B', samples: '我是学生。|Wǒ shì xuésheng.|Tôi là học sinh.||她是老师。|Tā shì lǎoshī.|Cô ấy là giáo viên.' },
	},
	{
		simplified: '人', pinyin: 'rén', hanViet: 'NHÂN', meaningVi: 'người', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Hình người đang đi',
		chars: ['人'],
		example: { hanzi: '他是中国人。', pinyin: 'Tā shì Zhōngguó rén.', meaningVi: 'Anh ấy là người Trung Quốc.' },
		pattern: { template: 'Nationality + 人', samples: '我是越南人。|Wǒ shì Yuènán rén.|Tôi là người Việt Nam.||他是中国人。|Tā shì Zhōngguó rén.|Anh ấy là người Trung Quốc.' },
	},
	{
		simplified: '中国', pinyin: 'Zhōngguó', hanViet: 'TRUNG QUỐC', meaningVi: 'Trung Quốc', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '中 + 国 = đất nước ở giữa',
		chars: ['中', '国'],
		example: { hanzi: '我在中国。', pinyin: 'Wǒ zài Zhōngguó.', meaningVi: 'Tôi ở Trung Quốc.' },
		pattern: { template: '在 + Place', samples: '我在中国。|Wǒ zài Zhōngguó.|Tôi ở Trung Quốc.||他是中国人。|Tā shì Zhōngguó rén.|Anh ấy là người Trung Quốc.' },
	},
	{
		simplified: '越南', pinyin: 'Yuènán', hanViet: 'VIỆT NAM', meaningVi: 'Việt Nam', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '越 + 南 = phía nam Việt',
		chars: ['越', '南'],
		example: { hanzi: '我是越南人。', pinyin: 'Wǒ shì Yuènán rén.', meaningVi: 'Tôi là người Việt Nam.' },
		pattern: { template: '我是 + Nationality', samples: '我是越南人。|Wǒ shì Yuènán rén.|Tôi là người Việt Nam.||我去越南。|Wǒ qù Yuènán.|Tôi đi Việt Nam.' },
	},
	{
		simplified: '朋友', pinyin: 'péngyou', hanViet: 'BẰNG HỮU', meaningVi: 'bạn bè', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '朋 + 友 = người bạn thân',
		chars: ['朋', '友'],
		example: { hanzi: '他是我的朋友。', pinyin: 'Tā shì wǒ de péngyou.', meaningVi: 'Anh ấy là bạn của tôi.' },
		pattern: { template: '我的朋友', samples: '他是我的朋友。|Tā shì wǒ de péngyou.|Anh ấy là bạn tôi.||我和朋友喝茶。|Wǒ hé péngyou hē chá.|Tôi uống trà với bạn.' },
	},
	{
		simplified: '爸爸', pinyin: 'bàba', hanViet: 'BA BA', meaningVi: 'bố, cha', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '爸 lặp — bố',
		chars: ['爸'],
		example: { hanzi: '我爸爸是老师。', pinyin: 'Wǒ bàba shì lǎoshī.', meaningVi: 'Bố tôi là giáo viên.' },
		pattern: { template: '我爸爸 + V', samples: '我爸爸是老师。|Wǒ bàba shì lǎoshī.|Bố tôi là giáo viên.||我爸爸很高兴。|Wǒ bàba hěn gāoxìng.|Bố tôi rất vui.' },
	},
	{
		simplified: '妈妈', pinyin: 'māma', hanViet: 'MA MA', meaningVi: 'mẹ', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '妈 lặp — mẹ',
		chars: ['妈'],
		example: { hanzi: '我妈妈很漂亮。', pinyin: 'Wǒ māma hěn piàoliang.', meaningVi: 'Mẹ tôi rất đẹp.' },
		pattern: { template: '我妈妈 + Adj', samples: '我妈妈很漂亮。|Wǒ māma hěn piàoliang.|Mẹ tôi rất đẹp.||我妈妈在家。|Wǒ māma zài jiā.|Mẹ tôi ở nhà.' },
	},

	// ═══ BUỔI 3: Số đếm & chỉ định ═══
	{
		simplified: '一', pinyin: 'yī', hanViet: 'NHẤT', meaningVi: 'một', partOfSpeech: 'số từ', hskLevel: 1,
		mnemonicVi: 'Một nét ngang',
		chars: ['一'],
		example: { hanzi: '一本书', pinyin: 'Yī běn shū', meaningVi: 'Một quyển sách' },
		pattern: { template: '一 + Measure + Noun', samples: '一本书|Yī běn shū|Một quyển sách||一个人|Yī gè rén|Một người' },
	},
	{
		simplified: '二', pinyin: 'èr', hanViet: 'NHỊ', meaningVi: 'hai', partOfSpeech: 'số từ', hskLevel: 1,
		mnemonicVi: 'Hai nét ngang',
		chars: ['二'],
		example: { hanzi: '二个人', pinyin: 'Èr gè rén', meaningVi: 'Hai người' },
		pattern: { template: '二 + Noun', samples: '二个人|Èr gè rén|Hai người||二月|Èr yuè|Tháng hai' },
	},
	{
		simplified: '三', pinyin: 'sān', hanViet: 'TAM', meaningVi: 'ba', partOfSpeech: 'số từ', hskLevel: 1,
		mnemonicVi: 'Ba nét ngang',
		chars: ['三'],
		example: { hanzi: '三个人', pinyin: 'Sān gè rén', meaningVi: 'Ba người' },
		pattern: { template: '三 + Noun', samples: '三个人|Sān gè rén|Ba người||三天|Sān tiān|Ba ngày' },
	},
	{
		simplified: '十', pinyin: 'shí', hanViet: 'THẬP', meaningVi: 'mười', partOfSpeech: 'số từ', hskLevel: 1,
		mnemonicVi: 'Chữ thập — mười',
		chars: ['十'],
		example: { hanzi: '十块钱', pinyin: 'Shí kuài qián', meaningVi: 'Mười kuai tiền' },
		pattern: { template: '十 + Noun', samples: '十块钱|Shí kuài qián|Mười kuai||十个人|Shí gè rén|Mười người' },
	},
	{
		simplified: '多少', pinyin: 'duōshao', hanViet: 'ĐA THIỂU', meaningVi: 'bao nhiêu', partOfSpeech: 'đại từ', hskLevel: 1,
		mnemonicVi: '多 + 少 = nhiều hay ít — bao nhiêu',
		chars: ['多', '少'],
		example: { hanzi: '这个多少钱？', pinyin: 'Zhège duōshao qián?', meaningVi: 'Cái này bao nhiêu tiền?' },
		pattern: { template: '多少 + Noun', samples: '多少钱？|Duōshao qián?|Bao nhiêu tiền?||多少人？|Duōshao rén?|Bao nhiêu người?' },
	},
	{
		simplified: '这', pinyin: 'zhè', hanViet: 'GIÁ', meaningVi: 'này, đây', partOfSpeech: 'đại từ chỉ thị', hskLevel: 1,
		mnemonicVi: 'Đi đến văn tự — cái này',
		chars: ['这'],
		example: { hanzi: '这是什么？', pinyin: 'Zhè shì shénme?', meaningVi: 'Đây là cái gì?' },
		pattern: { template: '这 + 是 + Noun', samples: '这是我的书。|Zhè shì wǒ de shū.|Đây là sách tôi.||这是什么？|Zhè shì shénme?|Đây là cái gì?' },
	},
	{
		simplified: '那', pinyin: 'nà', hanViet: 'NA', meaningVi: 'kia, đó', partOfSpeech: 'đại từ chỉ thị', hskLevel: 1,
		mnemonicVi: 'Ở nơi xa — cái kia',
		chars: ['那'],
		example: { hanzi: '那是学校。', pinyin: 'Nà shì xuéxiào.', meaningVi: 'Kia là trường học.' },
		pattern: { template: '那 + 是 + Noun', samples: '那是学校。|Nà shì xuéxiào.|Kia là trường.||那是我的朋友。|Nà shì wǒ de péngyou.|Kia là bạn tôi.' },
	},

	// ═══ BUỔI 4: Nơi chốn & hoạt động hàng ngày ═══
	{
		simplified: '在', pinyin: 'zài', hanViet: 'TẠI', meaningVi: 'ở, tại', partOfSpeech: 'giới từ', hskLevel: 1,
		mnemonicVi: 'Người ở trên đất',
		chars: ['在'],
		example: { hanzi: '我在学校。', pinyin: 'Wǒ zài xuéxiào.', meaningVi: 'Tôi ở trường.' },
		pattern: { template: 'A 在 B', samples: '我在学校。|Wǒ zài xuéxiào.|Tôi ở trường.||他在家。|Tā zài jiā.|Anh ấy ở nhà.' },
	},
	{
		simplified: '学校', pinyin: 'xuéxiào', hanViet: 'HỌC HIỆU', meaningVi: 'trường học', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '学 + 校 = nơi học',
		chars: ['学', '校'],
		example: { hanzi: '我在学校。', pinyin: 'Wǒ zài xuéxiào.', meaningVi: 'Tôi ở trường.' },
		pattern: { template: '在 + 学校', samples: '我在学校。|Wǒ zài xuéxiào.|Tôi ở trường.||去学校|Qù xuéxiào|Đi đến trường' },
	},
	{
		simplified: '家', pinyin: 'jiā', hanViet: 'GIA', meaningVi: 'nhà, gia đình', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Mái nhà có heo — gia đình',
		chars: ['家'],
		example: { hanzi: '我在家。', pinyin: 'Wǒ zài jiā.', meaningVi: 'Tôi ở nhà.' },
		pattern: { template: '在 + 家', samples: '我在家。|Wǒ zài jiā.|Tôi ở nhà.||回家|Huí jiā|Về nhà' },
	},
	{
		simplified: '今天', pinyin: 'jīntiān', hanViet: 'KIM THIÊN', meaningVi: 'hôm nay', partOfSpeech: 'danh từ thời gian', hskLevel: 1,
		mnemonicVi: '今 + 天 = ngày nay',
		chars: ['今', '天'],
		example: { hanzi: '今天我很高兴。', pinyin: 'Jīntiān wǒ hěn gāoxìng.', meaningVi: 'Hôm nay tôi rất vui.' },
		pattern: { template: '今天 + S + V', samples: '今天我很高兴。|Jīntiān wǒ hěn gāoxìng.|Hôm nay tôi rất vui.||今天我去学校。|Jīntiān wǒ qù xuéxiào.|Hôm nay tôi đi trường.' },
	},
	{
		simplified: '明天', pinyin: 'míngtiān', hanViet: 'MINH THIÊN', meaningVi: 'ngày mai', partOfSpeech: 'danh từ thời gian', hskLevel: 1,
		mnemonicVi: '明 + 天 = ngày sáng — ngày mai',
		chars: ['明', '天'],
		example: { hanzi: '明天见！', pinyin: 'Míngtiān jiàn!', meaningVi: 'Ngày mai gặp!' },
		pattern: { template: '明天 + V', samples: '明天见！|Míngtiān jiàn!|Ngày mai gặp!||明天我去中国。|Míngtiān wǒ qù Zhōngguó.|Ngày mai tôi đi Trung Quốc.' },
	},
	{
		simplified: '吃', pinyin: 'chī', hanViet: 'NGẬT', meaningVi: 'ăn', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Miệng ăn',
		chars: ['吃'],
		example: { hanzi: '我想吃饭。', pinyin: 'Wǒ xiǎng chī fàn.', meaningVi: 'Tôi muốn ăn cơm.' },
		pattern: { template: '吃 + Noun', samples: '吃饭|Chī fàn|Ăn cơm||吃苹果|Chī píngguǒ|Ăn táo' },
	},
	{
		simplified: '吃饭', pinyin: 'chī fàn', hanViet: 'NGẬT PHẠN', meaningVi: 'ăn cơm', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '吃 + 饭 = ăn bữa cơm',
		chars: ['吃', '饭'],
		example: { hanzi: '我们去饭店吃饭。', pinyin: 'Wǒmen qù fàndiàn chī fàn.', meaningVi: 'Chúng tôi đi nhà hàng ăn cơm.' },
		pattern: { template: '去 + Place + 吃饭', samples: '去饭店吃饭。|Qù fàndiàn chī fàn.|Đi nhà hàng ăn cơm.||我想吃饭。|Wǒ xiǎng chī fàn.|Tôi muốn ăn cơm.' },
	},
	{
		simplified: '去', pinyin: 'qù', hanViet: 'KHỨ', meaningVi: 'đi', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Rời đất — đi',
		chars: ['去'],
		example: { hanzi: '我去学校。', pinyin: 'Wǒ qù xuéxiào.', meaningVi: 'Tôi đi trường.' },
		pattern: { template: '去 + Place', samples: '我去学校。|Wǒ qù xuéxiào.|Tôi đi trường.||去中国|Qù Zhōngguó|Đi Trung Quốc' },
	},
	{
		simplified: '看', pinyin: 'kàn', hanViet: 'KHÁN', meaningVi: 'xem, nhìn', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Tay che mắt — nhìn',
		chars: ['看'],
		example: { hanzi: '你看这本书。', pinyin: 'Nǐ kàn zhè běn shū.', meaningVi: 'Bạn xem quyển sách này.' },
		pattern: { template: '看 + Noun', samples: '看书|Kàn shū|Đọc sách||看电视|Kàn diànshì|Xem TV' },
	},
	{
		simplified: '有', pinyin: 'yǒu', hanViet: 'HỮU', meaningVi: 'có', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Tay cầm thịt — có',
		chars: ['有'],
		example: { hanzi: '我有一本书。', pinyin: 'Wǒ yǒu yī běn shū.', meaningVi: 'Tôi có một quyển sách.' },
		pattern: { template: '有 + Noun', samples: '我有钱。|Wǒ yǒu qián.|Tôi có tiền.||我有朋友。|Wǒ yǒu péngyou.|Tôi có bạn.' },
	},
	{
		simplified: '工作', pinyin: 'gōngzuò', hanViet: 'CÔNG TÁC', meaningVi: 'làm việc / công việc', partOfSpeech: 'danh từ/động từ', hskLevel: 1,
		mnemonicVi: '工 + 作 = lao động',
		chars: ['工', '作'],
		example: { hanzi: '他在工作。', pinyin: 'Tā zài gōngzuò.', meaningVi: 'Anh ấy đang làm việc.' },
		pattern: { template: '在 + 工作', samples: '我在工作。|Wǒ zài gōngzuò.|Tôi đang làm việc.||他去工作。|Tā qù gōngzuò.|Anh ấy đi làm.' },
	},
	{
		simplified: '睡觉', pinyin: 'shuìjiào', hanViet: 'THỤY GIÁO', meaningVi: 'ngủ', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '睡 + 觉 = ngủ',
		chars: ['睡', '觉'],
		example: { hanzi: '我想睡觉。', pinyin: 'Wǒ xiǎng shuìjiào.', meaningVi: 'Tôi muốn ngủ.' },
		pattern: { template: '想 + 睡觉', samples: '我想睡觉。|Wǒ xiǎng shuìjiào.|Tôi muốn ngủ.||他睡觉了。|Tā shuìjiào le.|Anh ấy đi ngủ rồi.' },
	},

	// ═══ BUỔI 5: Ăn uống, mua sắm, cảm xúc ═══
	{
		simplified: '喝茶', pinyin: 'hē chá', hanViet: 'HÁT TRÀ', meaningVi: 'uống trà', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '喝 + 茶 = uống trà',
		chars: ['喝', '茶'],
		example: { hanzi: '你想喝茶吗？', pinyin: 'Nǐ xiǎng hē chá ma?', meaningVi: 'Bạn muốn uống trà không?' },
		pattern: { template: '想 + V + 吗？', samples: '你想喝茶吗？|Nǐ xiǎng hē chá ma?|Bạn muốn uống trà không?||我们一起喝茶吧。|Wǒmen yìqǐ hē chá ba.|Chúng ta cùng uống trà nhé.' },
	},
	{
		simplified: '水', pinyin: 'shuǐ', hanViet: 'THỦY', meaningVi: 'nước', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Dòng nước chảy',
		chars: ['水'],
		example: { hanzi: '我想喝水。', pinyin: 'Wǒ xiǎng hē shuǐ.', meaningVi: 'Tôi muốn uống nước.' },
		pattern: { template: '喝 + 水', samples: '喝水|Hē shuǐ|Uống nước||一杯水|Yī bēi shuǐ|Một cốc nước' },
	},
	{
		simplified: '饭', pinyin: 'fàn', hanViet: 'PHẠN', meaningVi: 'cơm, bữa ăn', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Thức ăn — cơm',
		chars: ['饭'],
		example: { hanzi: '吃饭了吗？', pinyin: 'Chī fàn le ma?', meaningVi: 'Ăn cơm chưa?' },
		pattern: { template: '吃 + 饭', samples: '吃饭|Chī fàn|Ăn cơm||米饭|Mǐfàn|Cơm trắng' },
	},
	{
		simplified: '饭店', pinyin: 'fàndiàn', hanViet: 'PHẠN ĐIỆM', meaningVi: 'nhà hàng', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '饭 + 店 = cửa tiệm cơm',
		chars: ['饭', '店'],
		example: { hanzi: '我们去饭店。', pinyin: 'Wǒmen qù fàndiàn.', meaningVi: 'Chúng tôi đi nhà hàng.' },
		pattern: { template: '去 + 饭店', samples: '去饭店吃饭。|Qù fàndiàn chī fàn.|Đi nhà hàng ăn cơm.||这个饭店很好。|Zhège fàndiàn hěn hǎo.|Nhà hàng này rất tốt.' },
	},
	{
		simplified: '钱', pinyin: 'qián', hanViet: 'TIỀN', meaningVi: 'tiền', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Kim loại nhỏ — tiền',
		chars: ['钱'],
		example: { hanzi: '这个多少钱？', pinyin: 'Zhège duōshao qián?', meaningVi: 'Cái này bao nhiêu tiền?' },
		pattern: { template: '多少 + 钱', samples: '多少钱？|Duōshao qián?|Bao nhiêu tiền?||我有钱。|Wǒ yǒu qián.|Tôi có tiền.' },
	},
	{
		simplified: '书', pinyin: 'shū', hanViet: 'THƯ', meaningVi: 'sách', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: 'Cuốn sách xếp chồng',
		chars: ['书'],
		example: { hanzi: '这是我的书。', pinyin: 'Zhè shì wǒ de shū.', meaningVi: 'Đây là sách của tôi.' },
		pattern: { template: '看 + 书', samples: '看书|Kàn shū|Đọc sách||一本书|Yī běn shū|Một quyển sách' },
	},
	{
		simplified: '漂亮', pinyin: 'piàoliang', hanViet: 'PHIỀU LƯỢNG', meaningVi: 'đẹp', partOfSpeech: 'tính từ', hskLevel: 1,
		mnemonicVi: '漂 + 亮 = nổi sáng — đẹp',
		chars: ['漂', '亮'],
		example: { hanzi: '她很漂亮。', pinyin: 'Tā hěn piàoliang.', meaningVi: 'Cô ấy rất đẹp.' },
		pattern: { template: '很 + 漂亮', samples: '很漂亮。|Hěn piàoliang.|Rất đẹp.||你很漂亮。|Nǐ hěn piàoliang.|Bạn rất đẹp.' },
	},
	{
		simplified: '喜欢', pinyin: 'xǐhuan', hanViet: 'HỶ HOAN', meaningVi: 'thích', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: '喜 + 欢 = vui thích',
		chars: ['喜', '欢'],
		example: { hanzi: '我喜欢喝茶。', pinyin: 'Wǒ xǐhuan hē chá.', meaningVi: 'Tôi thích uống trà.' },
		pattern: { template: '我喜欢 + Noun', samples: '我喜欢茶。|Wǒ xǐhuan chá.|Tôi thích trà.||我喜欢中国。|Wǒ xǐhuan Zhōngguó.|Tôi thích Trung Quốc.' },
	},
	{
		simplified: '高兴', pinyin: 'gāoxìng', hanViet: 'CAO HƯNG', meaningVi: 'vui, hạnh phúc', partOfSpeech: 'tính từ', hskLevel: 1,
		mnemonicVi: '高 + 兴 = cao hứng — vui vẻ',
		chars: ['高', '兴'],
		example: { hanzi: '我很高兴认识你。', pinyin: 'Wǒ hěn gāoxìng rènshi nǐ.', meaningVi: 'Tôi rất vui được gặp bạn.' },
		pattern: { template: '很高兴 + V', samples: '我很高兴。|Wǒ hěn gāoxìng.|Tôi rất vui.||认识你很高兴。|Rènshi nǐ hěn gāoxìng.|Rất vui được gặp bạn.' },
	},

	// ═══ BUỔI 6: Phương tiện & công nghệ ═══
	{
		simplified: '电脑', pinyin: 'diànnǎo', hanViet: 'ĐIỆN NÃO', meaningVi: 'máy tính', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '电 + 脑 = điện não — máy tính',
		chars: ['电', '脑'],
		example: { hanzi: '这是我的电脑。', pinyin: 'Zhè shì wǒ de diànnǎo.', meaningVi: 'Đây là máy tính của tôi.' },
		pattern: { template: '这是 + 电脑', samples: '这是我的电脑。|Zhè shì wǒ de diànnǎo.|Đây là máy tính tôi.||我用电脑工作。|Wǒ yòng diànnǎo gōngzuò.|Tôi dùng máy tính làm việc.' },
	},
	{
		simplified: '飞机', pinyin: 'fēijī', hanViet: 'PHI CƠ', meaningVi: 'máy bay', partOfSpeech: 'danh từ', hskLevel: 1,
		mnemonicVi: '飞 + 机 = máy bay',
		chars: ['飞', '机'],
		example: { hanzi: '我坐飞机去中国。', pinyin: 'Wǒ zuò fēijī qù Zhōngguó.', meaningVi: 'Tôi đi Trung Quốc bằng máy bay.' },
		pattern: { template: '坐 + 飞机', samples: '他坐飞机。|Tā zuò fēijī.|Anh ấy đi máy bay.||坐飞机去中国|Zuò fēijī qù Zhōngguó|Đi Trung Quốc bằng máy bay' },
	},

	// ═══ Từ đơn — test similar_char & Hanzi Lab ═══
	{
		simplified: '请', pinyin: 'qǐng', hanViet: 'THỈNH', meaningVi: 'xin, mời', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Bộ lời nói + thanh → mời/xin',
		chars: ['请'],
		example: { hanzi: '请进。', pinyin: 'Qǐng jìn.', meaningVi: 'Mời vào.' },
		pattern: { template: '请 + V', samples: '请进。|Qǐng jìn.|Mời vào.||请坐。|Qǐng zuò.|Mời ngồi.' },
	},
	{
		simplified: '情', pinyin: 'qíng', hanViet: 'TÌNH', meaningVi: 'tình cảm', partOfSpeech: 'danh từ', hskLevel: 2,
		mnemonicVi: 'Bộ tâm + thanh → tình cảm',
		chars: ['情'],
		example: { hanzi: '他的感情很好。', pinyin: 'Tā de gǎnqíng hěn hǎo.', meaningVi: 'Tình cảm của anh ấy rất tốt.' },
		pattern: { template: '感情', samples: '感情很好。|Gǎnqíng hěn hǎo.|Tình cảm rất tốt.' },
	},
	{
		simplified: '清', pinyin: 'qīng', hanViet: 'THANH', meaningVi: 'trong sạch', partOfSpeech: 'tính từ', hskLevel: 2,
		mnemonicVi: 'Bộ nước + thanh → trong sạch',
		chars: ['清'],
		example: { hanzi: '水很清。', pinyin: 'Shuǐ hěn qīng.', meaningVi: 'Nước rất trong.' },
		pattern: { template: '很 + 清', samples: '水很清。|Shuǐ hěn qīng.|Nước rất trong.' },
	},
	{
		simplified: '晴', pinyin: 'qíng', hanViet: 'TÌNH', meaningVi: 'trời quang', partOfSpeech: 'tính từ', hskLevel: 2,
		mnemonicVi: 'Bộ mặt trời + thanh → trời quang',
		chars: ['晴'],
		example: { hanzi: '今天晴天。', pinyin: 'Jīntiān qíngtiān.', meaningVi: 'Hôm nay trời quang.' },
		pattern: { template: '晴天', samples: '今天晴天。|Jīntiān qíngtiān.|Hôm nay trời đẹp.' },
	},
	{
		simplified: '分', pinyin: 'fēn', hanViet: 'PHÂN', meaningVi: 'chia, phần', partOfSpeech: 'động từ', hskLevel: 1,
		mnemonicVi: 'Dùng dao chia đôi — phân chia',
		chars: ['分'],
		example: { hanzi: '我们分吧。', pinyin: 'Wǒmen fēn ba.', meaningVi: 'Chúng ta chia đi.' },
		pattern: { template: '分 + Noun', samples: '十分|Shífēn|Rất||三分钟|Sān fēnzhōng|Ba phút' },
	},
	{
		simplified: '粉', pinyin: 'fěn', hanViet: 'PHẨN', meaningVi: 'bột, phấn', partOfSpeech: 'danh từ', hskLevel: 2,
		mnemonicVi: 'Gạo nghiền nhỏ — bột phấn',
		chars: ['粉'],
		example: { hanzi: '这是米粉。', pinyin: 'Zhè shì mǐfěn.', meaningVi: 'Đây là bún gạo.' },
		pattern: { template: '米粉', samples: '这是米粉。|Zhè shì mǐfěn.|Đây là bún gạo.' },
	},

	// ═══ Nâng cao — test similar_char & Hanzi Lab ═══
	{
		simplified: '十分', pinyin: 'shífēn', hanViet: 'THẬP PHÂN', meaningVi: 'rất, vô cùng', partOfSpeech: 'phó từ', hskLevel: 2,
		mnemonicVi: '十 + 分 = mười phần — rất',
		chars: ['十', '分'],
		example: { hanzi: '我十分高兴。', pinyin: 'Wǒ shífēn gāoxìng.', meaningVi: 'Tôi vô cùng vui.' },
		pattern: { template: '十分 + Adj', samples: '我十分高兴。|Wǒ shífēn gāoxìng.|Tôi vô cùng vui.||十分漂亮|Shífēn piàoliang|Rất đẹp' },
	},
	{
		simplified: '折磨', pinyin: 'zhémó', hanViet: 'CHIẾT MA', meaningVi: 'hành hạ, giày vò', partOfSpeech: 'động từ', hskLevel: 4,
		mnemonicVi: '折 = bẻ gãy, 磨 = mài nghiền → hành hạ tinh thần',
		chars: ['折', '磨'],
		example: { hanzi: '长期的病痛折磨着他。', pinyin: 'Chángqī de bìngtòng zhémó zhe tā.', meaningVi: 'Cơn bệnh kéo dài hành hạ anh ấy.' },
		pattern: { template: 'S + 折磨 + O', samples: '病痛折磨着他。|Bìngtòng zhémó zhe tā.|Cơn bệnh hành hạ anh ấy.' },
	},
];

/** Gợi ý test Hanzi Lab — dán vào textarea */
export const HANZI_LAB_SAMPLES = [
	'学生,老师,学校',
	'请,情,清,晴',
	'分,份,纷,粉',
	'爸爸,妈妈,朋友',
	'吃饭,喝茶,睡觉',
];
