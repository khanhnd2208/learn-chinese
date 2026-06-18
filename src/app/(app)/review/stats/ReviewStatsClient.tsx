'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
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
		: 0;

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<span className="label-caps tracking-widest">SRS</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Tiến độ ôn tập</h1>
				<p className="mt-1 text-sm text-muted">
					Xem bất cứ lúc nào · 1 mục = 1 từ × 1 kênh kỹ năng
				</p>
				<div className="mt-4 flex flex-wrap gap-3">
					<Link href="/review" className="btn-primary">
						<MaterialIcon name="play_arrow" size={16} />
						Ôn ngay
					</Link>
					{stats.dueTotal > 0 && (
						<span className="flex items-center text-sm text-muted">
							Còn ~{stats.dueTotal} mục — dừng bất cứ lúc nào
						</span>
					)}
				</div>
			</section>

			<section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard label="Cần ôn" value={stats.dueTotal} icon="calendar_today" color="accent" />
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

			<section>
				<h2 className="label-caps">Tỷ lệ theo kênh</h2>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<ChannelRate label="Nghĩa" rate={stats.meaningRate} />
					<ChannelRate label="Nghe" rate={stats.listeningRate} barClassName="bg-success" />
					<ChannelRate label="Pinyin" rate={stats.pinyinRate} />
					<ChannelRate label="Dùng câu" rate={stats.sentenceRate} />
					<ChannelRate label="Chữ Hán" rate={stats.charRate} />
				</div>
			</section>

			{stats.weakWords.length > 0 && (
				<section>
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

function StatCard({ label, value, icon, color = 'foreground' }: {
	label: string;
	value: string | number;
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
