import type { HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import {
	formatHanziComponentRole,
	formatHanziEtymologyStatus,
	formatHanziStructureType,
} from '@/lib/chinese/hanziAiDisplay';
import type { HanziGoldenRunResult } from './hanziHarnessRunner';

export function formatHanziCharReport(char: HanziAnalysisResult['characters'][0]): string {
	const lines: string[] = [];
	lines.push(`  Chữ: ${char.char} | pinyin: ${char.pinyin} | Hán Việt: ${char.hanViet} | nghĩa: ${char.meaningVi}`);
	if (char.radical) {
		lines.push(`  Bộ thủ: ${char.radical.char} · ${char.radical.nameVi} — gợi ý: ${char.radical.meaningVi}${char.components.some((c) => c.isMainRadical) ? ' (có đánh dấu bộ chính trên thành phần)' : ''}`);
	} else {
		lines.push('  Bộ thủ: (không có)');
	}
	lines.push(`  Kiểu ghép: ${formatHanziStructureType(char.structureType)}`);
	lines.push(`  Từ nguyên: ${formatHanziEtymologyStatus(char.etymologyStatus)}${char.etymologyNoteVi ? ` — ${char.etymologyNoteVi}` : ''}`);

	const visual = char.components.filter((c) => c.role !== 'phonetic');
	const phonetic = char.components.filter((c) => c.role === 'phonetic');

	if (visual.length) {
		lines.push('  Thành phần dễ nhận biết:');
		for (const c of visual) {
			const role = formatHanziComponentRole(c.role);
			lines.push(`    - ${c.char} [${role.label}]${c.isMainRadical ? ' (bộ chính)' : ''}${c.meaningVi ? ` — gợi ý: ${c.meaningVi}` : ''}`);
			lines.push(`      ${c.publishExplanationVi ?? c.explanationVi ?? ''}`);
		}
	}
	if (phonetic.length) {
		lines.push('  Gợi âm (đã kiểm chứng):');
		for (const c of phonetic) {
			lines.push(`    - ${c.char}: ${c.publishExplanationVi ?? c.explanationVi ?? ''}`);
		}
	}
	if (char.mnemonicVi) {
		lines.push(`  Mẹo nhớ: ${char.mnemonicVi}`);
	}
	lines.push(`  Giải thích cấu tạo: ${char.structureExplanationVi}`);
	return lines.join('\n');
}

export interface HanziHarnessReport {
	total: number;
	passed: number;
	failed: number;
	results: HanziGoldenRunResult[];
}

export function buildHanziHarnessReport(results: HanziGoldenRunResult[]): HanziHarnessReport {
	const failed = results.filter((r) => !r.passed).length;
	return {
		total: results.length,
		passed: results.length - failed,
		failed,
		results,
	};
}

export function formatHanziHarnessReportText(report: HanziHarnessReport): string {
	const lines: string[] = [
		`Hanzi harness: ${report.passed}/${report.total} passed`,
		'',
	];
	for (const r of report.results) {
		const status = r.passed ? 'PASS' : 'FAIL';
		lines.push(`[${status}] ${r.id} (${r.term}, ${r.mode})`);
		if (!r.passed && r.error) {
			lines.push(`  → ${r.error}`);
		}
	}
	if (report.failed > 0) {
		lines.push('', `${report.failed} case(s) failed.`);
	}
	return lines.join('\n');
}

export function formatHanziHarnessReportJson(report: HanziHarnessReport): string {
	return JSON.stringify(report, null, 2);
}
