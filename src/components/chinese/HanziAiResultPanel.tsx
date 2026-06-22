"use client";

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SpeakButton from '@/components/chinese/SpeakButton';
import {
	DECOMPOSITION_UNAVAILABLE_MESSAGE,
	DECOMPOSITION_VISUAL_ONLY_NOTE,
	formatHanziEtymologyStatus,
	formatHanziPhoneticKind,
	formatHanziScript,
	formatHanziStructureType,
	getComponentDisplayText,
} from '@/lib/chinese/hanziAiDisplay';
import {
	buildComponentPartCardProps,
	buildRadicalPartCardProps,
	HanziPartCard,
} from '@/components/chinese/HanziPartCard';
import type { HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import type { HanziAiPublicAnalysis, HanziPartLexicon } from '@/services/chinese/hanziAi/hanziAiTypes';

const REPORT_REASONS = [
	['wrong_pinyin', 'Sai cách đọc (pinyin)'],
	['wrong_han_viet', 'Sai âm Hán Việt'],
	['wrong_meaning', 'Sai nghĩa tiếng Việt'],
	['wrong_radical', 'Sai bộ thủ'],
	['wrong_components', 'Sai thành phần chữ'],
	['unnatural_mnemonic', 'Liên tưởng khó hiểu'],
	['unnatural_example', 'Ví dụ chưa tự nhiên'],
	['other', 'Lỗi khác'],
] as const;

function CharSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
	const [open, setOpen] = useState(defaultOpen ?? false);
	return (
		<div className="border-t border-border pt-3">
			<button type="button" className="flex w-full items-center justify-between text-left text-sm font-bold" onClick={() => setOpen(!open)}>
				{title}
				<MaterialIcon name={open ? 'expand_less' : 'expand_more'} size={18} />
			</button>
			{open && <div className="mt-3">{children}</div>}
		</div>
	);
}

function CharacterCard({ char, partLexicon }: { char: HanziAnalysisResult['characters'][0]; partLexicon?: HanziPartLexicon }) {
	const mode = char.decompositionDisplayMode;
	const verifiedPhonetic = char.components.filter((c) => c.relation === 'phonetic' && c.claimTrust !== 'unverified');
	const displayComponents = char.components.filter((c) => {
		if (mode === 'hidden') return false;
		if (mode === 'visual_only' && c.relation === 'phonetic') return false;
		return getComponentDisplayText(c) !== null || c.claimTrust !== 'unverified';
	});

	const radicalInComponents = char.radical
		&& displayComponents.some((c) => c.char === char.radical!.char && c.isMainRadical);
	const showRadicalCard = char.radical && !radicalInComponents;

	return (
		<article className="card-paper p-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="hanzi-display text-4xl font-black">{char.char}</p>
					<p className="mt-1 text-xs text-muted">Cách đọc</p>
					<p className="font-bold text-accent">{char.pinyin}</p>
					{char.pinyinInTerm && char.pinyinInTerm !== char.pinyin.replace(/[1-5]/g, '') && (
						<p className="mt-1 text-xs text-foreground-secondary">
							Trong từ này: <span className="font-semibold">{char.pinyinInTerm}</span>
							{char.toneBehavior === 'neutral_tone' ? ' (nhẹ)' : ''}
						</p>
					)}
					{char.dictionaryReadings.length > 0 && char.pinyinInTerm && (
						<p className="mt-0.5 text-xs text-muted">Đọc riêng: {char.dictionaryReadings[0] ?? char.pinyin}</p>
					)}
				</div>
				<div className="text-right">
					<p className="text-xs text-muted">Âm Hán Việt</p>
					<p className="text-xs font-bold uppercase text-muted">{char.hanViet}</p>
					<p className="mt-2 text-xs text-muted">Nghĩa của chữ này</p>
					<p className="text-sm font-bold">{char.meaningVi}</p>
				</div>
			</div>

			{mode === 'hidden' ? (
				<p className="mt-4 rounded-lg border border-border bg-surface-dim px-4 py-3 text-sm text-foreground-secondary">
					{DECOMPOSITION_UNAVAILABLE_MESSAGE}
				</p>
			) : (
				<CharSection title="Nhận diện mặt chữ" defaultOpen>
					<p className="mb-3 text-xs text-foreground-secondary">
						Bộ thủ tra cứu — dùng để tra trong từ điển Hán, không phải toàn bộ nghĩa chữ.
					</p>
					{mode === 'visual_only' && (
						<p className="mb-2 text-xs text-muted">{DECOMPOSITION_VISUAL_ONLY_NOTE}</p>
					)}
					{(showRadicalCard || displayComponents.length > 0) && (
						<ul className="grid gap-3 sm:grid-cols-2">
							{showRadicalCard && char.radical && (
								<HanziPartCard
									key={`radical-${char.radical.char}`}
									{...buildRadicalPartCardProps(char.radical, partLexicon)}
								/>
							)}
							{displayComponents.map((component) => (
								<HanziPartCard
									key={`${component.position}-${component.char}`}
									{...buildComponentPartCardProps(component, getComponentDisplayText, partLexicon)}
								/>
							))}
						</ul>
					)}
					<p className="mt-3 text-xs text-muted">Kiểu ghép: {formatHanziStructureType(char.structureType)}</p>
					<p className="mt-2 text-sm text-foreground-secondary">{char.structureExplanationVi}</p>
				</CharSection>
			)}

			{char.mnemonicVi && (
				<CharSection title="Liên tưởng để nhớ mặt chữ">
					<p className="text-xs text-muted mb-2">Câu chuyện liên tưởng — không phải giải thích từ nguyên.</p>
					<p className="text-sm">{char.mnemonicVi}</p>
				</CharSection>
			)}

			{mode === 'full' && verifiedPhonetic.length > 0 && (
				<CharSection title="Gợi âm (đã kiểm chứng)">
					<ul className="mt-1 space-y-2">
						{verifiedPhonetic.map((component) => (
							<li key={`phy-${component.position}-${component.char}`} className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
								<span className="hanzi-lg font-bold">{component.char}</span>
								<span className="ml-2 text-xs font-semibold">{formatHanziPhoneticKind(component.phoneticKind)}</span>
								<p className="mt-1 text-foreground-secondary">{component.publishExplanationVi}</p>
							</li>
						))}
					</ul>
				</CharSection>
			)}

			{mode !== 'hidden' && char.etymologyStatus === 'supported' && char.etymologyNoteVi && (
				<CharSection title="Ghi chú từ nguyên">
					<p className="text-xs text-muted">{formatHanziEtymologyStatus(char.etymologyStatus)}</p>
					<p className="mt-2 text-sm text-foreground-secondary">{char.etymologyNoteVi}</p>
				</CharSection>
			)}

			{char.similarCharacters.length > 0 && (
				<CharSection title="Chữ dễ nhầm">
					<ul className="space-y-1 text-sm">
						{char.similarCharacters.map((similar) => (
							<li key={similar.char}>
								<span className="hanzi-lg font-bold">{similar.char}</span>
								<span className="text-foreground-secondary"> — {similar.differenceVi}</span>
							</li>
						))}
					</ul>
				</CharSection>
			)}
		</article>
	);
}

export default function HanziAiResultPanel({ value }: { value: HanziAiPublicAnalysis }) {
	const result = value.analysis;
	const [reporting, setReporting] = useState(false);
	const [reason, setReason] = useState('wrong_meaning');
	const [note, setNote] = useState('');
	const [message, setMessage] = useState<string | null>(null);

	if (!result) return null;

	const scriptLabel = formatHanziScript(result.script);
	const showScriptPair = result.simplified && result.traditional && result.simplified !== result.traditional;

	const submitReport = async () => {
		setMessage(null);
		const response = await fetch(`/api/hanzi/analysis/${value.id}/report`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason, note }),
		});
		const json = await response.json() as { ok: boolean; error?: string };
		if (!json.ok) return setMessage(json.error ?? 'Không gửi được báo lỗi');
		setMessage('Đã gửi báo lỗi. Cảm ơn bạn.');
		setReporting(false);
	};

	return (
		<div className="space-y-6">
			<p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-foreground-secondary">
				Phân tích hỗ trợ học — không thay sách giáo khoa hay từ điển chuyên môn. Phần cấu tạo chỉ hiển thị khi đã được kiểm chứng; mẹo liên tưởng không phải từ nguyên.
			</p>

			{value.legacyPrompt && (
				<p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground-secondary">
					Bản phân tích này dùng phiên bản cũ — nên bấm phân tích lại để có bản chuẩn hơn.
				</p>
			)}

			{value.decompositionLimited && result.decompositionStatus !== 'full' && (
				<p className="rounded-lg border border-border bg-surface-dim p-3 text-sm text-foreground-secondary">
					Một số phần cấu tạo chưa đủ tin cậy để hiển thị chi tiết — bạn vẫn xem được nghĩa, cách đọc và ví dụ bên dưới.
				</p>
			)}

			<section className="card-paper p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex items-start gap-3">
						<h2 className="hanzi-display text-5xl font-black">{result.displayTerm ?? result.term}</h2>
						<SpeakButton text={result.term} iconOnly />
					</div>
					<span className="rounded-full bg-surface-dim px-3 py-1 text-xs font-semibold">{scriptLabel}</span>
				</div>
				{showScriptPair && (
					<p className="mt-2 text-sm text-muted">
						Giản thể: <span className="hanzi-lg font-bold text-foreground">{result.simplified}</span>
						{' · '}
						Phồn thể: <span className="hanzi-lg font-bold text-foreground">{result.traditional}</span>
					</p>
				)}
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					<div>
						<p className="text-xs font-bold uppercase tracking-wide text-muted">Cách đọc (pinyin)</p>
						<p className="text-lg font-bold text-accent">{result.pinyin}</p>
					</div>
					{result.hanViet && (
						<div>
							<p className="text-xs font-bold uppercase tracking-wide text-muted">Âm Hán Việt</p>
							<p className="text-sm font-bold uppercase text-muted">{result.hanViet}</p>
						</div>
					)}
				</div>
				<div className="mt-4">
					<p className="text-xs font-bold uppercase tracking-wide text-muted">Nghĩa chính</p>
					<p className="text-lg font-extrabold">{result.primaryMeaningVi}</p>
					{result.otherMeaningsVi.length > 0 && (
						<p className="mt-1 text-sm text-foreground-secondary">
							<span className="font-semibold">Nghĩa khác:</span> {result.otherMeaningsVi.join(' · ')}
						</p>
					)}
				</div>
				{result.wordClasses.length > 0 && (
					<p className="mt-3 text-sm text-foreground-secondary">
						<span className="font-bold">Từ loại thường gặp:</span> {result.wordClasses.join(' · ')}
					</p>
				)}
				{result.usageNoteVi && (
					<p className="mt-3 rounded-lg border border-accent/20 bg-accent-subtle px-4 py-3 text-sm text-foreground-secondary">
						<span className="font-bold">Cách dùng:</span> {result.usageNoteVi}
					</p>
				)}
				<p className="mt-3 text-sm leading-relaxed text-foreground-secondary">{result.overallExplanationVi}</p>
				{result.overallMnemonicVi && (
					<div className="mt-4 rounded-lg border border-border bg-background p-4">
						<p className="label-caps">Liên tưởng nhớ cả từ</p>
						<p className="mt-1 text-xs text-muted">Không phải giải thích từ nguyên.</p>
						<p className="mt-2 text-sm">{result.overallMnemonicVi}</p>
					</div>
				)}
				{result.warnings.length > 0 && (
					<ul className="mt-4 space-y-1 text-xs text-warning">
						{result.warnings.map((w) => <li key={w}>• {w}</li>)}
					</ul>
				)}
			</section>

			<section>
				<h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
					<MaterialIcon name="account_tree" size={20} /> Từng chữ trong từ
				</h3>
				<p className="mb-3 text-sm text-foreground-secondary">Mở từng chữ để xem cách nhận diện mặt chữ (khi đủ tin cậy).</p>
				<div className="flex flex-col gap-4">
					{result.characters.map((char) => (
						<CharacterCard key={`${char.position}-${char.char}`} char={char} partLexicon={value.partLexicon} />
					))}
				</div>
			</section>

			{result.examples.length > 0 && (
				<section className="card-paper p-6">
					<h3 className="text-lg font-extrabold">Ví dụ trong câu</h3>
					<div className="mt-4 space-y-4">
						{result.examples.map((example, index) => (
							<div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
								<p className="hanzi-lg text-lg font-bold">{example.chinese}</p>
								<p className="text-sm text-accent">{example.pinyin}</p>
								<p className="mt-1 text-sm text-foreground-secondary">{example.meaningVi}</p>
							</div>
						))}
					</div>
				</section>
			)}

			<section className="text-center">
				<button type="button" className="btn-secondary" onClick={() => setReporting(!reporting)}>Thấy sai sót? Gửi báo lỗi</button>
				{reporting && (
					<div className="mx-auto mt-3 max-w-lg space-y-3 rounded-xl border border-border p-4 text-left">
						<select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm">
							{REPORT_REASONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
						</select>
						<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Mô tả thêm (không bắt buộc)" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
						<button type="button" onClick={() => void submitReport()} className="btn-primary">Gửi báo lỗi</button>
					</div>
				)}
				{message && <p className="mt-2 text-sm text-muted">{message}</p>}
			</section>
		</div>
	);
}
