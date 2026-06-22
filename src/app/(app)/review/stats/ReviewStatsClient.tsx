'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ActivityHeatmap from '@/components/chinese/ActivityHeatmap';
import ForecastBars from '@/components/chinese/ForecastBars';
import StateDistributionBar from '@/components/chinese/StateDistributionBar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
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
			<section>
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

				<div className="mt-4 flex flex-wrap items-center gap-3">
					<Link href="/review" className="btn-primary">
						<MaterialIcon name="play_arrow" size={16} />
						Ôn ngay
					</Link>
					{stats.dueTotal > 0 ? (
						<span className="text-sm text-muted">
							Còn ~{stats.dueTotal} mục
							{stats.overdueCount > 0 && (
								<span className="font-bold text-warning"> · {stats.overdueCount} đang trễ</span>
							)}
						</span>
					) : stats.nextDueLabel ? (
						<span className="text-sm text-success">{stats.nextDueLabel}</span>
					) : (
						<span className="text-sm text-success">Đã xong hôm nay</span>
					)}
					{stats.streak > 0 && (
						<span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-accent">
							{stats.streak} ngày liên tiếp
						</span>
					)}
				</div>
			</section>

			{!stats.hasActiveWords && (
				<section className="card-paper p-6 text-center">
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

			<section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard
					label="Cần ôn"
					value={stats.dueTotal}
					sub={stats.overdueCount > 0 ? `${stats.overdueCount} trễ` : undefined}
					icon="calendar_today"
					color="accent"
				/>
				<StatCard label="Đã ôn hôm nay" value={stats.reviewedToday} icon="done_all" color="success" />
				<StatCard label="Đúng hôm nay" value={`${stats.accuracyToday}%`} icon="check_circle" color="foreground" />
				<StatCard label="Cần chú ý" value={stats.weakCount} icon="psychology_alt" color="warning" />
			</section>

			<section className="card-paper p-4">
				<div className="flex justify-between text-sm">
					<span className="label-caps">Hôm nay</span>
					<span className="font-bold text-accent">
						{stats.reviewedToday} đã ôn
						{stats.dueTotal > 0 && ` · ~${stats.dueTotal} còn lại`}
					</span>
				</div>
				<ProgressBar value={todayProgress} className="mt-3" barClassName="bg-accent" />
				<p className="mt-2 text-xs text-muted">Mục tiêu nhẹ — không bắt buộc hoàn thành hết</p>
			</section>

			{stats.hasActiveWords && (
				<section>
					<h2 className="label-caps">Dự báo 7 ngày</h2>
					<p className="mt-1 text-xs text-muted">Số mục đến hạn mỗi ngày · vàng = đang trễ</p>
					<div className="mt-3">
						<ForecastBars days={stats.forecast} />
					</div>
				</section>
			)}

			{showMomentum && (
				<section>
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
				<section>
					<h2 className="label-caps">Sức khỏe trí nhớ</h2>
					<div className="mt-3">
						<StateDistributionBar distribution={stats.stateDistribution} maturePct={stats.maturePct} />
					</div>
				</section>
			)}

			<section>
				<h2 className="label-caps">Tỷ lệ theo kênh</h2>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<ChannelRate label="Nghĩa" rate={stats.meaningRate} />
					<ChannelRate label="Nghe" rate={stats.listeningRate} barClassName="bg-success" />
					<ChannelRate label="Pinyin" rate={stats.pinyinRate} />
					<ChannelRate label="Dùng câu" rate={stats.sentenceRate} />
				</div>
				{(stats.recallTotal > 0 || stats.mcqTotal > 0) && (
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						<div className="card-paper px-4 py-3">
							<div className="flex justify-between text-sm">
								<span>Nhớ thật (gõ lại)</span>
								<span className="font-bold">{stats.recallAccuracy}%</span>
							</div>
							<p className="mt-1 text-xs text-muted">{stats.recallTotal} câu hôm nay</p>
						</div>
						<div className="card-paper px-4 py-3">
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
				<section className="grid gap-6 md:grid-cols-2">
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

			<section>
				<h2 className="label-caps">Phiên gần đây</h2>
				{stats.recentSessions.length === 0 ? (
					<p className="mt-3 text-sm text-muted">Chưa có phiên ôn nào trong 7 ngày qua.</p>
				) : (
					<ul className="mt-3 space-y-2">
						{stats.recentSessions.map((s, i) => (
							<li key={`${s.startedAt}-${i}`} className="card-paper flex items-center justify-between px-4 py-3 text-sm">
								<span className="text-foreground-secondary">{formatSessionTime(s.startedAt)}</span>
								<span className="font-bold">
									{s.itemCount} câu · {s.accuracy}% đúng
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function StatCard({ label, value, sub, icon, color = 'foreground' }: {
	label: string;
	value: string | number;
	sub?: string;
	icon: string;
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
			<MaterialIcon name={icon} className="text-accent" size={20} />
			<p className="label-caps mt-2">{label}</p>
			<p className={`mt-1 text-3xl font-black ${colorClass}`}>{value}</p>
			{sub && <p className="mt-0.5 text-xs font-bold text-warning">{sub}</p>}
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
