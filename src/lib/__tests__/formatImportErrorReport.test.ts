import { describe, expect, it } from 'vitest';
import { formatImportErrorReport, type ImportPreview } from '@/app/(app)/sets/import/SetImportShared';

function basePreview(overrides: Partial<ImportPreview> = {}): ImportPreview {
	return {
		sets: 1,
		items: 0,
		progress: 0,
		answerLogs: 0,
		matchedWords: 0,
		pendingWords: 0,
		errors: [],
		warnings: [],
		...overrides,
	};
}

describe('formatImportErrorReport', () => {
	it('includes context, errors, and bad example details', () => {
		const text = formatImportErrorReport(
			basePreview({
				errors: ['tu_vung dòng 5: thiếu pinyin'],
				badExampleWarnings: [
					{
						rowNumber: 5,
						simplified: '老师',
						exampleIndex: 1,
						sentence: 'bad **markdown**',
						reason: 'Không dùng Markdown',
					},
				],
			}),
			'AI Smart Import · Bộ: HSK1',
		);

		expect(text).toContain('Báo cáo lỗi import');
		expect(text).toContain('AI Smart Import · Bộ: HSK1');
		expect(text).toContain('=== Lỗi (1) ===');
		expect(text).toContain('tu_vung dòng 5: thiếu pinyin');
		expect(text).toContain('=== Chi tiết lỗi câu ví dụ (1) ===');
		expect(text).toContain('Dòng 5 (老师)');
		expect(text).toContain('vi_du_1: Không dùng Markdown');
		expect(text).toContain('Nội dung: bad **markdown**');
	});
});
