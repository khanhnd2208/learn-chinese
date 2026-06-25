'use client';

import ForecastBars from '@/components/chinese/ForecastBars';
import type { CnReviewForecastDayDTO, CnUpcomingSlotDTO } from '@/types/chinese';

interface Props {
	slots: CnUpcomingSlotDTO[];
	forecast: CnReviewForecastDayDTO[];
	nextDueLabel: string | null;
}

export default function UpcomingSchedule({ slots, forecast, nextDueLabel }: Props) {
	const visibleSlots = slots.filter((s) => s.count > 0);
	const hasAnyDue = visibleSlots.length > 0;

	return (
		<div className="space-y-4">
			{hasAnyDue ? (
				<div className="flex flex-wrap gap-2">
					{visibleSlots.map((slot) => {
						const isNow = slot.key === 'now';
						return (
							<div
								key={slot.key}
								className={`flex min-w-[7rem] flex-col rounded-lg border px-3 py-2 ${
									isNow
										? 'border-accent bg-accent-subtle'
										: 'border-border bg-background'
								}`}
							>
								<span className="text-[10px] font-bold uppercase tracking-wide text-muted">
									{slot.label}
								</span>
								<span className={`text-xl font-black ${isNow ? 'text-accent' : 'text-foreground'}`}>
									{slot.count}
								</span>
								{isNow && slot.overdueCount != null && slot.overdueCount > 0 && (
									<span className="mt-0.5 text-[10px] font-bold text-warning">
										{slot.overdueCount} trễ
									</span>
								)}
							</div>
						);
					})}
				</div>
			) : nextDueLabel ? (
				<p className="text-sm text-muted">{nextDueLabel}</p>
			) : (
				<p className="text-sm text-muted">Không có mục đến hạn trong 7 ngày tới.</p>
			)}

			{forecast.some((d) => d.dueCount > 0) && (
				<div>
					<p className="mb-2 text-xs text-muted">Dự kiến 7 ngày · vàng = đang trễ</p>
					<ForecastBars days={forecast} />
				</div>
			)}
		</div>
	);
}
