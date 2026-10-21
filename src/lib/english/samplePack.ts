import type { EnglishPack } from '@/lib/english/contentValidation';

const tried = ['lend', 'take', 'get', 'use', 'rent'];

function gradeExample(
	english: string,
	meaningVi: string,
	target: string,
	audioFile: string,
	alternativesTried: string[] = tried,
	stillPlausible: string[] = [],
) {
	return { english, meaningVi, target, audioFile, alternativesTried, stillPlausible };
}

/** Small approved-shaped pack used by tests and the admin preview. Audio files are names only. */
export const sampleEnglishPack: EnglishPack = {
	title: 'Mượn và trả',
	description: 'Bộ mẫu để kiểm tra quy trình tiếng Anh.',
	audioFiles: [
		'borrow.mp3', 'borrow-1.mp3', 'borrow-2.mp3', 'borrow-3.mp3',
		'lend.mp3', 'lend-1.mp3', 'lend-2.mp3',
		'return.mp3', 'return-1.mp3', 'return-2.mp3',
		'keep.mp3', 'keep-1.mp3', 'keep-2.mp3',
		'pattern-1.mp3', 'pattern-2.mp3',
	],
	words: [
		{
			lemma: 'borrow',
			ipa: '/ˈbɒrəʊ/',
			stress: 'BOR-row',
			partOfSpeech: 'verb',
			forms: ['borrow', 'borrows', 'borrowed', 'borrowing'],
			meaningVi: 'mượn',
			collocations: ['borrow a pen', 'borrow money'],
			pitfallVi: 'borrow là đi mượn. lend là cho người khác mượn.',
			audioFile: 'borrow.mp3',
			distractorMeanings: [],
			distractorLemmas: [],
			examples: [
				gradeExample('I need to ___ a pen from Lan.', 'Tôi cần mượn một cây bút từ Lan.', 'borrow', 'borrow-1.mp3'),
				gradeExample('Can I ___ this dictionary until Friday?', 'Tôi có thể mượn cuốn từ điển này đến thứ Sáu không?', 'borrow', 'borrow-2.mp3'),
				gradeExample(
					'I will ___ this book.',
					'Tôi sẽ lấy cuốn sách này.',
					'borrow',
					'borrow-3.mp3',
					['buy', 'read', 'keep', 'take', 'get'],
					['buy', 'keep'],
				),
			],
		},
		{
			lemma: 'lend',
			ipa: '/lend/',
			stress: 'lend',
			partOfSpeech: 'verb',
			forms: ['lend', 'lends', 'lent', 'lending'],
			meaningVi: 'cho mượn',
			collocations: ['lend a pen', 'lend money'],
			pitfallVi: 'lend là đưa đồ cho người khác mượn.',
			audioFile: 'lend.mp3',
			distractorMeanings: [],
			distractorLemmas: [],
			examples: [
				gradeExample('Can you ___ me a pen?', 'Bạn cho tôi mượn một cây bút được không?', 'lend', 'lend-1.mp3', ['borrow', 'give', 'pass', 'hand', 'offer']),
				gradeExample('I can ___ you this umbrella.', 'Tôi có thể cho bạn mượn chiếc ô này.', 'lend', 'lend-2.mp3', ['borrow', 'give', 'pass', 'hand', 'offer']),
			],
		},
		{
			lemma: 'return',
			ipa: '/rɪˈtɜːn/',
			stress: 're-TURN',
			partOfSpeech: 'verb',
			forms: ['return', 'returns', 'returned', 'returning'],
			meaningVi: 'trả lại',
			collocations: ['return a book', 'return a favor'],
			pitfallVi: 'return ở đây là đưa lại đồ đã mượn.',
			audioFile: 'return.mp3',
			distractorMeanings: [],
			distractorLemmas: [],
			examples: [
				gradeExample('Please ___ the book tomorrow.', 'Hãy trả lại cuốn sách vào ngày mai.', 'return', 'return-1.mp3', ['keep', 'bring', 'take', 'give', 'hold']),
				gradeExample('I will ___ your umbrella tonight.', 'Tôi sẽ trả lại ô của bạn vào tối nay.', 'return', 'return-2.mp3', ['keep', 'bring', 'take', 'give', 'hold']),
			],
		},
		{
			lemma: 'keep',
			ipa: '/kiːp/',
			stress: 'keep',
			partOfSpeech: 'verb',
			forms: ['keep', 'keeps', 'kept', 'keeping'],
			meaningVi: 'giữ',
			collocations: ['keep a receipt', 'keep the change'],
			pitfallVi: 'keep là giữ lại, không phải trả lại.',
			audioFile: 'keep.mp3',
			distractorMeanings: [],
			distractorLemmas: [],
			examples: [
				gradeExample('You can ___ this pen.', 'Bạn có thể giữ cây bút này.', 'keep', 'keep-1.mp3', ['borrow', 'take', 'hold', 'use', 'return']),
				gradeExample('I will ___ the receipt.', 'Tôi sẽ giữ tờ hóa đơn này.', 'keep', 'keep-2.mp3', ['borrow', 'take', 'hold', 'lose', 'return']),
			],
		},
	],
	patterns: [
		{
			purposeVi: 'Nhờ được dùng đồ của người khác',
			frame: 'Could I ___ your ___?',
			fixedParts: ['Could I', 'your'],
			slots: [
				{ id: 'verb', labelVi: 'động từ', choices: ['borrow', 'use'] },
				{ id: 'thing', labelVi: 'đồ vật', choices: ['pen', 'charger'] },
			],
			pitfallVi: 'Phần Could I và your giữ nguyên. Chỉ thay động từ và đồ vật.',
			senseLemmas: ['borrow'],
			examples: [
				{
					english: 'Could I borrow your pen?',
					meaningVi: 'Tôi có thể mượn bút của bạn không?',
					audioFile: 'pattern-1.mp3',
					slotValues: [
						{ id: 'verb', value: 'borrow' },
						{ id: 'thing', value: 'pen' },
					],
				},
				{
					english: 'Could I use your charger?',
					meaningVi: 'Tôi có thể dùng sạc của bạn không?',
					audioFile: 'pattern-2.mp3',
					slotValues: [
						{ id: 'verb', value: 'use' },
						{ id: 'thing', value: 'charger' },
					],
				},
			],
		},
	],
};
