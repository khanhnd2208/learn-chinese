'use client';

import type { CnReviewDailyActivityDTO } from '@/types/chinese';

interface Props {
	series: CnReviewDailyActivityDTO[];
	weeks?: number;
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function localDayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export default function ActivityHeatmap({ series, weeks = 12 }: Props) {
	const byDay = new Map(series.map((row) => [row.dayKey, row.reviewed]));
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const totalDays = weeks * 7;
	const start = addDays(today, -(totalDays - 1));

	const cells: Array<{ dayKey: string; count: number }> = [];
	for (let i = 0; i < totalDays; i++) {
		const d = addDays(start, i);
		const dayKey = localDayKey(d);
		cells.push({ dayKey, count: byDay.get(dayKey) ?? 0 });
	}

	const maxCount = Math.max(...cells.map((c) => c.count), 1);
	const hasActivity = cells.some((c) => c.count > 0);
	if (!hasActivity) {
		return (
			<p className="text-sm text-muted">Chưa đủ dữ liệu để hiển thị biểu đồ hoạt động.</p>
		);
	}

	return (
		<div className="card-paper p-4">
			<div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
				{cells.map((cell) => {
					const intensity = cell.count === 0 ? 0 : Math.ceil((cell.count / maxCount) * 4);
					const levelClass = [
						'bg-surface-hover',
						'bg-accent/20',
						'bg-accent/40',
						'bg-accent/65',
						'bg-accent',
					][intensity];
					return (
						<div
							key={cell.dayKey}
							title={`${cell.dayKey}: ${cell.count} mục`}
							className={`h-3 w-3 rounded-sm ${levelClass}`}
						/>
					);
				})}
			</div>
			<div className="mt-3 flex items-center justify-between text-[10px] text-muted">
				<span>Ít</span>
				<span>Nhiều</span>
			</div>
		</div>
	);
}
