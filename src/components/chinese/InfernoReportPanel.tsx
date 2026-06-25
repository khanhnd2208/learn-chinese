'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnInfernoStatsDTO } from '@/types/chinese';

export default function InfernoReportPanel() {
	const [stats, setStats] = useState<CnInfernoStatsDTO | null>(null);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/inferno/stats');
			const json = await res.json() as { ok: boolean; data?: { stats: CnInfernoStatsDTO } };
			if (json.ok) setStats(json.data?.stats ?? null);
		})();
	}, []);

	if (!stats) {
		return (
			<div className="py-16 text-center text-muted">
				Đang tải thống kê Địa Ngục...
			</div>
		);
	}

	const maxBucket = Math.max(1, ...stats.scoreDistribution.map((b) => b.count));

	return (
		<div className="space-y-8">
			<section className="animate-section-in">
				<div className="flex items-center gap-2">
					<MaterialIcon name="local_fire_department" className="text-warning" size={28} filled />
					<h2 className="text-xl font-black text-foreground">Địa Ngục</h2>
				</div>
				<p className="mt-1 text-sm text-muted">
					MCQ +30 · Điền +70 · Sai: −30 − 25% điểm hiện có
				</p>

				{stats.insights.length > 0 && (
					<div className="mt-4 space-y-2">
						{stats.insights.map((insight) => (
							<p
								key={insight}
								className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2 text-sm text-foreground-secondary"
							>
								{insight}
							</p>
						))}
					</div>
				)}
			</section>

			<section className="card-paper animate-section-in flex flex-wrap items-center justify-between gap-4 p-4">
				<Link href="/inferno" className="btn-primary px-6 py-3">
					<MaterialIcon name="local_fire_department" size={18} filled />
					Vào Địa Ngục
				</Link>
				<div className="flex flex-wrap gap-6">
					<div className="text-right">
						<p className="text-3xl font-black text-warning">{stats.masteredCount}</p>
						<p className="label-caps !text-[10px]">Từ ≥300 điểm</p>
						<p className="text-xs text-muted">/ {stats.totalEnrolled} từ SRS</p>
					</div>
					<div className="text-right">
						<p className="text-3xl font-black text-foreground">{stats.avgMasteryScore}</p>
						<p className="label-caps !text-[10px]">Điểm TB</p>
					</div>
					<div className="text-right">
						<p className="text-3xl font-black text-accent">{stats.totalMasteryPoints}</p>
						<p className="label-caps !text-[10px]">Tổng điểm</p>
					</div>
				</div>
			</section>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="card-paper p-4">
					<p className="label-caps">Tổng câu trả lời</p>
					<p className="mt-1 text-2xl font-black text-foreground">{stats.totalAnswered}</p>
				</div>
				<div className="card-paper p-4">
					<p className="label-caps">Tỷ lệ đúng</p>
					<p className="mt-1 text-2xl font-black text-success">{stats.overallAccuracy}%</p>
				</div>
				<div className="card-paper p-4">
					<p className="label-caps">MCQ ({stats.mcqTotal} câu)</p>
					<p className="mt-1 text-2xl font-black text-foreground">{stats.mcqAccuracy}%</p>
				</div>
				<div className="card-paper p-4">
					<p className="label-caps">Điền ({stats.fillTotal} câu)</p>
					<p className="mt-1 text-2xl font-black text-foreground">{stats.fillAccuracy}%</p>
				</div>
			</div>

			<section className="card-paper animate-section-in p-6">
				<h2 className="text-lg font-extrabold text-foreground">Phân phối điểm</h2>
				<div className="mt-4 space-y-3">
					{stats.scoreDistribution.map((bucket) => (
						<div key={bucket.label} className="flex items-center gap-3">
							<span className="w-16 shrink-0 text-sm font-bold text-muted">{bucket.label}</span>
							<div className="h-6 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
								<div
									className="h-full rounded-full bg-warning transition-all"
									style={{ width: `${Math.round((bucket.count / maxBucket) * 100)}%` }}
								/>
							</div>
							<span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums">{bucket.count}</span>
						</div>
					))}
				</div>
			</section>

			{stats.topMastered.length > 0 && (
				<section className="card-paper animate-section-in p-6">
					<h2 className="text-lg font-extrabold text-foreground">Top điểm cao nhất</h2>
					<ul className="mt-4 divide-y divide-border">
						{stats.topMastered.map((word, idx) => (
							<li key={word.wordId} className="flex items-center justify-between gap-3 py-3">
								<div className="flex items-center gap-3">
									<span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/10 text-xs font-black text-warning">
										{idx + 1}
									</span>
									<div>
										<p className="hanzi-lg font-bold text-foreground">{word.simplified}</p>
										<p className="text-xs text-muted">{word.meaningVi}</p>
									</div>
								</div>
								<span className="text-lg font-black tabular-nums text-success">{word.masteryScore}</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{stats.stuckAtZero.length > 0 && (
				<section className="card-paper animate-section-in border-error/20 p-6">
					<h2 className="text-lg font-extrabold text-error">Từ bị kéo về 0</h2>
					<p className="mt-1 text-sm text-muted">Đã luyện nhưng điểm về 0 do trả lời sai nhiều</p>
					<ul className="mt-4 divide-y divide-border">
						{stats.stuckAtZero.map((word) => (
							<li key={word.wordId} className="flex items-center justify-between gap-3 py-3">
								<div>
									<p className="hanzi-lg font-bold text-foreground">{word.simplified}</p>
									<p className="text-xs text-muted">{word.meaningVi}</p>
								</div>
								<span className="text-sm font-bold text-error">0 điểm</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{stats.totalEnrolled === 0 && (
				<section className="card-paper p-6 text-center">
					<p className="text-muted">Chưa có từ SRS — bật Ôn SRS trên bộ từ để bắt đầu.</p>
					<Link href="/sets" className="btn-primary mt-4 inline-flex">
						Quản lý bộ từ
					</Link>
				</section>
			)}
		</div>
	);
}
