'use client';

import type { CnReviewForecastDayDTO } from '@/types/chinese';

interface Props {
	days: CnReviewForecastDayDTO[];
}

export default function ForecastBars({ days }: Props) {
	if (!days.length) return null;

	const maxCount = Math.max(...days.map((d) => d.dueCount), 1);
	const peak = days.reduce((best, d) => (d.dueCount > best.dueCount ? d : best), days[0]);

	return (
		<div className="card-paper p-4">
			<div className="flex items-end justify-between gap-2">
				{days.map((day) => {
					const heightPct = day.dueCount > 0 ? Math.max(8, (day.dueCount / maxCount) * 100) : 4;
					const onTime = Math.max(0, day.dueCount - day.overdueCount);
					const overduePct = day.dueCount > 0 ? (day.overdueCount / day.dueCount) * 100 : 0;

					return (
						<div key={day.dayKey} className="flex flex-1 flex-col items-center gap-2">
							<span className="text-[10px] font-bold text-muted">{day.dueCount || ''}</span>
							<div className="flex h-24 w-full items-end justify-center">
								<div
									className="relative w-full max-w-8 overflow-hidden rounded-t-md border border-border/60 bg-accent-subtle"
									style={{ height: `${heightPct}%` }}
								>
									{day.overdueCount > 0 && (
										<div
											className="absolute bottom-0 left-0 right-0 bg-warning/80"
											style={{ height: `${overduePct}%` }}
										/>
									)}
									{onTime > 0 && day.overdueCount > 0 && (
										<div
											className="absolute left-0 right-0 top-0 bg-accent/70"
											style={{ height: `${100 - overduePct}%` }}
										/>
									)}
									{day.overdueCount === 0 && day.dueCount > 0 && (
										<div className="absolute inset-0 bg-accent/70" />
									)}
								</div>
							</div>
							<span className="text-center text-[10px] font-bold text-foreground-secondary">
								{day.label}
							</span>
						</div>
					);
				})}
			</div>
			{peak.dueCount > 0 && (
				<p className="mt-3 text-xs text-muted">
					Tải nặng nhất: <span className="font-bold text-foreground">{peak.label}</span> (~{peak.dueCount} mục)
				</p>
			)}
		</div>
	);
}
