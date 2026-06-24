import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import ForecastBars from '@/components/chinese/ForecastBars';
import StateDistributionBar from '@/components/chinese/StateDistributionBar';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { auth } from '@/lib/auth';
import { channelRateQualitative } from '@/lib/chinese/channelRateLabels';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import { getChineseDashboard } from '@/services/chinese/cnDashboardService';

export const dynamic = 'force-dynamic';

function SectionHeading({ children, sub }: { children: ReactNode; sub?: string }) {
	return (
		<div className="border-b border-border pb-2">
			<h2 className="text-lg font-black text-foreground sm:text-xl">{children}</h2>
			{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
		</div>
	);
}

function StatTile({
	label,
	value,
	color = 'foreground',
}: {
	label: string;
	value: string | number;
	color?: 'foreground' | 'accent' | 'success' | 'warning';
}) {
	const colorClass = {
		foreground: 'text-foreground',
		accent: 'text-accent',
		success: 'text-success',
		warning: 'text-warning',
	}[color];

	return (
		<div className="card-paper flex flex-col items-center justify-center p-4 text-center">
			<p className={`text-3xl font-black sm:text-4xl ${colorClass}`}>{value}</p>
			<p className="mt-1 text-xs text-muted">{label}</p>
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

export default async function ChineseDashboardPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const dashboard = await getChineseDashboard(session.user.id);
	const { dueToday } = dashboard;
	const miniForecast = dashboard.forecast.slice(0, 3);
	const practicingCount = Math.max(0, dashboard.wordsLearned - dashboard.wordsMastered);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="animate-section-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<span className="label-caps tracking-widest">Tiến bộ</span>
					<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
						Tiến độ học tập
					</h1>
					<p className="mt-1 text-sm text-foreground-secondary">
						Theo dõi từ vựng, lịch ôn và điểm cần cải thiện
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{dashboard.streak > 0 && (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-accent">
							<MaterialIcon name="local_fire_department" size={16} filled />
							{dashboard.streak} ngày
						</span>
					)}
					{dueToday > 0 ? (
						<Link href="/review" className="btn-primary shadow-sm">
							<MaterialIcon name="play_arrow" size={18} />
							Ôn ngay
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
				<SectionHeading sub="Tổng quan từ vựng trong SRS">Từ vựng của bạn</SectionHeading>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<StatTile label="Tổng từ" value={dashboard.stateDistribution.total} />
					<StatTile label="Đang leo thang" value={practicingCount} color="accent" />
					<StatTile label="Thuần thục" value={dashboard.wordsMastered} color="success" />
					<StatTile label="Cần chú ý" value={dashboard.weakCount} color="warning" />
				</div>
			</section>

			<section className="animate-section-in space-y-4">
				<SectionHeading sub="1 mục = 1 từ × 1 kênh">Lịch ôn</SectionHeading>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="card-paper flex flex-col justify-between p-6">
						<div>
							<p className="text-5xl font-black text-accent">{dueToday}</p>
							<p className="mt-1 text-sm text-muted">mục cần ôn hôm nay</p>
							{miniForecast.some((d) => d.dueCount > 0) && (
								<p className="mt-3 text-xs text-muted">
									{miniForecast.map((d, i) => (
										<span key={d.dayKey}>
											{i > 0 && ' · '}
											<span className="font-bold text-foreground-secondary">{d.label}</span>{' '}
											{d.dueCount}
										</span>
									))}
								</p>
							)}
						</div>
						<div className="mt-6">
							{dueToday > 0 ? (
								<Link href="/review" className="btn-primary w-full sm:w-auto">
									<MaterialIcon name="play_arrow" size={16} />
									Ôn {dueToday} mục
								</Link>
							) : (
								<p className="text-sm text-foreground-secondary">
									<MaterialIcon name="check_circle" className="mr-1 inline text-success" size={18} />
									Không có mục đến hạn hôm nay
								</p>
							)}
						</div>
					</div>
					{dashboard.forecast.some((d) => d.dueCount > 0) ? (
						<ForecastBars days={dashboard.forecast} />
					) : (
						<div className="card-paper flex items-center justify-center p-6 text-sm text-muted">
							Chưa có lịch ôn sắp tới
						</div>
					)}
				</div>
			</section>

			{dashboard.stateDistribution.total > 0 && (
				<section className="animate-section-in space-y-4">
					<SectionHeading>Phân bổ trình độ từ</SectionHeading>
					<StateDistributionBar
						distribution={dashboard.stateDistribution}
						maturePct={dashboard.maturePct}
						simplifiedLegend
					/>
				</section>
			)}

			<section className="animate-section-in space-y-4">
				<SectionHeading sub="Dựa trên lịch sử trả lời gần đây">Tỉ lệ chính xác</SectionHeading>
				<div className="card-paper grid gap-8 p-6 md:grid-cols-2 md:items-center">
					<div className="flex justify-center border-border md:border-r md:pr-8">
						<OverallRateRing rate={dashboard.overallRate} />
					</div>
					<div className="flex flex-col gap-4">
						<ChannelSkill label="Nghĩa" rate={dashboard.meaningRate} />
						<ChannelSkill label="Nghe" rate={dashboard.listeningRate} />
						<ChannelSkill label="Pinyin" rate={dashboard.pinyinRate} />
						<ChannelSkill label="Câu" rate={dashboard.sentenceRate} />
					</div>
				</div>
			</section>

			{dashboard.topErrors.length > 0 && (
				<section className="animate-section-in space-y-4">
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
				</section>
			)}

			{dashboard.weakWords.length > 0 && (
				<section className="animate-section-in space-y-4">
					<SectionHeading sub="Từ đang ở trạng thái yếu hoặc đang học">Từ cần chú ý ngay</SectionHeading>
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
				</section>
			)}

			{dashboard.suggestions.length > 0 && (
				<section className="animate-section-in flex items-start gap-4 rounded-xl border border-border bg-surface-container p-4">
					<MaterialIcon name="lightbulb" className="shrink-0 text-accent" size={32} />
					<div>
						<h2 className="text-lg font-black text-foreground">Gợi ý học tập</h2>
						<ul className="mt-2 space-y-2 text-sm text-foreground-secondary">
							{dashboard.suggestions.map((s, i) => <li key={i}>{s}</li>)}
						</ul>
					</div>
				</section>
			)}
		</div>
	);
}
