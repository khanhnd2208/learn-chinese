import Link from 'next/link';
import type { ReactNode } from 'react';
import ReviewActivityChart from '@/components/chinese/ReviewActivityChart';
import UpcomingSchedule from '@/components/chinese/UpcomingSchedule';
import WordPipelineBar from '@/components/chinese/WordPipelineBar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { channelRateQualitative } from '@/lib/chinese/channelRateLabels';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import type { CnDashboardDTO } from '@/types/chinese';

function SectionHeading({ children, sub }: { children: ReactNode; sub?: string }) {
	return (
		<div className="border-b border-border pb-2">
			<h2 className="text-lg font-black text-foreground sm:text-xl">{children}</h2>
			{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
		</div>
	);
}

function OverallRateRing({ rate }: { rate: number }) {
	const qual = channelRateQualitative(rate);
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="relative h-28 w-28">
				<div
					className="absolute inset-0 rounded-full"
					style={{
						background: `conic-gradient(var(--accent) ${rate * 3.6}deg, var(--border) ${rate * 3.6}deg)`,
					}}
				/>
				<div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-surface">
					<span className={`text-2xl font-black ${qual.className}`}>{rate > 0 ? `${rate}%` : '—'}</span>
				</div>
			</div>
			<p className="text-center text-sm font-bold text-foreground-secondary">Tỉ lệ chính xác chung</p>
			{rate > 0 && (
				<span className={`label-caps ${qual.className}`}>{qual.label}</span>
			)}
		</div>
	);
}

function ChannelSkill({ label, rate }: { label: string; rate: number }) {
	const qual = channelRateQualitative(rate);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-foreground">{label}</span>
				<span className={`label-caps ${qual.className}`}>{rate > 0 ? `${rate}%` : '—'}</span>
			</div>
			<ProgressBar value={rate} className="h-2" barClassName={qual.barClassName} />
		</div>
	);
}

function MiniStat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
	return (
		<div className="card-paper flex flex-col p-4">
			<p className="label-caps !text-[10px] text-muted">{label}</p>
			<p className={`mt-1 text-2xl font-black ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
			{sub && <p className="mt-0.5 text-xs font-bold text-warning">{sub}</p>}
		</div>
	);
}

interface Props {
	dashboard: CnDashboardDTO;
}

export default function SrsReportPanel({ dashboard }: Props) {
	const { dueChannelsToday, overdueCount, reviewedToday } = dashboard;
	const hasDue = dueChannelsToday > 0;
	const hasInsights = dashboard.topErrors.length > 0 || dashboard.weakWords.length > 0;

	return (
		<div className="space-y-8">
			<section className="animate-section-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-xl font-black text-foreground">SRS</h2>
					<p className="mt-1 text-sm text-foreground-secondary">
						Lịch ôn và điểm cần cải thiện
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{dashboard.streak > 0 && (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-accent">
							<MaterialIcon name="local_fire_department" size={16} filled />
							{dashboard.streak} ngày
						</span>
					)}
					{hasDue ? (
						<Link href="/review" className="btn-primary shadow-sm">
							<MaterialIcon name="play_arrow" size={18} />
							Luyện ngay
						</Link>
					) : (
						<Link href="/sets" className="btn-secondary">
							<MaterialIcon name="library_books" size={16} />
							Bộ từ
						</Link>
					)}
				</div>
			</section>

			<section className="animate-section-in space-y-4">
				<SectionHeading sub="1 mục = 1 từ × 1 kỹ năng (nghĩa / âm đọc / câu)">
					Lịch ôn SRS
				</SectionHeading>
				<div className="grid grid-cols-3 gap-3">
					<MiniStat
						label="Đang đến hạn"
						value={dueChannelsToday}
						accent={hasDue}
					/>
					<MiniStat
						label="Trễ hạn"
						value={overdueCount}
						sub={overdueCount > 0 ? 'Ưu tiên ôn' : undefined}
					/>
					<MiniStat label="Đã ôn hôm nay" value={reviewedToday} />
				</div>
				<div className="card-paper p-4 sm:p-6">
					<UpcomingSchedule
						slots={dashboard.upcomingSchedule}
						forecast={dashboard.forecast}
						nextDueLabel={dashboard.nextDueLabel}
					/>
				</div>
			</section>

			{dashboard.stateDistribution.total > 0 && (
				<section className="animate-section-in space-y-4">
					<SectionHeading sub="Tiến trình từ vựng trong SRS">Kho từ</SectionHeading>
					<WordPipelineBar distribution={dashboard.stateDistribution} />
				</section>
			)}

			<section className="animate-section-in grid gap-8 lg:grid-cols-2">
				<div className="space-y-4">
					<SectionHeading sub="Dựa trên lịch sử luyện SRS gần đây">Tỉ lệ chính xác</SectionHeading>
					<div className="card-paper grid gap-8 p-6 md:grid-cols-2 md:items-center">
						<div className="flex justify-center border-border md:border-r md:pr-8">
							<OverallRateRing rate={dashboard.overallRate} />
						</div>
						<div className="flex flex-col gap-4">
							<ChannelSkill label="Nghĩa" rate={dashboard.meaningRate} />
							<ChannelSkill label="Âm đọc" rate={dashboard.soundRate} />
							<ChannelSkill label="Dùng câu" rate={dashboard.sentenceRate} />
						</div>
					</div>
				</div>

				{hasInsights && (
					<div className="space-y-6">
						{dashboard.topErrors.length > 0 && (
							<div className="space-y-4">
								<SectionHeading>Lỗi phổ biến</SectionHeading>
								<ul className="card-paper divide-y divide-border">
									{dashboard.topErrors.map((e) => (
										<li key={e.errorType} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
											<span className="font-medium text-foreground">{errorTypeLabel(e.errorType)}</span>
											<span className="shrink-0 rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-bold text-accent">
												{e.count} lần
											</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{dashboard.weakWords.length > 0 && (
							<div className="space-y-4">
								<SectionHeading sub="Từ đang ở trạng thái yếu hoặc đang học">
									Từ cần chú ý
								</SectionHeading>
								<div className="flex flex-wrap gap-2">
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
							</div>
						)}
					</div>
				)}
			</section>

			<section className="animate-section-in space-y-4">
				<SectionHeading sub="Số mục đã ôn mỗi ngày (chỉ phiên SRS)">Hoạt động</SectionHeading>
				<ReviewActivityChart series={dashboard.dailySeries} days={14} />
			</section>
		</div>
	);
}
