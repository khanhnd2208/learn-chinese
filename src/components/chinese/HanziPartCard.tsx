"use client";

import {
	formatHanziComponentRole,
	formatHanziPhoneticKind,
	resolvePartDisplay,
} from '@/lib/chinese/hanziAiDisplay';
import type { HanziCharacterAnalysis, HanziComponentAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import type { HanziPartLexicon } from '@/services/chinese/hanziAi/hanziAiTypes';

interface Props {
	char: string;
	pinyin: string | null;
	hanViet: string | null;
	meaningVi: string | null;
	incomplete?: boolean;
	roleLabel: string;
	roleHint?: string;
	phoneticKindLabel?: string | null;
	isMainRadical?: boolean;
	positionNote?: string | null;
	variantNote?: string | null;
}

export function HanziPartCard({
	char,
	pinyin,
	hanViet,
	meaningVi,
	incomplete,
	roleLabel,
	roleHint,
	phoneticKindLabel,
	isMainRadical,
	positionNote,
	variantNote,
}: Props) {
	return (
		<li className="rounded-lg border border-border bg-background px-3 py-3">
			<div className="flex items-start gap-4">
				<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
					<span className="hanzi-display text-3xl font-black text-foreground">{char}</span>
				</div>
				<div className="min-w-0 flex-1">
					{pinyin && (
						<>
							<p className="text-xs text-muted">Cách đọc</p>
							<p className="font-bold text-accent">{pinyin}</p>
						</>
					)}
					{hanViet && (
						<>
							<p className="mt-1 text-xs text-muted">Âm Hán Việt</p>
							<p className="text-xs font-bold uppercase text-muted">{hanViet}</p>
						</>
					)}
					{meaningVi && (
						<>
							<p className="mt-1 text-xs text-muted">Nghĩa</p>
							<p className="text-sm font-bold text-foreground">{meaningVi}</p>
						</>
					)}
					{incomplete && (
						<p className="mt-1 text-xs text-muted">Một phần thông tin chưa có trong từ điển</p>
					)}
				</div>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-surface-dim px-2 py-0.5 text-xs font-semibold text-foreground-secondary">{roleLabel}</span>
				{phoneticKindLabel && (
					<span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-foreground-secondary">{phoneticKindLabel}</span>
				)}
				{isMainRadical && (
					<span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent">Bộ chính</span>
				)}
			</div>
			{roleHint && <p className="mt-1 text-xs text-muted">{roleHint}</p>}
			{positionNote && <p className="mt-1 text-sm text-foreground-secondary">{positionNote}</p>}
			{variantNote && <p className="mt-1 text-xs text-muted">{variantNote}</p>}
		</li>
	);
}

export function buildRadicalPartCardProps(
	radical: NonNullable<HanziCharacterAnalysis['radical']>,
	partLexicon?: HanziPartLexicon,
) {
	const display = resolvePartDisplay(radical.char, partLexicon?.[radical.char], {
		hanViet: radical.nameVi,
		meaningVi: radical.meaningVi,
	});
	const role = formatHanziComponentRole('radical');
	return {
		char: display.char,
		pinyin: display.pinyin,
		hanViet: display.hanViet,
		meaningVi: display.meaningVi,
		incomplete: display.incomplete,
		roleLabel: role.label,
		roleHint: role.hint,
		isMainRadical: true,
		variantNote: radical.variantNoteVi
			?? (radical.standardChar && radical.standardChar !== radical.char
				? `Bộ chuẩn: ${radical.standardChar}`
				: null),
	};
}

export function buildComponentPartCardProps(
	component: HanziComponentAnalysis,
	getDisplayText: (c: HanziComponentAnalysis) => string | null,
	partLexicon?: HanziPartLexicon,
) {
	const display = resolvePartDisplay(component.char, partLexicon?.[component.char], {
		meaningVi: component.meaningVi,
	});
	const role = formatHanziComponentRole(component.role);
	return {
		char: display.char,
		pinyin: display.pinyin,
		hanViet: display.hanViet,
		meaningVi: display.meaningVi,
		incomplete: display.incomplete,
		roleLabel: role.label,
		roleHint: role.hint,
		phoneticKindLabel: formatHanziPhoneticKind(component.phoneticKind),
		isMainRadical: component.isMainRadical,
		positionNote: getDisplayText(component),
	};
}
