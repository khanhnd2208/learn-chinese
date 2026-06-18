"use client";

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SpeakButton from '@/components/chinese/SpeakButton';
import type { HanziAiPublicAnalysis } from '@/services/chinese/hanziAi/hanziAiTypes';

const REPORT_REASONS = [
	['wrong_pinyin', 'Sai pinyin'], ['wrong_han_viet', 'Sai âm Hán Việt'],
	['wrong_meaning', 'Sai nghĩa'], ['wrong_radical', 'Sai bộ thủ'],
	['wrong_components', 'Sai thành phần'], ['unnatural_mnemonic', 'Mẹo nhớ chưa tự nhiên'],
	['unnatural_example', 'Ví dụ chưa tự nhiên'], ['other', 'Khác'],
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
			<p className="mt-3 text-lg font-bold text-accent">{result.pinyin}</p>
			{result.hanViet && <p className="text-sm font-bold uppercase text-muted">{result.hanViet}</p>}
			<p className="mx-auto mt-4 max-w-2xl text-lg font-extrabold">{result.primaryMeaningVi}</p>
			{result.otherMeaningsVi.length > 0 && <p className="mt-1 text-sm text-foreground-secondary">{result.otherMeaningsVi.join(' · ')}</p>}
			<p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground-secondary">{result.overallExplanationVi}</p>
			{result.overallMnemonicVi && (
				<div className="mx-auto mt-5 max-w-2xl rounded-lg border border-border bg-background p-4 text-left">
					<p className="label-caps">Mẹo nhớ toàn từ</p>
					<p className="mt-2 text-sm">{result.overallMnemonicVi}</p>
				</div>
				)}
		</section>

		<section>
			<h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><MaterialIcon name="account_tree" size={20} /> Phân tích từng chữ</h3>
			<div className="grid gap-4 md:grid-cols-2">
				{result.characters.map((char) => (
					<article key={`${char.position}-${char.char}`} className="card-paper p-5">
						<div className="flex items-start justify-between">
							<div><p className="hanzi-display text-4xl font-black">{char.char}</p><p className="font-bold text-accent">{char.pinyin}</p></div>
							<p className="text-xs font-bold uppercase text-muted">{char.hanViet}</p>
						</div>
						<p className="mt-3 font-bold">{char.meaningVi}</p>
						{char.radical && (
							<div className="mt-4 rounded-lg bg-accent-subtle p-3">
								<p className="label-caps">Bộ thủ chính</p>
								<p className="mt-1 font-bold text-accent">{char.radical.char} · {char.radical.nameVi}</p>
								<p className="text-xs text-foreground-secondary">{char.radical.meaningVi}</p>
							</div>
						)}
						<div className="mt-4">
							<p className="label-caps">Cấu tạo</p>
							<div className="mt-2 space-y-2">
								{char.components.map((component) => (
									<div key={`${component.position}-${component.char}`} className="rounded-lg border border-border p-3 text-sm">
										<p className="font-bold">{component.char} <span className="text-xs font-normal text-muted">· {component.role}</span></p>
										<p className="text-foreground-secondary">{component.explanationVi}</p>
									</div>
								))}
							</div>
							<p className="mt-3 text-sm text-foreground-secondary">{char.structureExplanationVi}</p>
						</div>
						{char.mnemonicVi && <p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm"><strong>Mẹo nhớ:</strong> {char.mnemonicVi}</p>}
					</article>
				))}
			</div>
		</section>

		{result.examples.length > 0 && (
			<section className="card-paper p-6">
				<h3 className="text-lg font-extrabold">Ví dụ sử dụng</h3>
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

		<p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground-secondary">
			Mẹo liên tưởng hỗ trợ ghi nhớ, không nhất thiết phản ánh nguồn gốc lịch sử của chữ.
		</p>

		<section className="text-center">
			<button type="button" className="btn-secondary" onClick={() => setReporting(!reporting)}>Phân tích này chưa chính xác? Báo lỗi</button>
			{reporting && (
				<div className="mx-auto mt-3 max-w-lg space-y-3 rounded-xl border border-border p-4 text-left">
					<select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-sm">
						{REPORT_REASONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
					</select>
					<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Ghi chú thêm (không bắt buộc)" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
					<button type="button" onClick={() => void submitReport()} className="btn-primary">Gửi báo lỗi</button>
				</div>
			)}
			{message && <p className="mt-2 text-sm text-muted">{message}</p>}
		</section>
	</div>
);
}
