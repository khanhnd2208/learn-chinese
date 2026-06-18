"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import type { CnDashboardDTO } from '@/types/chinese';

export default function ChineseDashboardPage() {
	const [dashboard, setDashboard] = useState<CnDashboardDTO | null>(null);
	const [showErrors, setShowErrors] = useState(false);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/dashboard');
			const json = await res.json() as { ok: boolean; data?: { dashboard: CnDashboardDTO } };
			if (json.ok) setDashboard(json.data?.dashboard ?? null);
		})();
	}, []);

	if (!dashboard) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted">
				Đang tải...
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<span className="label-caps tracking-widest">Tiến bộ</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Dashboard lỗi & tiến bộ</h1>
				{dashboard.dueToday > 0 && (
					<Link href="/review" className="btn-primary mt-4 md:hidden">
						<MaterialIcon name="play_arrow" size={16} />
						Ôn {dashboard.dueToday} mục
					</Link>
				)}
			</section>

			<section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Stat label="Bộ từ đang học" value={dashboard.setCount} icon="folder" />
				<Stat label="Từ đã học" value={dashboard.wordsLearned} icon="menu_book" />
				<Stat label="Đã nhớ chắc" value={dashboard.wordsMastered} icon="military_tech" color="gold" />
				<Stat label="Từ yếu" value={dashboard.weakCount} icon="psychology_alt" color="warning" />
				<Stat label="Cần ôn hôm nay" value={dashboard.dueToday} icon="calendar_today" color="accent" />
				<Stat label="Tỷ lệ đúng tổng" value={`${dashboard.overallRate}%`} icon="check_circle" color="success" />
			</section>

			<section>
				<h2 className="label-caps">Tỷ lệ theo kênh</h2>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<ChannelRate label="Nghĩa" rate={dashboard.meaningRate} />
					<ChannelRate label="Nghe" rate={dashboard.listeningRate} barClassName="bg-success" />
					<ChannelRate label="Pinyin" rate={dashboard.pinyinRate} />
					<ChannelRate label="Dùng câu" rate={dashboard.sentenceRate} />
					<ChannelRate label="Chữ Hán" rate={dashboard.charRate} />
				</div>
			</section>

			{dashboard.topErrors.length > 0 && (
				<section>
					<button
						type="button"
						onClick={() => setShowErrors(!showErrors)}
						className="label-caps flex items-center gap-1 md:pointer-events-none"
					>
						Lỗi phổ biến
						<MaterialIcon name={showErrors ? 'expand_less' : 'expand_more'} size={16} className="md:hidden" />
					</button>
					<ul className={`mt-3 space-y-2 ${showErrors ? 'block' : 'hidden md:block'}`}>
						{dashboard.topErrors.map((e) => (
							<li key={e.errorType} className="card-paper flex justify-between px-4 py-3 text-sm">
								<span>{errorTypeLabel(e.errorType)}</span>
								<span className="font-bold text-accent">{e.count}</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{dashboard.weakWords.length > 0 && (
				<section>
					<h2 className="label-caps">Từ yếu</h2>
					<div className="mt-3 flex flex-wrap gap-2">
						{dashboard.weakWords.map((w) => (
							<Link
								key={w.wordId}
								href={`/words/${w.wordId}`}
								className="rounded-full border border-accent/30 bg-accent-subtle px-3 py-1 text-sm font-bold text-accent transition-colors hover:border-accent"
							>
								{w.simplified}
							</Link>
						))}
					</div>
				</section>
			)}

			<section className="card-paper p-4">
				<h2 className="label-caps">Đề xuất</h2>
				<ul className="mt-3 space-y-2 text-sm text-foreground-secondary">
					{dashboard.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
				</ul>
			</section>
		</div>
	);
}

function Stat({ label, value, icon, color = 'foreground' }: {
	label: string;
	value: string | number;
	icon: string;
	color?: 'foreground' | 'accent' | 'success' | 'warning' | 'gold';
}) {
	const colorClass = {
		foreground: 'text-foreground',
		accent: 'text-accent',
		success: 'text-success',
		warning: 'text-warning',
		gold: 'text-gold',
	}[color];

	return (
		<div className="card-paper p-4">
			<div className="mb-2 flex items-start justify-between">
				<MaterialIcon name={icon} className="text-accent" size={20} />
			</div>
			<p className="label-caps">{label}</p>
			<p className={`mt-2 text-3xl font-black ${colorClass}`}>{value}</p>
		</div>
	);
}

function ChannelRate({ label, rate, barClassName = 'bg-accent' }: { label: string; rate: number; barClassName?: string }) {
	return (
		<div className="card-paper px-4 py-3">
			<div className="flex justify-between text-sm">
				<span>{label}</span>
				<span className="font-bold">{rate}%</span>
			</div>
			<ProgressBar value={rate} className="mt-2" barClassName={barClassName} />
		</div>
	);
}
