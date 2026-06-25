'use client';

import type { CnReviewDailyActivityDTO } from '@/types/chinese';

interface Props {
	series: CnReviewDailyActivityDTO[];
	days?: number;
}

function addDays(date: Date, delta: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + delta);
	return d;
}

function localDayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function dayLabel(date: Date): string {
	return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

export default function ReviewActivityChart({ series, days = 14 }: Props) {
	const byDay = new Map(series.map((row) => [row.dayKey, row.reviewed]));
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const start = addDays(today, -(days - 1));

	const cells: Array<{ dayKey: string; count: number; label: string }> = [];
	for (let i = 0; i < days; i++) {
		const d = addDays(start, i);
		const dayKey = localDayKey(d);
		cells.push({ dayKey, count: byDay.get(dayKey) ?? 0, label: dayLabel(d) });
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
			<div className="flex items-end justify-between gap-1 overflow-x-auto">
				{cells.map((cell) => {
					const heightPct = cell.count > 0 ? Math.max(8, (cell.count / maxCount) * 100) : 4;
					return (
						<div key={cell.dayKey} className="flex min-w-[2rem] flex-1 flex-col items-center gap-1">
							<span className="text-[10px] font-bold text-muted">
								{cell.count > 0 ? cell.count : ''}
							</span>
							<div className="flex h-20 w-full items-end justify-center">
								<div
									className={`w-full max-w-6 rounded-t-md ${
										cell.count > 0 ? 'bg-accent/70' : 'bg-surface-hover'
									}`}
									style={{ height: `${heightPct}%` }}
									title={`${cell.label}: ${cell.count} mục`}
								/>
							</div>
							<span className="text-center text-[9px] font-bold leading-tight text-foreground-secondary">
								{cell.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
