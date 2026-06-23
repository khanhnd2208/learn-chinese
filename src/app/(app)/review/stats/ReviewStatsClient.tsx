'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ActivityHeatmap from '@/components/chinese/ActivityHeatmap';
import ForecastBars from '@/components/chinese/ForecastBars';
import StateDistributionBar from '@/components/chinese/StateDistributionBar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { channelRateQualitative } from '@/lib/chinese/channelRateLabels';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import type { CnReviewStatsDTO } from '@/types/chinese';

function formatSessionTime(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = d.toDateString() === yesterday.toDateString();

	const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
	if (isToday) return `Hôm nay ${time}`;
	if (isYesterday) return `Hôm qua ${time}`;
	return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ReviewStatsClient() {
	const [stats, setStats] = useState<CnReviewStatsDTO | null>(null);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/review/stats');
			const json = await res.json() as { ok: boolean; data?: { stats: CnReviewStatsDTO } };
			if (json.ok) setStats(json.data?.stats ?? null);
		})();
	}, []);

	if (!stats) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted">
				Đang tải tiến độ...
			</div>
		);
	}

	const todayProgress = stats.dueTotal + stats.reviewedToday > 0
		? Math.min(100, Math.round((stats.reviewedToday / (stats.dueTotal + stats.reviewedToday)) * 100))
		: stats.reviewedToday > 0 ? 100 : 0;

	const showMomentum = stats.dailySeries.some((d) => d.reviewed > 0);

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
			<section className="animate-section-in">
				<span className="label-caps tracking-widest">SRS</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Trạng thái học</h1>
				<p className="mt-1 text-sm text-muted">
					Báo cáo ôn tập · 1 mục = 1 từ × 1 kênh kỹ năng
				</p>

				{stats.insights.length > 0 && (
					<div className="mt-4 space-y-2">
						{stats.insights.map((insight) => (
							<p key={insight} className="rounded-lg border border-accent/20 bg-accent-subtle px-4 py-2 text-sm text-foreground-secondary">
								{insight}
							</p>
						))}
					</div>
				)}
			</section>

			<section className="card-paper animate-section-in flex flex-wrap items-center justify-between gap-4 p-4">
				<Link href="/review" className="btn-primary px-6 py-3">
					<MaterialIcon name="play_arrow" size={18} filled />
					Ôn ngay
				</Link>
				<div className="flex items-center gap-4">
					<div className="text-right">
						<p className="text-3xl font-black text-accent">{stats.dueTotal}</p>
						<p className="label-caps !text-[10px]">Mục cần ôn</p>
						{stats.overdueCount > 0 && (
							<p className="mt-0.5 text-xs font-bold text-warning">{stats.overdueCount} trễ</p>
						)}
					</div>
					{stats.streak > 0 && (
						<>
							<div className="h-8 w-px bg-border" />
							<div className="flex flex-col items-center">
								<MaterialIcon name="local_fire_department" className="text-warning" size={24} filled />
								<span className="text-sm font-black text-foreground">{stats.streak}</span>
							</div>
						</>
					)}
				</div>
			</section>

			{!stats.hasActiveWords && (
				<section className="card-paper animate-section-in p-6 text-center">
					<MaterialIcon name="menu_book" className="mx-auto text-accent" size={40} />
					<p className="mt-3 font-bold text-foreground">Bắt đầu theo dõi tiến độ</p>
					<p className="mt-1 text-sm text-muted">
						Bật <strong>Ôn SRS</strong> trên một bộ từ để đưa từ vào hàng đợi ôn.
					</p>
					<Link href="/sets" className="btn-secondary mt-4 inline-flex">
						Chọn bộ từ
					</Link>
				</section>
			)}

			<section className="animate-section-in card-paper p-4">
				<div className="flex items-end justify-between">
					<h2 className="text-lg font-black text-foreground">Hôm nay</h2>
					<span className="text-sm text-muted">{todayProgress}% hoàn thành</span>
				</div>
				<ProgressBar value={todayProgress} className="mt-3 h-2" barClassName="bg-accent" />
				<p className="mt-2 text-xs text-muted">
					{stats.reviewedToday} đã ôn
					{stats.dueTotal > 0 && ` · ~${stats.dueTotal} còn lại`}
					{' · '}Mục tiêu nhẹ — không bắt buộc hoàn thành hết
				</p>
			</section>

			<section className="animate-section-in grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard
					label="Cần ôn"
					value={stats.dueTotal}
					sub={stats.overdueCount > 0 ? `${stats.overdueCount} trễ` : undefined}
					color="accent"
				/>
				<StatCard label="Đã ôn hôm nay" value={stats.reviewedToday} color="success" />
				<StatCard label="Đúng hôm nay" value={`${stats.accuracyToday}%`} color="foreground" />
				<StatCard label="Cần chú ý" value={stats.weakCount} color="warning" />
			</section>

			{stats.hasActiveWords && (
				<section className="animate-section-in">
					<h2 className="text-lg font-black text-foreground">Dự kiến 7 ngày</h2>
					<p className="mt-1 text-xs text-muted">Số mục đến hạn mỗi ngày · vàng = đang trễ</p>
					<div className="mt-3">
						<ForecastBars days={stats.forecast} />
					</div>
				</section>
			)}

			{showMomentum && (
				<section className="animate-section-in">
					<h2 className="label-caps">Đà học</h2>
					<div className="mt-3 grid gap-4 sm:grid-cols-3">
						<div className="card-paper p-4">
							<p className="label-caps">Streak</p>
							<p className="mt-1 text-3xl font-black text-accent">{stats.streak}</p>
							<p className="mt-1 text-xs text-muted">Kỷ lục: {stats.bestStreak} ngày</p>
						</div>
						<div className="card-paper p-4">
							<p className="label-caps">TB 7 ngày</p>
							<p className="mt-1 text-3xl font-black text-foreground">{stats.avgPerDay7}</p>
							<p className="mt-1 text-xs text-muted">mục/ngày</p>
						</div>
						<div className="card-paper p-4">
							<p className="label-caps">TB 30 ngày</p>
							<p className="mt-1 text-3xl font-black text-foreground">{stats.avgPerDay30}</p>
							<p className="mt-1 text-xs text-muted">mục/ngày</p>
						</div>
					</div>
					<div className="mt-4">
						<ActivityHeatmap series={stats.dailySeries} />
					</div>
				</section>
			)}

			{stats.hasActiveWords && (
				<section className="animate-section-in">
					<h2 className="text-lg font-black text-foreground">Sức khỏe trí nhớ</h2>
					<div className="mt-3">
						<StateDistributionBar distribution={stats.stateDistribution} maturePct={stats.maturePct} simplifiedLegend />
					</div>
				</section>
			)}

			<section className="animate-section-in card-paper p-4">
				<h2 className="text-lg font-black text-foreground">Kỹ năng</h2>
				<div className="mt-4 flex flex-col gap-4">
					<ChannelSkill label="Nghĩa" rate={stats.meaningRate} />
					<ChannelSkill label="Nghe" rate={stats.listeningRate} />
					<ChannelSkill label="Pinyin" rate={stats.pinyinRate} />
				</div>
				{(stats.recallTotal > 0 || stats.mcqTotal > 0) && (
					<div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
						<div className="rounded-lg border border-border bg-background px-4 py-3">
							<div className="flex justify-between text-sm">
								<span>Nhớ thật (gõ lại)</span>
								<span className="font-bold">{stats.recallAccuracy}%</span>
							</div>
							<p className="mt-1 text-xs text-muted">{stats.recallTotal} câu hôm nay</p>
						</div>
						<div className="rounded-lg border border-border bg-background px-4 py-3">
							<div className="flex justify-between text-sm">
								<span>Trắc nghiệm</span>
								<span className="font-bold">{stats.mcqAccuracy}%</span>
							</div>
							<p className="mt-1 text-xs text-muted">{stats.mcqTotal} câu hôm nay</p>
						</div>
					</div>
				)}
			</section>

			{(stats.weakWords.length > 0 || stats.topErrors.length > 0) && (
				<section className="animate-section-in grid gap-6 md:grid-cols-2">
					{stats.weakWords.length > 0 && (
						<div>
							<h2 className="label-caps">Cần chú ý</h2>
							<div className="mt-3 flex flex-wrap gap-2">
								{stats.weakWords.map((w) => (
									<Link
										key={w.wordId}
										href={`/words/${w.wordId}`}
										className="rounded-full border border-accent/30 bg-accent-subtle px-3 py-1 text-sm font-bold text-accent transition-colors hover:border-accent"
									>
										{w.simplified}
									</Link>
								))}
							</div>
						</div>
					)}
					{stats.topErrors.length > 0 && (
						<div>
							<h2 className="label-caps">Lỗi phổ biến</h2>
							<ul className="mt-3 space-y-2">
								{stats.topErrors.map((e) => (
									<li key={e.errorType} className="card-paper flex justify-between px-4 py-2 text-sm">
										<span>{errorTypeLabel(e.errorType)}</span>
										<span className="font-bold">{e.count}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</section>
			)}

			<section className="animate-section-in">
				<h2 className="label-caps">Phiên gần đây</h2>
				{stats.recentSessions.length === 0 ? (
					<p className="mt-3 text-sm text-muted">Chưa có phiên ôn nào trong 7 ngày qua.</p>
				) : (
					<ul className="mt-3 space-y-2">
						{stats.recentSessions.map((s, i) => (
							<li key={`${s.startedAt}-${i}`} className="card-paper flex items-center justify-between gap-3 px-4 py-3 text-sm">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-accent">
										<MaterialIcon name="history" size={20} />
									</div>
									<div>
										<p className="font-bold text-foreground">Ôn tập tổng hợp</p>
										<p className="text-xs text-muted">{formatSessionTime(s.startedAt)}</p>
									</div>
								</div>
								<span className="label-caps shrink-0">
									{s.itemCount} câu · {s.accuracy}%
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function StatCard({ label, value, sub, color = 'foreground' }: {
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
		<div className="card-paper p-4">
			<p className="label-caps !text-[10px]">{label}</p>
			<p className={`mt-1 text-2xl font-black sm:text-3xl ${colorClass}`}>{value}</p>
			{sub && <p className="mt-0.5 text-xs font-bold text-warning">{sub}</p>}
		</div>
	);
}

function ChannelSkill({ label, rate }: { label: string; rate: number }) {
	const qual = channelRateQualitative(rate);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-sm">
				<span>{label}</span>
				<span className={`label-caps ${qual.className}`}>{qual.label}</span>
			</div>
			<ProgressBar value={rate} className="h-1.5" barClassName={qual.barClassName} />
		</div>
	);
}
