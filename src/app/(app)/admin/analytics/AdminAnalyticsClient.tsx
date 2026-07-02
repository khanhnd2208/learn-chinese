'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReviewActivityChart from '@/components/chinese/ReviewActivityChart';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnAdminAnalyticsDTO, CnAdminUserActivityDTO } from '@/types/chinese';

type SortKey = 'answers7d' | 'activeDays7d' | 'sessions7d' | 'streak' | 'lastActiveAt';

function MiniStat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
	return (
		<div className="card-paper p-4">
			<p className="label-caps !text-[10px] text-muted">{label}</p>
			<p className="mt-1 text-2xl font-black text-foreground">{value}</p>
			{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
		</div>
	);
}

function formatLastActive(iso: string | null): string {
	if (!iso) return '—';
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffHours = Math.floor(diffMs / 3_600_000);
	if (diffHours < 1) return 'Vừa xong';
	if (diffHours < 24) return `${diffHours} giờ trước`;
	const diffDays = Math.floor(diffMs / 86_400_000);
	if (diffDays < 7) return `${diffDays} ngày trước`;
	return d.toLocaleDateString('vi-VN');
}

function SourceBreakdownBar({ breakdown }: { breakdown: CnAdminAnalyticsDTO['sourceBreakdown'] }) {
	const total = breakdown.review + breakdown.practice + breakdown.inferno + breakdown.other;
	if (total === 0) return <p className="text-sm text-muted">Chưa có dữ liệu.</p>;

	const segments = [
		{ label: 'SRS', count: breakdown.review, color: 'bg-accent' },
		{ label: 'Luyện tập', count: breakdown.practice, color: 'bg-success' },
		{ label: 'Địa Ngục', count: breakdown.inferno, color: 'bg-warning' },
		{ label: 'Khác', count: breakdown.other, color: 'bg-muted' },
	].filter((s) => s.count > 0);

	return (
		<div className="space-y-3">
			<div className="flex h-3 overflow-hidden rounded-full bg-border">
				{segments.map((seg) => (
					<div
						key={seg.label}
						className={`${seg.color} transition-all`}
						style={{ width: `${(seg.count / total) * 100}%` }}
						title={`${seg.label}: ${seg.count}`}
					/>
				))}
			</div>
			<div className="flex flex-wrap gap-4 text-xs">
				{segments.map((seg) => (
					<span key={seg.label} className="flex items-center gap-1.5 text-muted">
						<span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
						{seg.label}: <strong className="text-foreground">{seg.count}</strong>
						<span>({Math.round((seg.count / total) * 100)}%)</span>
					</span>
				))}
			</div>
		</div>
	);
}

export default function AdminAnalyticsClient() {
	const [analytics, setAnalytics] = useState<CnAdminAnalyticsDTO | null>(null);
	const [sortKey, setSortKey] = useState<SortKey>('answers7d');
	const [sortAsc, setSortAsc] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/admin/practice-analytics');
				const json = await res.json() as { ok: boolean; data?: { analytics: CnAdminAnalyticsDTO }; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Lỗi tải dữ liệu');
				setAnalytics(json.data?.analytics ?? null);
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Lỗi');
			}
		})();
	}, []);

	const sortedUsers = useMemo(() => {
		if (!analytics) return [];
		const users = [...analytics.users];
		users.sort((a, b) => {
			if (sortKey === 'lastActiveAt') {
				const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
				const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
				return sortAsc ? aTime - bTime : bTime - aTime;
			}
			const diff = (a[sortKey] as number) - (b[sortKey] as number);
			return sortAsc ? diff : -diff;
		});
		return users;
	}, [analytics, sortKey, sortAsc]);

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) setSortAsc((v) => !v);
		else {
			setSortKey(key);
			setSortAsc(false);
		}
	};

	const sortIndicator = (key: SortKey) => {
		if (sortKey !== key) return '';
		return sortAsc ? ' ↑' : ' ↓';
	};

	if (error) {
		return <p className="p-8 text-error">{error}</p>;
	}

	if (!analytics) {
		return <p className="p-8 text-muted">Đang tải thống kê luyện tập...</p>;
	}

	const activeUsers = analytics.users.filter((u) => u.answers7d > 0);

	return (
		<div className="p-8">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-black uppercase">Theo dõi luyện tập</h1>
					<p className="mt-1 text-sm text-muted">
						Cường độ và tần suất học của người dùng — 30 ngày gần nhất
					</p>
				</div>
				<Link href="/admin" className="btn-secondary inline-flex items-center gap-2">
					<MaterialIcon name="arrow_back" size={16} />
					Admin CMS
				</Link>
			</div>

			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MiniStat label="Hoạt động hôm nay" value={analytics.activeToday} sub="người dùng" />
				<MiniStat label="Hoạt động 7 ngày" value={analytics.active7d} sub="người dùng" />
				<MiniStat label="Hoạt động 30 ngày" value={analytics.active30d} sub="người dùng" />
				<MiniStat
					label="Tổng lượt trả lời"
					value={analytics.totalAnswers7d}
					sub={`7 ngày · 30 ngày: ${analytics.totalAnswers30d}`}
				/>
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-2">
				<section className="card-paper p-5">
					<h2 className="font-bold text-foreground">Hoạt động theo ngày</h2>
					<p className="mt-1 text-xs text-muted">Tổng lượt trả lời toàn app</p>
					<div className="mt-4">
						<ReviewActivityChart series={analytics.dailySeries} days={14} />
					</div>
				</section>

				<section className="card-paper p-5">
					<h2 className="font-bold text-foreground">Phân loại theo chế độ</h2>
					<p className="mt-1 text-xs text-muted">30 ngày gần nhất</p>
					<div className="mt-4">
						<SourceBreakdownBar breakdown={analytics.sourceBreakdown} />
					</div>
				</section>
			</div>

			<section className="mt-8">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-bold text-foreground">
						Chi tiết người dùng ({activeUsers.length} hoạt động / {analytics.users.length} tổng)
					</h2>
				</div>

				<div className="mt-4 overflow-x-auto rounded-xl border border-border">
					<table className="w-full min-w-[720px] text-sm">
						<thead className="border-b border-border bg-surface">
							<tr>
								<th className="px-4 py-2 text-left">Người dùng</th>
								<th className="cursor-pointer px-4 py-2 text-right" onClick={() => toggleSort('answers7d')}>
									Lượt 7d{sortIndicator('answers7d')}
								</th>
								<th className="cursor-pointer px-4 py-2 text-right" onClick={() => toggleSort('activeDays7d')}>
									Ngày HT 7d{sortIndicator('activeDays7d')}
								</th>
								<th className="cursor-pointer px-4 py-2 text-right" onClick={() => toggleSort('sessions7d')}>
									Phiên 7d{sortIndicator('sessions7d')}
								</th>
								<th className="px-4 py-2 text-right">TB/phiên</th>
								<th className="cursor-pointer px-4 py-2 text-right" onClick={() => toggleSort('streak')}>
									Chuỗi{sortIndicator('streak')}
								</th>
								<th className="px-4 py-2 text-right">Đúng 30d</th>
								<th className="cursor-pointer px-4 py-2 text-right" onClick={() => toggleSort('lastActiveAt')}>
									Lần cuối{sortIndicator('lastActiveAt')}
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedUsers.map((user: CnAdminUserActivityDTO) => (
								<tr key={user.userId} className="border-b border-border hover:bg-surface-hover">
									<td className="px-4 py-2">
										<p className="font-medium text-foreground">{user.name || '—'}</p>
										<p className="text-xs text-muted">{user.email || user.userId}</p>
									</td>
									<td className="px-4 py-2 text-right font-bold tabular-nums">
										{user.answers7d}
										<span className="ml-1 text-xs font-normal text-muted">/ {user.answers30d}</span>
									</td>
									<td className="px-4 py-2 text-right tabular-nums">
										{user.activeDays7d}
										<span className="ml-1 text-xs text-muted">/ {user.activeDays30d}</span>
									</td>
									<td className="px-4 py-2 text-right tabular-nums">{user.sessions7d}</td>
									<td className="px-4 py-2 text-right tabular-nums">{user.avgItemsPerSession || '—'}</td>
									<td className="px-4 py-2 text-right tabular-nums">
										{user.streak > 0 ? (
											<span className="inline-flex items-center gap-0.5 text-accent">
												<MaterialIcon name="local_fire_department" size={14} filled />
												{user.streak}
											</span>
										) : '—'}
									</td>
									<td className="px-4 py-2 text-right tabular-nums">
										{user.accuracy30d > 0 ? `${user.accuracy30d}%` : '—'}
									</td>
									<td className="px-4 py-2 text-right text-xs text-muted">
										{formatLastActive(user.lastActiveAt)}
									</td>
								</tr>
							))}
							{sortedUsers.length === 0 && (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-muted">
										Chưa có dữ liệu luyện tập.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
