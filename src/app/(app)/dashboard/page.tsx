"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ForecastBars from '@/components/chinese/ForecastBars';
import StateDistributionBar from '@/components/chinese/StateDistributionBar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { channelRateQualitative } from '@/lib/chinese/channelRateLabels';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import type { CnDashboardDTO } from '@/types/chinese';

export default function ChineseDashboardPage() {
	const [dashboard, setDashboard] = useState<CnDashboardDTO | null>(null);
	const [showErrors, setShowErrors] = useState(true);

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

	const masteredCount = dashboard.stateDistribution.mastered + dashboard.stateDistribution.strong;

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
			<section className="animate-section-in">
				<span className="label-caps tracking-widest">Tiến bộ</span>
				<div className="mt-2 flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-black text-foreground sm:text-3xl">Dashboard lỗi & điểm yếu</h1>
					{dashboard.streak > 0 && (
						<span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-accent">
							{dashboard.streak} ngày liên tiếp
						</span>
					)}
				</div>
				<p className="mt-1 text-sm text-muted">Phân tích lỗi và điểm yếu — khác với báo cáo ôn hàng ngày</p>
				{dashboard.dueToday > 0 && (
					<Link href="/review" className="btn-primary mt-4 md:hidden">
						<MaterialIcon name="play_arrow" size={16} />
						Ôn {dashboard.dueToday} mục
					</Link>
				)}
			</section>

			<section className="animate-section-in space-y-4">
				<div>
					<h2 className="text-lg font-black text-foreground">Phạm vi học</h2>
					<div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
						<CompactStat label="Tổng bộ" value={dashboard.setCount} />
						<CompactStat label="Đã học" value={dashboard.wordsLearned} />
						<CompactStat label="Thành thạo" value={dashboard.wordsMastered} color="success" />
					</div>
				</div>
				<div>
					<h2 className="text-lg font-black text-foreground">Chất lượng</h2>
					<div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
						<CompactStat
							label="Đến hạn"
							value={dashboard.dueToday}
							sub={dashboard.overdueCount > 0 ? `${dashboard.overdueCount} trễ` : undefined}
							color="accent"
						/>
						<CompactStat label="Điểm yếu" value={dashboard.weakCount} color="warning" />
						<CompactStat label="Tỷ lệ đúng" value={`${dashboard.overallRate}%`} />
					</div>
				</div>
			</section>

			{dashboard.topErrors.length > 0 && (
				<section className="animate-section-in">
					<button
						type="button"
						onClick={() => setShowErrors(!showErrors)}
						className="flex items-center gap-2 text-lg font-black text-foreground md:pointer-events-none"
					>
						<MaterialIcon name="error" className="text-accent" size={22} />
						Lỗi phổ biến
						<MaterialIcon name={showErrors ? 'expand_less' : 'expand_more'} size={20} className="text-muted md:hidden" />
					</button>
					<ul className={`card-paper mt-3 divide-y divide-border ${showErrors ? 'block' : 'hidden md:block'}`}>
						{dashboard.topErrors.map((e) => (
							<li key={e.errorType} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
								<span className="font-medium text-foreground">{errorTypeLabel(e.errorType)}</span>
								<span className="shrink-0 rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-bold text-accent">
									{e.count} lần
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			<section className="animate-section-in card-paper p-4">
				<h2 className="text-lg font-black text-foreground">Tỷ lệ chính xác theo kênh</h2>
				<div className="mt-4 flex flex-col gap-4">
					<ChannelSkill label="Nghĩa" rate={dashboard.meaningRate} />
					<ChannelSkill label="Nghe" rate={dashboard.listeningRate} />
					<ChannelSkill label="Pinyin" rate={dashboard.pinyinRate} />
				</div>
			</section>

			{dashboard.weakWords.length > 0 && (
				<section className="animate-section-in">
					<h2 className="text-lg font-black text-foreground">Từ cần chú ý ngay</h2>
					<div className="mt-3 flex flex-wrap gap-2">
						{dashboard.weakWords.map((w) => (
							<Link
								key={w.wordId}
								href={`/words/${w.wordId}`}
								className="rounded-full border border-accent/40 bg-background px-4 py-2 text-sm font-bold text-accent transition-colors hover:bg-accent-subtle active:scale-95"
							>
								{w.simplified}
							</Link>
						))}
					</div>
				</section>
			)}

			{dashboard.forecast.some((d) => d.dueCount > 0) && (
				<section className="animate-section-in hidden md:block">
					<h2 className="label-caps">Lịch ôn sắp tới</h2>
					<p className="mt-1 text-xs text-muted">Dự báo 7 ngày · 1 mục = 1 từ × 1 kênh</p>
					<div className="mt-3">
						<ForecastBars days={dashboard.forecast} />
					</div>
				</section>
			)}

			{dashboard.stateDistribution.total > 0 && (
				<section className="animate-section-in hidden md:block">
					<h2 className="label-caps">Phân bổ trình độ từ</h2>
					<div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
						<span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1">
							<span className="font-bold text-success">{masteredCount}</span> thành thạo
						</span>
						<span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1">
							<span className="font-bold text-accent">
								{dashboard.stateDistribution.learning + dashboard.stateDistribution.familiar}
							</span>{' '}
							đang học
						</span>
						<span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1">
							<span className="font-bold text-warning">{dashboard.stateDistribution.weak}</span> yếu
						</span>
					</div>
					<div className="mt-3">
						<StateDistributionBar
							distribution={dashboard.stateDistribution}
							maturePct={dashboard.maturePct}
							simplifiedLegend
						/>
					</div>
				</section>
			)}

			<section className="animate-section-in flex items-start gap-4 rounded-xl border border-border bg-surface-container p-4">
				<MaterialIcon name="lightbulb" className="shrink-0 text-accent" size={32} />
				<div>
					<h2 className="text-lg font-black text-foreground">Gợi ý học tập</h2>
					<ul className="mt-2 space-y-2 text-sm text-foreground-secondary">
						{dashboard.suggestions.map((s, i) => <li key={i}>{s}</li>)}
					</ul>
				</div>
			</section>
		</div>
	);
}

function CompactStat({ label, value, sub, color = 'foreground' }: {
	label: string;
	value: string | number;
	sub?: string;
	color?: 'foreground' | 'accent' | 'success' | 'warning';
}) {
	const colorClass = {
		foreground: 'text-foreground',
		accent: 'text-accent',
		success: 'text-success',
		warning: 'text-warning',
	}[color];

	return (
		<div className="card-paper flex flex-col items-center justify-center p-3 text-center sm:p-4">
			<p className={`text-xl font-black sm:text-2xl ${colorClass}`}>{value}</p>
			<p className="mt-1 text-xs text-muted">{label}</p>
			{sub && <p className="mt-0.5 text-[10px] font-bold text-warning">{sub}</p>}
		</div>
	);
}

function ChannelSkill({ label, rate }: { label: string; rate: number }) {
	const qual = channelRateQualitative(rate);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-sm">
				<span>{label}</span>
				<span className={`label-caps ${qual.className}`}>{rate > 0 ? `${rate}%` : '—'}</span>
			</div>
			<ProgressBar value={rate} className="h-2" barClassName={qual.barClassName} />
		</div>
	);
}
