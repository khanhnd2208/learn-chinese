"use client";

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SpeakButton from '@/components/chinese/SpeakButton';
import { formatHanziComponentRole, formatHanziStructureType } from '@/lib/chinese/hanziAiDisplay';
import type { HanziAiPublicAnalysis } from '@/services/chinese/hanziAi/hanziAiTypes';

const REPORT_REASONS = [
	['wrong_pinyin', 'Sai cách đọc (pinyin)'],
	['wrong_han_viet', 'Sai âm Hán Việt'],
	['wrong_meaning', 'Sai nghĩa tiếng Việt'],
	['wrong_radical', 'Sai bộ thủ'],
	['wrong_components', 'Sai thành phần chữ'],
	['unnatural_mnemonic', 'Mẹo nhớ khó hiểu'],
	['unnatural_example', 'Ví dụ chưa tự nhiên'],
	['other', 'Lỗi khác'],
] as const;

export default function HanziAiResultPanel({ value }: { value: HanziAiPublicAnalysis }) {
	const result = value.analysis;
	const [reporting, setReporting] = useState(false);
	const [reason, setReason] = useState('wrong_meaning');
	const [note, setNote] = useState('');
	const [message, setMessage] = useState<string | null>(null);

	if (!result) return null;

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
			<section className="card-paper p-6 text-center">
				<div className="flex items-start justify-center gap-3">
					<h2 className="hanzi-display text-5xl font-black">{result.term}</h2>
					<SpeakButton text={result.term} iconOnly />
				</div>
				<p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Cách đọc (pinyin)</p>
				<p className="text-lg font-bold text-accent">{result.pinyin}</p>
				{result.hanViet && (
					<>
						<p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">Âm Hán Việt</p>
						<p className="text-sm font-bold uppercase text-muted">{result.hanViet}</p>
					</>
				)}
				<p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">Nghĩa chính</p>
				<p className="mx-auto max-w-2xl text-lg font-extrabold">{result.primaryMeaningVi}</p>
				{result.otherMeaningsVi.length > 0 && (
					<>
						<p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">Nghĩa khác</p>
						<p className="text-sm text-foreground-secondary">{result.otherMeaningsVi.join(' · ')}</p>
					</>
				)}
				{result.wordClasses.length > 0 && (
					<p className="mt-3 text-sm text-foreground-secondary">
						<span className="font-bold">Loại từ:</span> {result.wordClasses.join(' · ')}
					</p>
				)}
				{result.usageNoteVi && (
					<p className="mx-auto mt-3 max-w-2xl rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground-secondary">
						<span className="font-bold">Cách dùng:</span> {result.usageNoteVi}
					</p>
				)}
				<p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground-secondary">{result.overallExplanationVi}</p>
				{result.overallMnemonicVi && (
					<div className="mx-auto mt-5 max-w-2xl rounded-lg border border-border bg-background p-4 text-left">
						<p className="label-caps">Mẹo nhớ cả từ</p>
						<p className="mt-2 text-sm">{result.overallMnemonicVi}</p>
					</div>
				)}
			</section>

			<section>
				<h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
					<MaterialIcon name="account_tree" size={20} /> Từng chữ trong từ
				</h3>
				<p className="mb-3 text-sm text-foreground-secondary">
					Mỗi chữ được giải thích riêng: cách đọc, nghĩa, bộ thủ và các phần ghép lại với nhau.
				</p>
				<div className="grid gap-4 md:grid-cols-2">
					{result.characters.map((char) => (
						<article key={`${char.position}-${char.char}`} className="card-paper p-5">
							<div className="flex items-start justify-between">
								<div>
									<p className="hanzi-display text-4xl font-black">{char.char}</p>
									<p className="mt-1 text-xs text-muted">Cách đọc</p>
									<p className="font-bold text-accent">{char.pinyin}</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-muted">Âm Hán Việt</p>
									<p className="text-xs font-bold uppercase text-muted">{char.hanViet}</p>
								</div>
							</div>
							<p className="mt-3 text-xs text-muted">Nghĩa của chữ này</p>
							<p className="font-bold">{char.meaningVi}</p>
							{char.radical && (
								<div className="mt-4 rounded-lg bg-accent-subtle p-3">
									<p className="label-caps">Bộ thủ chính</p>
									<p className="mt-1 text-xs text-foreground-secondary">Bộ dùng để tra chữ trong từ điển Hán.</p>
									<p className="mt-1 font-bold text-accent">{char.radical.char} · {char.radical.nameVi}</p>
									<p className="text-xs text-foreground-secondary">Nghĩa gợi ý: {char.radical.meaningVi}</p>
								</div>
							)}
							<div className="mt-4">
								<p className="label-caps">Chữ gồm những phần này</p>
								<p className="mt-1 text-xs text-foreground-secondary">
									Kiểu ghép: {formatHanziStructureType(char.structureType)}
								</p>
								<div className="mt-2 space-y-2">
									{char.components.map((component) => {
										const role = formatHanziComponentRole(component.role);
										return (
											<div key={`${component.position}-${component.char}`} className="rounded-lg border border-border p-3 text-sm">
												<div className="flex flex-wrap items-center gap-2">
													<p className="hanzi-lg text-lg font-bold">{component.char}</p>
													{component.role !== 'unknown' && (
														<span
															className="rounded-full bg-surface-dim px-2 py-0.5 text-xs font-semibold text-foreground-secondary"
															title={role.hint || undefined}
														>
															{role.label}
														</span>
													)}
													{component.isMainRadical && (
														<span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent">
															Bộ chính
														</span>
													)}
												</div>
												{role.hint && <p className="mt-1 text-xs text-muted">{role.hint}</p>}
												{component.meaningVi && (
													<p className="mt-1 text-foreground-secondary">
														<span className="font-semibold">Gợi ý nghĩa:</span> {component.meaningVi}
													</p>
												)}
												<p className="mt-1 text-foreground-secondary">{component.explanationVi}</p>
											</div>
										);
									})}
								</div>
								<p className="mt-3 text-sm text-foreground-secondary">{char.structureExplanationVi}</p>
							</div>
							{char.similarCharacters.length > 0 && (
								<div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
									<p className="label-caps">Chữ dễ nhầm</p>
									<ul className="mt-2 space-y-1">
										{char.similarCharacters.map((similar) => (
											<li key={similar.char}>
												<span className="hanzi-lg font-bold">{similar.char}</span>
												<span className="text-foreground-secondary"> — {similar.differenceVi}</span>
											</li>
										))}
									</ul>
								</div>
							)}
							{char.mnemonicVi && (
								<p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
									<span className="font-bold">Mẹo nhớ chữ này:</span> {char.mnemonicVi}
								</p>
							)}
						</article>
					))}
				</div>
			</section>

			{result.examples.length > 0 && (
				<section className="card-paper p-6">
					<h3 className="text-lg font-extrabold">Ví dụ trong câu</h3>
					<p className="mt-1 text-sm text-foreground-secondary">Cách dùng từ trong tiếng Trung thực tế.</p>
					<div className="mt-4 space-y-4">
						{result.examples.map((example, index) => (
							<div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
								<p className="hanzi-lg text-lg font-bold">{example.chinese}</p>
								<p className="text-sm text-accent">{example.pinyin}</p>
								<p className="mt-1 text-sm text-foreground-secondary">{example.meaningVi}</p>
								{example.usageNoteVi && (
									<p className="mt-1 text-xs text-muted">{example.usageNoteVi}</p>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			<p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground-secondary">
				Mẹo nhớ chỉ giúp bạn liên tưởng cho dễ nhớ — không phải lúc nào cũng đúng với nguồn gốc lịch sử của chữ.
			</p>

			<section className="text-center">
				<button type="button" className="btn-secondary" onClick={() => setReporting(!reporting)}>
					Thấy sai sót? Gửi báo lỗi
				</button>
				{reporting && (
					<div className="mx-auto mt-3 max-w-lg space-y-3 rounded-xl border border-border p-4 text-left">
						<p className="text-sm font-bold">Bạn thấy phần nào chưa đúng?</p>
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
