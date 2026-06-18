/* ════════════════════════════════════════════════════════════════════════
   Demo user data — bộ từ theo buổi học HSK1, SRS, answer logs
   Tất cả từ đều có trong DB — sẵn sàng test toàn bộ chức năng
   ════════════════════════════════════════════════════════════════════════ */
import type { PrismaClient } from '@prisma/client';
import type { CnErrorType, CnQuestionType, CnWordProgressState } from '@prisma/client';
import { MongoClient } from 'mongodb';

export interface DemoSetSeed {
	title: string;
	description: string;
	source: 'manual' | 'hsk' | 'textbook';
	terms: string[];
}

/** 5 bộ từ theo tiến trình HSK1 buổi 1–5 + 1 bộ nâng cao */
export const DEMO_SETS: DemoSetSeed[] = [
	{
		title: 'HSK1 — Buổi 1: Chào hỏi',
		description: 'Chào hỏi, cảm ơn, xin lỗi — từ đầu tiên mọi người học',
		source: 'textbook',
		terms: ['你好', '谢谢', '再见', '不客气', '对不起', '没关系', '请问', '什么'],
	},
	{
		title: 'HSK1 — Buổi 2: Giới thiệu',
		description: 'Giới thiệu bản thân, nghề nghiệp, quốc tịch, gia đình',
		source: 'textbook',
		terms: ['我', '学生', '老师', '名字', '叫', '是', '人', '中国', '越南', '朋友', '爸爸', '妈妈'],
	},
	{
		title: 'HSK1 — Buổi 3: Số & chỉ định',
		description: 'Số đếm cơ bản, hỏi giá, chỉ định đồ vật',
		source: 'textbook',
		terms: ['一', '二', '三', '十', '多少', '钱', '这', '那', '书', '漂亮'],
	},
	{
		title: 'HSK1 — Buổi 4: Hàng ngày',
		description: 'Nơi chốn, thời gian, ăn uống, hoạt động thường ngày',
		source: 'textbook',
		terms: ['在', '学校', '家', '今天', '明天', '吃', '吃饭', '去', '看', '有', '工作', '睡觉', '水', '饭', '饭店'],
	},
	{
		title: 'HSK1 — Buổi 5: Cảm xúc & giao tiếp',
		description: 'Thích, vui, uống trà — hoàn thiện giao tiếp cơ bản',
		source: 'textbook',
		terms: ['喜欢', '高兴', '喝茶', '朋友', '老师', '请问', '谢谢', '电脑', '飞机'],
	},
	{
		title: 'Nâng cao — Phân biệt chữ dễ nhầm',
		description: 'Nhóm thanh 青 & 分 — test Hanzi Lab + similar_char',
		source: 'manual',
		terms: ['请问', '十分', '喜欢', '折磨', '请', '情', '清', '晴', '分', '粉'],
	},
];

interface ProgressSeed {
	simplified: string;
	state: CnWordProgressState;
	intervalIdx: number;
	dueOffsetMinutes: number;
	meaningCorrect: number;
	meaningTotal: number;
	listeningCorrect: number;
	listeningTotal: number;
	pinyinCorrect: number;
	pinyinTotal: number;
	sentenceCorrect: number;
	sentenceTotal: number;
	charCorrect: number;
	charTotal: number;
}

/** 18 bản ghi SRS — đủ trạng thái, phân bố theo buổi học */
export const DEMO_PROGRESS: ProgressSeed[] = [
	// Buổi 1 — mới học, nhiều lỗi
	{ simplified: '你好', state: 'weak', intervalIdx: 0, dueOffsetMinutes: -30, meaningCorrect: 2, meaningTotal: 5, listeningCorrect: 1, listeningTotal: 4, pinyinCorrect: 2, pinyinTotal: 3, sentenceCorrect: 0, sentenceTotal: 2, charCorrect: 1, charTotal: 2 },
	{ simplified: '谢谢', state: 'learning', intervalIdx: 0, dueOffsetMinutes: -10, meaningCorrect: 3, meaningTotal: 4, listeningCorrect: 2, listeningTotal: 3, pinyinCorrect: 1, pinyinTotal: 2, sentenceCorrect: 1, sentenceTotal: 2, charCorrect: 0, charTotal: 1 },
	{ simplified: '再见', state: 'weak', intervalIdx: 0, dueOffsetMinutes: 0, meaningCorrect: 1, meaningTotal: 3, listeningCorrect: 0, listeningTotal: 2, pinyinCorrect: 2, pinyinTotal: 4, sentenceCorrect: 0, sentenceTotal: 0, charCorrect: 0, charTotal: 0 },
	// Buổi 2 — đang học dần
	{ simplified: '学生', state: 'learning', intervalIdx: 1, dueOffsetMinutes: -60, meaningCorrect: 4, meaningTotal: 6, listeningCorrect: 3, listeningTotal: 5, pinyinCorrect: 2, pinyinTotal: 3, sentenceCorrect: 2, sentenceTotal: 3, charCorrect: 1, charTotal: 1 },
	{ simplified: '老师', state: 'learning', intervalIdx: 1, dueOffsetMinutes: -20, meaningCorrect: 3, meaningTotal: 5, listeningCorrect: 2, listeningTotal: 4, pinyinCorrect: 3, pinyinTotal: 4, sentenceCorrect: 1, sentenceTotal: 2, charCorrect: 1, charTotal: 2 },
	{ simplified: '名字', state: 'familiar', intervalIdx: 2, dueOffsetMinutes: 60, meaningCorrect: 6, meaningTotal: 8, listeningCorrect: 5, listeningTotal: 7, pinyinCorrect: 4, pinyinTotal: 5, sentenceCorrect: 3, sentenceTotal: 4, charCorrect: 2, charTotal: 3 },
	{ simplified: '中国', state: 'familiar', intervalIdx: 2, dueOffsetMinutes: 90, meaningCorrect: 5, meaningTotal: 7, listeningCorrect: 4, listeningTotal: 6, pinyinCorrect: 4, pinyinTotal: 5, sentenceCorrect: 3, sentenceTotal: 3, charCorrect: 2, charTotal: 2 },
	// Buổi 3–4 — quen dần
	{ simplified: '多少', state: 'familiar', intervalIdx: 3, dueOffsetMinutes: 120, meaningCorrect: 7, meaningTotal: 9, listeningCorrect: 6, listeningTotal: 8, pinyinCorrect: 5, pinyinTotal: 6, sentenceCorrect: 4, sentenceTotal: 5, charCorrect: 3, charTotal: 4 },
	{ simplified: '学校', state: 'strong', intervalIdx: 4, dueOffsetMinutes: 1440, meaningCorrect: 8, meaningTotal: 9, listeningCorrect: 7, listeningTotal: 8, pinyinCorrect: 6, pinyinTotal: 7, sentenceCorrect: 5, sentenceTotal: 6, charCorrect: 4, charTotal: 5 },
	{ simplified: '吃饭', state: 'strong', intervalIdx: 4, dueOffsetMinutes: 2880, meaningCorrect: 9, meaningTotal: 10, listeningCorrect: 8, listeningTotal: 9, pinyinCorrect: 7, pinyinTotal: 8, sentenceCorrect: 6, sentenceTotal: 7, charCorrect: 5, charTotal: 6 },
	// Buổi 5 — thành thạo
	{ simplified: '喜欢', state: 'strong', intervalIdx: 4, dueOffsetMinutes: 4320, meaningCorrect: 8, meaningTotal: 9, listeningCorrect: 7, listeningTotal: 8, pinyinCorrect: 6, pinyinTotal: 7, sentenceCorrect: 5, sentenceTotal: 6, charCorrect: 4, charTotal: 5 },
	{ simplified: '高兴', state: 'mastered', intervalIdx: 5, dueOffsetMinutes: 10080, meaningCorrect: 10, meaningTotal: 10, listeningCorrect: 9, listeningTotal: 10, pinyinCorrect: 8, pinyinTotal: 9, sentenceCorrect: 7, sentenceTotal: 8, charCorrect: 6, charTotal: 7 },
	{ simplified: '喝茶', state: 'mastered', intervalIdx: 5, dueOffsetMinutes: 10080, meaningCorrect: 10, meaningTotal: 10, listeningCorrect: 10, listeningTotal: 10, pinyinCorrect: 9, pinyinTotal: 10, sentenceCorrect: 8, sentenceTotal: 9, charCorrect: 7, charTotal: 8 },
	{ simplified: '朋友', state: 'mastered', intervalIdx: 5, dueOffsetMinutes: 20160, meaningCorrect: 10, meaningTotal: 10, listeningCorrect: 10, listeningTotal: 10, pinyinCorrect: 10, pinyinTotal: 10, sentenceCorrect: 9, sentenceTotal: 10, charCorrect: 8, charTotal: 9 },
	// Còn lại
	{ simplified: '什么', state: 'familiar', intervalIdx: 2, dueOffsetMinutes: 60, meaningCorrect: 6, meaningTotal: 8, listeningCorrect: 5, listeningTotal: 7, pinyinCorrect: 4, pinyinTotal: 5, sentenceCorrect: 3, sentenceTotal: 4, charCorrect: 2, charTotal: 3 },
	{ simplified: '请问', state: 'strong', intervalIdx: 4, dueOffsetMinutes: 2880, meaningCorrect: 9, meaningTotal: 10, listeningCorrect: 8, listeningTotal: 9, pinyinCorrect: 7, pinyinTotal: 8, sentenceCorrect: 6, sentenceTotal: 7, charCorrect: 5, charTotal: 6 },
	{ simplified: '今天', state: 'learning', intervalIdx: 1, dueOffsetMinutes: 720, meaningCorrect: 5, meaningTotal: 7, listeningCorrect: 4, listeningTotal: 6, pinyinCorrect: 3, pinyinTotal: 5, sentenceCorrect: 2, sentenceTotal: 4, charCorrect: 2, charTotal: 3 },
	{ simplified: '漂亮', state: 'learning', intervalIdx: 1, dueOffsetMinutes: -15, meaningCorrect: 2, meaningTotal: 4, listeningCorrect: 1, listeningTotal: 3, pinyinCorrect: 2, pinyinTotal: 3, sentenceCorrect: 1, sentenceTotal: 2, charCorrect: 1, charTotal: 2 },
	{ simplified: '折磨', state: 'weak', intervalIdx: 0, dueOffsetMinutes: -5, meaningCorrect: 1, meaningTotal: 4, listeningCorrect: 0, listeningTotal: 3, pinyinCorrect: 1, pinyinTotal: 3, sentenceCorrect: 0, sentenceTotal: 1, charCorrect: 2, charTotal: 5 },
];

interface AnswerLogSeed {
	simplified: string;
	questionType: CnQuestionType;
	correct: boolean;
	errorType?: CnErrorType;
	daysAgo: number;
}

/** 16 answer logs — đủ loại câu hỏi & lỗi cho Dashboard */
export const DEMO_ANSWER_LOGS: AnswerLogSeed[] = [
	{ simplified: '你好', questionType: 'hanzi_to_meaning', correct: false, errorType: 'sai_nghia', daysAgo: 0 },
	{ simplified: '老师', questionType: 'meaning_to_hanzi', correct: false, errorType: 'quen_hanzi', daysAgo: 0 },
	{ simplified: '再见', questionType: 'audio_to_hanzi', correct: false, errorType: 'nghe_khong_ra', daysAgo: 0 },
	{ simplified: '谢谢', questionType: 'audio_to_pinyin', correct: false, errorType: 'sai_thanh_dieu', daysAgo: 1 },
	{ simplified: '什么', questionType: 'pinyin_to_hanzi', correct: false, errorType: 'sai_pinyin', daysAgo: 1 },
	{ simplified: '请问', questionType: 'similar_char', correct: false, errorType: 'nham_chu', daysAgo: 2 },
	{ simplified: '吃饭', questionType: 'fill_sentence', correct: false, errorType: 'sai_mau_cau', daysAgo: 2 },
	{ simplified: '学校', questionType: 'sentence_order', correct: false, errorType: 'sai_vi_tri', daysAgo: 2 },
	{ simplified: '名字', questionType: 'char_components', correct: false, errorType: 'nham_chu', daysAgo: 3 },
	{ simplified: '多少', questionType: 'radical_pick', correct: false, errorType: 'nham_chu', daysAgo: 3 },
	{ simplified: '高兴', questionType: 'hanzi_to_meaning', correct: true, daysAgo: 4 },
	{ simplified: '喝茶', questionType: 'audio_to_meaning', correct: true, daysAgo: 4 },
	{ simplified: '今天', questionType: 'translate_sentence', correct: true, daysAgo: 5 },
	{ simplified: '朋友', questionType: 'meaning_to_hanzi', correct: true, daysAgo: 5 },
	{ simplified: '喜欢', questionType: 'audio_to_hanzi', correct: true, daysAgo: 6 },
	{ simplified: '折磨', questionType: 'radical_pick', correct: false, errorType: 'nham_chu', daysAgo: 6 },
];

const FALLBACK_AUTH_DB = 'my_teaching_platform';

async function findUserIdByEmail(client: MongoClient, dbName: string, email: string): Promise<string | null> {
	const user = await client.db(dbName).collection('users').findOne({ email });
	return user?._id?.toString() ?? null;
}

export async function resolveSeedUserId(): Promise<string | null> {
	const direct = process.env.SEED_USER_ID?.trim();
	if (direct) return direct;

	const email = (process.env.SEED_USER_EMAIL ?? process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL)?.split(',')[0]?.trim();
	if (!email) return null;

	const uri = process.env.MONGODB_URI;
	if (!uri) return null;

	const client = new MongoClient(uri);
	try {
		await client.connect();
		const primaryDb = new URL(uri).pathname.replace(/^\//, '') || 'learn_chinese_auth';
		const fromPrimary = await findUserIdByEmail(client, primaryDb, email);
		if (fromPrimary) return fromPrimary;

		try {
			return await findUserIdByEmail(client, FALLBACK_AUTH_DB, email);
		} catch {
			return null;
		}
	} finally {
		await client.close();
	}
}

/** Idempotent: seed demo sets/SRS only when user has no word sets yet */
export async function ensureDemoDataForUser(prisma: PrismaClient, userId: string): Promise<boolean> {
	const existing = await prisma.cnWordSet.count({ where: { userId } });
	if (existing > 0) return false;
	await seedDemoUserData(prisma, userId);
	return true;
}

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

export async function seedDemoUserData(prisma: PrismaClient, userId: string): Promise<void> {
	console.log(`  👤 Seeding demo data for user ${userId.slice(0, 8)}…`);

	const words = await prisma.cnWord.findMany({
		where: { status: 'published' },
		select: { id: true, simplified: true },
	});
	const wordMap = new Map(words.map((w) => [w.simplified, w.id]));

	await prisma.cnAnswerLog.deleteMany({ where: { userId } });
	await prisma.cnWordProgress.deleteMany({ where: { userId } });
	const existingSets = await prisma.cnWordSet.findMany({ where: { userId }, select: { id: true } });
	for (const set of existingSets) {
		await prisma.cnWordSetItem.deleteMany({ where: { setId: set.id } });
	}
	await prisma.cnWordSet.deleteMany({ where: { userId } });

	for (const setSeed of DEMO_SETS) {
		const resolved = setSeed.terms.filter((t) => wordMap.has(t)).length;
		await prisma.cnWordSet.create({
			data: {
				userId,
				title: setSeed.title,
				description: setSeed.description,
				source: setSeed.source,
				srsActive: true,
				items: {
					create: setSeed.terms.map((term) => ({
						rawTerm: term,
						wordId: wordMap.get(term) ?? null,
					})),
				},
			},
		});
		console.log(`    📚 Set "${setSeed.title}" — ${setSeed.terms.length} mục (${resolved} có dữ liệu)`);
	}

	const now = new Date();
	let progressCount = 0;
	for (const p of DEMO_PROGRESS) {
		const wordId = wordMap.get(p.simplified);
		if (!wordId) continue;
		await prisma.cnWordProgress.create({
			data: {
				userId,
				wordId,
				state: p.state,
				intervalIdx: p.intervalIdx,
				dueAt: addMinutes(now, p.dueOffsetMinutes),
				lastReviewedAt: addDays(now, -1),
				meaningCorrect: p.meaningCorrect,
				meaningTotal: p.meaningTotal,
				listeningCorrect: p.listeningCorrect,
				listeningTotal: p.listeningTotal,
				pinyinCorrect: p.pinyinCorrect,
				pinyinTotal: p.pinyinTotal,
				sentenceCorrect: p.sentenceCorrect,
				sentenceTotal: p.sentenceTotal,
				charCorrect: p.charCorrect,
				charTotal: p.charTotal,
			},
		});
		progressCount++;
	}
	console.log(`    📈 ${progressCount} SRS progress records`);

	let logCount = 0;
	for (const log of DEMO_ANSWER_LOGS) {
		const wordId = wordMap.get(log.simplified);
		if (!wordId) continue;
		await prisma.cnAnswerLog.create({
			data: {
				userId,
				wordId,
				questionType: log.questionType,
				correct: log.correct,
				errorType: log.correct ? null : (log.errorType ?? null),
				createdAt: addDays(now, -log.daysAgo),
			},
		});
		logCount++;
	}
	console.log(`    📊 ${logCount} answer logs`);
}
