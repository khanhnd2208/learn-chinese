/* ════════════════════════════════════════════════════════════════════════
   hsk1SampleSets.ts — Canonical HSK1 Bài 1–3 sample vocabulary (3 × ~20 từ)
   ════════════════════════════════════════════════════════════════════════ */

export interface Hsk1SampleWord {
	simplified: string;
	pinyin: string;
	meaningVi: string;
	hanViet: string;
	partOfSpeech: string;
	ghiChu: string;
}

export type Hsk1SampleSetId = 'bai1' | 'bai2' | 'bai3';

export interface Hsk1SampleSet {
	id: Hsk1SampleSetId;
	filename: string;
	boTu: string;
	description: string;
	words: Hsk1SampleWord[];
}

export const GLOBAL_SAMPLE_SET_DESCRIPTION =
	'Bộ mẫu hệ thống HSK1 — tự tạo cho mọi tài khoản.';

const BAI1_WORDS: Hsk1SampleWord[] = [
	{ simplified: '你', pinyin: 'nǐ', meaningVi: 'bạn; anh/chị', hanViet: 'NHĨ', partOfSpeech: 'đại từ', ghiChu: 'Gọi người đối diện. Bộ 亻 gợi liên quan đến người.' },
	{ simplified: '好', pinyin: 'hǎo', meaningVi: 'tốt; khỏe', hanViet: 'HẢO', partOfSpeech: 'tính từ', ghiChu: 'Dùng trong 你好, 好吗. Thường đứng sau chủ ngữ.' },
	{ simplified: '你好', pinyin: 'nǐ hǎo', meaningVi: 'xin chào', hanViet: 'NHĨ HẢO', partOfSpeech: 'lời chào', ghiChu: 'Cách chào phổ biến nhất. Đọc tự nhiên gần ní hǎo.' },
	{ simplified: '我', pinyin: 'wǒ', meaningVi: 'tôi; ta', hanViet: 'NGÃ', partOfSpeech: 'đại từ', ghiChu: 'Đại từ ngôi thứ nhất số ít.' },
	{ simplified: '是', pinyin: 'shì', meaningVi: 'là', hanViet: 'THỊ', partOfSpeech: 'động từ', ghiChu: 'Động từ liên kết: A 是 B (A là B).' },
	{ simplified: '老师', pinyin: 'lǎoshī', meaningVi: 'giáo viên; thầy cô', hanViet: 'LÃO SƯ', partOfSpeech: 'danh từ', ghiChu: '老 = già/lão, 师 = thầy. Gọi giáo viên trong giao tiếp.' },
	{ simplified: '学生', pinyin: 'xuésheng', meaningVi: 'học sinh', hanViet: 'HỌC SINH', partOfSpeech: 'danh từ', ghiChu: '学 = học, 生 = người/sinh. Từ ghép rất phổ biến HSK1.' },
	{ simplified: '再见', pinyin: 'zàijiàn', meaningVi: 'tạm biệt', hanViet: 'TÁI KIẾN', partOfSpeech: 'lời chào', ghiChu: '再 = lại, 见 = gặp. Dùng khi chia tay.' },
	{ simplified: '谢谢', pinyin: 'xièxie', meaningVi: 'cảm ơn', hanViet: 'TẠ TẠ', partOfSpeech: 'lời chào', ghiChu: 'Có thể nói 谢谢你 để nhấn mạnh.' },
	{ simplified: '不客气', pinyin: 'bú kèqi', meaningVi: 'không có gì; không khách sáo', hanViet: 'BẤT KHÁCH KHÍ', partOfSpeech: 'cụm từ', ghiChu: 'Đáp lại lời cảm ơn, tương đương "không có chi".' },
	{ simplified: '吗', pinyin: 'ma', meaningVi: 'trợ từ nghi vấn', hanViet: 'MA', partOfSpeech: 'trợ từ', ghiChu: 'Đặt cuối câu để biến câu trần thuật thành câu hỏi yes/no.' },
	{ simplified: '很', pinyin: 'hěn', meaningVi: 'rất', hanViet: 'HẮN', partOfSpeech: 'phó từ', ghiChu: 'Thường đứng trước tính từ: 很好, 很高兴.' },
	{ simplified: '高兴', pinyin: 'gāoxìng', meaningVi: 'vui; vui mừng', hanViet: 'CAO HƯNG', partOfSpeech: 'tính từ', ghiChu: '很高兴 = rất vui. Dùng khi gặp ai đó lần đầu.' },
	{ simplified: '认识', pinyin: 'rènshi', meaningVi: 'quen; biết (ai)', hanViet: 'NHẬN THỨC', partOfSpeech: 'động từ', ghiChu: '认识你 = quen bạn. Thường dùng khi làm quen.' },
	{ simplified: '叫', pinyin: 'jiào', meaningVi: 'gọi là; tên là', hanViet: 'KIÊU', partOfSpeech: 'động từ', ghiChu: '我叫… = tôi tên là…. Cũng có nghĩa kêu gọi.' },
	{ simplified: '什么', pinyin: 'shénme', meaningVi: 'cái gì; gì', hanViet: 'THẬP MA', partOfSpeech: 'đại từ', ghiChu: '你叫什么名字？ = Bạn tên gì?' },
	{ simplified: '名字', pinyin: 'míngzi', meaningVi: 'tên', hanViet: 'DANH TỰ', partOfSpeech: 'danh từ', ghiChu: '名 = tên, 字 = chữ/tên. Ghép thành từ chỉ tên riêng.' },
	{ simplified: '人', pinyin: 'rén', meaningVi: 'người', hanViet: 'NHÂN', partOfSpeech: 'danh từ', ghiChu: 'Hình người đứng. Dùng trong 中国人, 美国人.' },
	{ simplified: '不', pinyin: 'bù', meaningVi: 'không', hanViet: 'BẤT', partOfSpeech: 'phó từ', ghiChu: 'Phủ định trước động từ/tính từ. 不是, 不好, 不是学生.' },
	{ simplified: '也', pinyin: 'yě', meaningVi: 'cũng', hanViet: 'DÃ', partOfSpeech: 'phó từ', ghiChu: '我也是学生 = Tôi cũng là học sinh.' },
];

const BAI2_WORDS: Hsk1SampleWord[] = [
	{ simplified: '一', pinyin: 'yī', meaningVi: 'một', hanViet: 'NHẤT', partOfSpeech: 'số từ', ghiChu: 'Số 1. Một nét ngang.' },
	{ simplified: '二', pinyin: 'èr', meaningVi: 'hai', hanViet: 'NHỊ', partOfSpeech: 'số từ', ghiChu: 'Số 2. Hai nét ngang.' },
	{ simplified: '三', pinyin: 'sān', meaningVi: 'ba', hanViet: 'TAM', partOfSpeech: 'số từ', ghiChu: 'Số 3. Ba nét ngang.' },
	{ simplified: '四', pinyin: 'sì', meaningVi: 'bốn', hanViet: 'TỨ', partOfSpeech: 'số từ', ghiChu: 'Số 4. Chú ý thanh điệu sì (âm thấp).' },
	{ simplified: '五', pinyin: 'wǔ', meaningVi: 'năm', hanViet: 'NGŨ', partOfSpeech: 'số từ', ghiChu: 'Số 5.' },
	{ simplified: '六', pinyin: 'liù', meaningVi: 'sáu', hanViet: 'LỤC', partOfSpeech: 'số từ', ghiChu: 'Số 6.' },
	{ simplified: '七', pinyin: 'qī', meaningVi: 'bảy', hanViet: 'THẤT', partOfSpeech: 'số từ', ghiChu: 'Số 7.' },
	{ simplified: '八', pinyin: 'bā', meaningVi: 'tám', hanViet: 'BÁT', partOfSpeech: 'số từ', ghiChu: 'Số 8. Hai nét tách, giống chia đôi.' },
	{ simplified: '九', pinyin: 'jiǔ', meaningVi: 'chín', hanViet: 'CỬU', partOfSpeech: 'số từ', ghiChu: 'Số 9.' },
	{ simplified: '十', pinyin: 'shí', meaningVi: 'mười', hanViet: 'THẬP', partOfSpeech: 'số từ', ghiChu: 'Số 10. Ghép với số khác: 十一, 二十, 三十.' },
	{ simplified: '多少', pinyin: 'duōshao', meaningVi: 'bao nhiêu', hanViet: 'ĐA THIỂU', partOfSpeech: 'đại từ', ghiChu: 'Hỏi số lượng hoặc giá. 多少钱？ = Bao nhiêu tiền?' },
	{ simplified: '岁', pinyin: 'suì', meaningVi: 'tuổi', hanViet: 'TUẾ', partOfSpeech: 'lượng từ', ghiChu: '你几岁？ = Bạn mấy tuổi? Đi sau số.' },
	{ simplified: '几', pinyin: 'jǐ', meaningVi: 'mấy; vài', hanViet: 'KỶ', partOfSpeech: 'số từ', ghiChu: '几岁, 几个. Thường hỏi số nhỏ (< 10).' },
	{ simplified: '年', pinyin: 'nián', meaningVi: 'năm', hanViet: 'NIÊN', partOfSpeech: 'danh từ', ghiChu: '今年 = năm nay. 三年 = ba năm.' },
	{ simplified: '月', pinyin: 'yuè', meaningVi: 'tháng; mặt trăng', hanViet: 'NGUYỆT', partOfSpeech: 'danh từ', ghiChu: '一月 = tháng 1. Cũng chỉ mặt trăng trong văn học.' },
	{ simplified: '日', pinyin: 'rì', meaningVi: 'ngày; mặt trời', hanViet: 'NHẬT', partOfSpeech: 'danh từ', ghiChu: '三日 = ngày 3. 日本 = Nhật Bản.' },
	{ simplified: '今天', pinyin: 'jīntiān', meaningVi: 'hôm nay', hanViet: 'KIM THIÊN', partOfSpeech: 'danh từ', ghiChu: '今 = bây giờ/nay, 天 = ngày/trời.' },
	{ simplified: '明天', pinyin: 'míngtiān', meaningVi: 'ngày mai', hanViet: 'MINH THIÊN', partOfSpeech: 'danh từ', ghiChu: '明 = sáng/rõ. 明天见 = Mai gặp lại.' },
	{ simplified: '星期', pinyin: 'xīngqī', meaningVi: 'tuần; thứ (trong tuần)', hanViet: 'TINH KỲ', partOfSpeech: 'danh từ', ghiChu: '星期一 = thứ Hai. 星期天 = Chủ nhật.' },
	{ simplified: '现在', pinyin: 'xiànzài', meaningVi: 'bây giờ; hiện tại', hanViet: 'HIỆN TẠI', partOfSpeech: 'danh từ', ghiChu: '现 = hiện, 在 = ở/tại. 你现在做什么？' },
];

const BAI3_WORDS: Hsk1SampleWord[] = [
	{ simplified: '爸爸', pinyin: 'bàba', meaningVi: 'bố; cha', hanViet: 'BA BA', partOfSpeech: 'danh từ', ghiChu: 'Gọi thân mật. Lặp âm 爸 cho tự nhiên.' },
	{ simplified: '妈妈', pinyin: 'māma', meaningVi: 'mẹ; má', hanViet: 'MA MA', partOfSpeech: 'danh từ', ghiChu: 'Gọi thân mật. 妈 là âm mẹ trong tiếng Trung.' },
	{ simplified: '哥哥', pinyin: 'gēge', meaningVi: 'anh trai', hanViet: 'CA CA', partOfSpeech: 'danh từ', ghiChu: '哥 = anh. Có thể gọi người lớn tuổi hơn một cách thân thiện.' },
	{ simplified: '弟弟', pinyin: 'dìdi', meaningVi: 'em trai', hanViet: 'ĐỆ ĐỆ', partOfSpeech: 'danh từ', ghiChu: '弟 = em trai. 弟弟 nhỏ hơn mình.' },
	{ simplified: '姐姐', pinyin: 'jiějie', meaningVi: 'chị gái', hanViet: 'TỶ TỶ', partOfSpeech: 'danh từ', ghiChu: '姐 = chị. Gọi phụ nữ lớn tuổi hơn thân mật.' },
	{ simplified: '妹妹', pinyin: 'mèimei', meaningVi: 'em gái', hanViet: 'MUỘI MUỘI', partOfSpeech: 'danh từ', ghiChu: '妹 = em gái. Nhỏ hơn mình.' },
	{ simplified: '儿子', pinyin: 'érzi', meaningVi: 'con trai', hanViet: 'NHI TỬ', partOfSpeech: 'danh từ', ghiChu: '儿 = con, 子 = con/trẻ. Con trai của bố mẹ.' },
	{ simplified: '女儿', pinyin: 'nǚ\'ér', meaningVi: 'con gái', hanViet: 'NỮ NHI', partOfSpeech: 'danh từ', ghiChu: '女 = nữ, 儿 = con. Con gái của bố mẹ.' },
	{ simplified: '朋友', pinyin: 'péngyou', meaningVi: 'bạn bè', hanViet: 'BẰNG HỮU', partOfSpeech: 'danh từ', ghiChu: '朋 + 友 đều liên quan bạn bè. Rất thường dùng.' },
	{ simplified: '家', pinyin: 'jiā', meaningVi: 'nhà; gia đình', hanViet: 'GIA', partOfSpeech: 'danh từ', ghiChu: '我家 = nhà tôi. 家人 = người trong gia đình.' },
	{ simplified: '大', pinyin: 'dà', meaningVi: 'to; lớn', hanViet: 'ĐẠI', partOfSpeech: 'tính từ', ghiChu: '大家 = mọi người. Đối lập với 小.' },
	{ simplified: '小', pinyin: 'xiǎo', meaningVi: 'nhỏ; bé', hanViet: 'TIỂU', partOfSpeech: 'tính từ', ghiChu: '小孩 = trẻ em. 小狗 = chó con.' },
	{ simplified: '多', pinyin: 'duō', meaningVi: 'nhiều', hanViet: 'ĐA', partOfSpeech: 'tính từ', ghiChu: '很多人 = nhiều người. Đối lập 少.' },
	{ simplified: '少', pinyin: 'shǎo', meaningVi: 'ít', hanViet: 'THIỂU', partOfSpeech: 'tính từ', ghiChu: '很少 = rất ít. Cũng đọc shào (trẻ hơn) trong 少年.' },
	{ simplified: '男', pinyin: 'nán', meaningVi: 'nam; trai', hanViet: 'NAM', partOfSpeech: 'tính từ', ghiChu: '男人 = đàn ông. 男孩 = con trai.' },
	{ simplified: '女', pinyin: 'nǚ', meaningVi: 'nữ; gái', hanViet: 'NỮ', partOfSpeech: 'tính từ', ghiChu: '女人 = phụ nữ. 女孩 = con gái.' },
	{ simplified: '孩子', pinyin: 'háizi', meaningVi: 'con; trẻ em', hanViet: 'HÀI TỬ', partOfSpeech: 'danh từ', ghiChu: '孩 = trẻ, 子 = con. Dùng chung cho trẻ nhỏ.' },
	{ simplified: '爱', pinyin: 'ài', meaningVi: 'yêu; thích', hanViet: 'ÁI', partOfSpeech: 'động từ', ghiChu: '我爱你 = Anh/em yêu em/anh. Cũng: 爱学习.' },
	{ simplified: '他们', pinyin: 'tāmen', meaningVi: 'họ; các anh ấy', hanViet: 'THA MÊN', partOfSpeech: 'đại từ', ghiChu: '他 + 们 (hậu tố số nhiều). 她们 = họ (nữ).' },
	{ simplified: '我们', pinyin: 'wǒmen', meaningVi: 'chúng tôi; chúng ta', hanViet: 'NGÃ MÊN', partOfSpeech: 'đại từ', ghiChu: '我 + 们. Dùng khi nói về nhóm có mình.' },
];

export const HSK1_SAMPLE_SETS: Hsk1SampleSet[] = [
	{
		id: 'bai1',
		filename: 'hsk1_bai1_nihao_tu_vung.xlsx',
		boTu: 'HSK1 Bài 1 - 你好',
		description: GLOBAL_SAMPLE_SET_DESCRIPTION,
		words: BAI1_WORDS,
	},
	{
		id: 'bai2',
		filename: 'hsk1_bai2_shuzi_tu_vung.xlsx',
		boTu: 'HSK1 Bài 2 - 数字',
		description: GLOBAL_SAMPLE_SET_DESCRIPTION,
		words: BAI2_WORDS,
	},
	{
		id: 'bai3',
		filename: 'hsk1_bai3_jiaren_tu_vung.xlsx',
		boTu: 'HSK1 Bài 3 - 家人',
		description: GLOBAL_SAMPLE_SET_DESCRIPTION,
		words: BAI3_WORDS,
	},
];

export const GLOBAL_SAMPLE_SET_TITLES = HSK1_SAMPLE_SETS.map((s) => s.boTu);

export function getHsk1SampleSet(id: Hsk1SampleSetId): Hsk1SampleSet {
	const set = HSK1_SAMPLE_SETS.find((s) => s.id === id);
	if (!set) throw new Error(`Unknown sample set: ${id}`);
	return set;
}

export function parseHsk1SampleSetId(value: string | null | undefined): Hsk1SampleSetId {
	const normalized = (value ?? 'bai1').trim().toLowerCase();
	if (normalized === 'bai1' || normalized === 'bai2' || normalized === 'bai3') {
		return normalized;
	}
	throw new Error(`Invalid sample set id: ${value}`);
}
