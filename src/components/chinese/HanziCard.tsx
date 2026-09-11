"use client";

import { useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SpeakButton from '@/components/chinese/SpeakButton';
import CharBreakdown from '@/components/chinese/CharBreakdown';
import ChannelMasteryPanel from '@/components/chinese/ChannelMasteryPanel';
import PracticeModePicker from '@/components/chinese/PracticeModePicker';
import type { CnWordCardDTO } from '@/types/chinese';

interface Props {
	word: CnWordCardDTO;
	setId?: string;
}

const TABS = ['Tổng quan', 'Ví dụ', 'Cấu tạo chữ', 'Cách dùng', 'Luyện tập'] as const;

export default function HanziCard({ word, setId }: Props) {
	const [tab, setTab] = useState<(typeof TABS)[number]>(setId ? 'Luyện tập' : 'Tổng quan');

	const practiceHref = (mode: string) => {
		const params = new URLSearchParams({ mode });
		if (setId) params.set('word', word.id);
		return `/practice/${setId}?${params}`;
	};

	return (
		<div className="card-paper overflow-hidden">
			<div className="relative p-6 text-center">
				<h2 className="hanzi-display text-5xl font-black text-foreground">{word.simplified}</h2>
				<div className="mt-3 flex items-center justify-center gap-4">
					<span className="text-lg font-bold text-accent">{word.pinyin}</span>
					<SpeakButton
						text={word.simplified}
						className="!rounded-full !border-accent/20 !bg-accent-subtle !px-0 !py-0 !text-accent hover:!bg-accent hover:!text-accent-foreground"
						iconOnly
					/>
				</div>
				<div className="mx-auto mt-4 max-w-sm border-t border-border/50 pt-3">
					{word.hanViet && (
						<p className="text-sm text-foreground-secondary">
							<span className="mr-2 text-xs font-bold uppercase tracking-wider text-muted">Hán Việt</span>
							{word.hanViet}
						</p>
					)}
					<p className="mt-1 text-lg font-extrabold text-foreground">{word.meaningVi}</p>
					{word.partOfSpeech && (
						<p className="mt-1 label-caps">{word.partOfSpeech}</p>
					)}
				</div>
			</div>

			<nav className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 snap-x">
				{TABS.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={`snap-start whitespace-nowrap rounded-full px-4 py-2 label-caps transition-colors ${
							tab === t
								? 'border border-accent bg-accent text-accent-foreground shadow-sm'
								: 'border border-border bg-transparent text-foreground-secondary hover:border-accent hover:text-accent'
						}`}
					>
						{t}
					</button>
				))}
			</nav>

			<div className="p-6">
				{tab === 'Tổng quan' && (
					<div className="space-y-4">
						<ChannelMasteryPanel word={word} />
						{word.mnemonicVi && (
							<article className="rounded-lg border border-border bg-surface p-4">
								<h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-foreground">
									<MaterialIcon name="lightbulb" className="text-accent" size={20} />
									Gợi ý nhớ (Mnemonic)
								</h3>
								<p className="text-sm leading-relaxed text-foreground-secondary">{word.mnemonicVi}</p>
							</article>
						)}
						{word.usageNoteVi && (
							<article className="rounded-lg border border-border bg-surface p-4">
								<h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold text-foreground">
									<MaterialIcon name="info" className="text-accent" size={20} />
									Ghi chú cách dùng
								</h3>
								<p className="text-sm leading-relaxed text-foreground-secondary">{word.usageNoteVi}</p>
							</article>
						)}
						{word.relatedWords.length > 0 && (
							<div>
								<h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold text-foreground">
									<MaterialIcon name="hub" className="text-accent" size={20} />
									Từ vựng liên quan
								</h3>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{word.relatedWords.map((rw) => (
										<Link
											key={rw.id}
											href={`/words/${rw.id}`}
											className="flex items-center justify-between rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent group"
										>
											<div>
												<p className="hanzi-lg text-2xl font-bold text-foreground group-hover:text-accent">{rw.simplified}</p>
												<p className="text-sm text-muted">{rw.pinyin}</p>
											</div>
											<MaterialIcon name="chevron_right" className="text-muted group-hover:text-accent" size={20} />
										</Link>
									))}
								</div>
							</div>
						)}
							<div className="flex flex-wrap gap-2 pt-2">
								{setId && (
								<Link href={practiceHref('smart_mixed')} className="btn-primary">
									Luyện từ này
								</Link>
							)}
						</div>
					</div>
				)}

				{tab === 'Ví dụ' && (
					<div className="space-y-4">
						{word.examples.length ? word.examples.map((ex) => (
							<div key={ex.id} className="rounded-lg border border-border p-4">
								<p className="hanzi-lg text-xl font-bold text-foreground">
									{ex.hanzi.split(word.simplified).map((part, i, arr) => (
										<span key={i}>
											{part}
											{i < arr.length - 1 && <mark className="bg-accent-subtle px-1">{word.simplified}</mark>}
										</span>
									))}
								</p>
								<p className="mt-1 text-sm text-muted">{ex.pinyin}</p>
								<p className="mt-2 text-sm text-foreground-secondary">{ex.meaningVi}</p>
								<div className="mt-2"><SpeakButton text={ex.pinyin || ex.hanzi} label="Nghe câu" /></div>
							</div>
						)) : <p className="text-sm text-muted">Chưa có ví dụ trong database.</p>}
					</div>
				)}

				{tab === 'Cấu tạo chữ' && <CharBreakdown chars={word.chars} />}

				{tab === 'Cách dùng' && (
					<div className="space-y-4">
						{word.patterns.length ? word.patterns.map((p) => (
							<div key={p.id} className="rounded-lg border border-border p-4">
								<p className="font-bold text-foreground">Mẫu: {p.template}</p>
								<ul className="mt-3 space-y-2">
									{p.samples.map((s, i) => (
										<li key={i} className="text-sm">
											<p className="font-bold">{s.hanzi}</p>
											<p className="text-muted">{s.pinyin}</p>
											<p className="text-foreground-secondary">{s.meaningVi}</p>
										</li>
									))}
								</ul>
							</div>
						)) : <p className="text-sm text-muted">Chưa có mẫu câu trong database.</p>}
					</div>
				)}

				{tab === 'Luyện tập' && (
					<div className="space-y-3">
						{setId ? (
							<PracticeModePicker setId={setId} wordId={word.id} />
						) : (
							<p className="text-xs text-muted">Thêm từ vào bộ từ để luyện tập.</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
