import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import { auth } from '@/lib/auth';
import { listUserSets } from '@/services/chinese/cnSetService';
import { countDueToday } from '@/services/chinese/cnSrsService';
import { getChineseDashboard } from '@/services/chinese/cnDashboardService';
import {
	computeSetChannelProgress,
	maxSrsChannelsForSet,
} from '@/lib/chinese/setSrsProgress';

export const dynamic = 'force-dynamic';

function setStatusLabel(progress: number): { label: string; className: string } {
	if (progress >= 100) return { label: 'Vững vàng', className: 'bg-success/10 text-success' };
	if (progress >= 50) return { label: 'Đang học', className: 'bg-surface-container text-foreground-secondary' };
	if (progress > 0) return { label: 'Mới', className: 'bg-border text-foreground-secondary' };
	return { label: 'Mới', className: 'bg-border text-foreground-secondary' };
}

export default async function ChineseHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const userId = session.user.id;
	const [sets, dueToday, dashboard] = await Promise.all([
		listUserSets(userId),
		countDueToday(userId),
		getChineseDashboard(userId),
	]);

	const miniForecast = dashboard.forecast.slice(0, 3);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			{/* Mobile study-first hero */}
			<section className="card-paper p-6 md:hidden">
				<span className="label-caps tracking-widest">Học tiếng Trung</span>
				<div className="mt-4 flex items-end justify-between gap-4">
					<div>
						<div className="flex items-center gap-2">
							<p className="text-5xl font-black text-accent">{dueToday}</p>
							{dashboard.overdueCount > 0 && (
								<span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
									{dashboard.overdueCount} trễ
								</span>
							)}
						</div>
						<p className="mt-1 text-sm text-muted">mục cần ôn hôm nay</p>
						{miniForecast.some((d) => d.dueCount > 0) && (
							<p className="mt-2 text-xs text-muted">
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
					{dueToday > 0 ? (
						<Link href="/review" className="btn-primary shrink-0 px-6 py-3 shadow-sm">
							<MaterialIcon name="play_arrow" size={18} />
							Ôn ngay
						</Link>
					) : (
						<Link href="/sets" className="btn-primary shrink-0 px-6 py-3 shadow-sm">
							<MaterialIcon name="library_books" size={18} />
							Bộ từ
						</Link>
					)}
				</div>
				<Link href="/review/stats" className="mt-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
					<MaterialIcon name="query_stats" size={16} />
					Xem tiến độ ôn tập
				</Link>
			</section>

			<section className="hidden flex-col items-start justify-between gap-4 md:flex md:flex-row md:items-end">
				<div>
					<span className="label-caps tracking-widest">Học tiếng Trung</span>
					<h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
						Vocabulary Mastery
					</h1>
					<p className="mt-1 text-sm text-foreground-secondary">
						Làm chủ từ vựng mỗi ngày
					</p>
				</div>
			</section>

			<section className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<Link
					href="/review/stats"
					className="card-paper group flex aspect-square flex-col justify-between p-4 transition-colors hover:border-accent md:aspect-auto md:h-32"
				>
					<span className="label-caps flex items-center gap-1 text-foreground-secondary">
						<MaterialIcon name="query_stats" size={16} />
						Tiến độ SRS
					</span>
					<div className="mt-auto">
						<div className="flex items-end gap-2">
							<span className="text-4xl font-black text-accent transition-transform group-hover:scale-105">{dueToday}</span>
							<span className="mb-1 text-sm text-muted">mục ôn</span>
							{dashboard.overdueCount > 0 && (
								<span className="mb-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
									{dashboard.overdueCount} trễ
								</span>
							)}
						</div>
						{miniForecast.some((d) => d.dueCount > 0) && (
							<p className="mt-1 text-[10px] text-muted">
								{miniForecast.map((d, i) => (
									<span key={d.dayKey}>
										{i > 0 && ' · '}
										{d.label} {d.dueCount}
									</span>
								))}
							</p>
						)}
					</div>
				</Link>

				<div className="card-paper hidden aspect-square flex-col justify-between p-4 md:flex md:aspect-auto md:h-32">
					<span className="label-caps flex items-center gap-1 text-foreground-secondary">
						<MaterialIcon name="folder" size={16} />
						Bộ từ
					</span>
					<div className="mt-auto flex items-end gap-2">
						<span className="text-4xl font-black text-foreground">{dashboard.setCount}</span>
						<span className="mb-1 text-sm text-muted">bộ</span>
					</div>
				</div>

				<Link
					href="/dashboard"
					className="card-paper group flex aspect-square flex-col justify-between p-4 transition-colors hover:border-accent md:aspect-auto md:h-32"
				>
					<span className="label-caps flex items-center gap-1 text-foreground-secondary">
						<MaterialIcon name="psychology_alt" size={16} />
						Từ cần chú ý
					</span>
					<div className="mt-auto flex items-end gap-2">
						<span className="text-4xl font-black text-warning">{dashboard.weakCount}</span>
						<span className="mb-1 text-sm text-muted">cần ôn</span>
					</div>
				</Link>

				<div className="card-paper relative hidden aspect-square flex-col justify-between overflow-hidden p-4 md:flex md:aspect-auto md:h-32">
					<div className="pointer-events-none absolute -right-[10%] -top-[10%] opacity-5">
						<span className="hanzi-display text-[80px] font-black">听</span>
					</div>
					<span className="label-caps relative z-10 flex items-center gap-1 text-foreground-secondary">
						<MaterialIcon name="headphones" size={16} />
						Nghe đúng
					</span>
					<div className="relative z-10 mt-auto">
						<span className="text-4xl font-black text-success">{dashboard.listeningRate}%</span>
						<ProgressBar value={dashboard.listeningRate} className="mt-2" barClassName="bg-success" />
					</div>
				</div>
			</section>

			<section className="flex flex-wrap items-center gap-2">
				<Link href="/sets/create" className="btn-primary hidden shadow-sm md:inline-flex">
					<MaterialIcon name="add" size={16} />
					Tạo bộ từ mới
				</Link>
				<Link href="/hanzi-lab" className="btn-secondary">
					<MaterialIcon name="science" size={16} />
					Hanzi Lab
				</Link>
			</section>

			<section className="space-y-4 pt-2">
				<div className="flex items-center justify-between border-b border-border pb-2">
					<h2 className="text-2xl font-black text-foreground">Bộ từ của tôi</h2>
					<Link href="/sets" className="label-caps transition-colors hover:text-accent">
						Xem tất cả
					</Link>
				</div>

				{sets.length === 0 ? (
					<div className="text-sm text-muted">
						<p>Chưa có bộ từ.</p>
						<p className="mt-1 md:hidden">Tạo bộ từ trên máy tính sau buổi học để bắt đầu.</p>
						<p className="mt-1 hidden md:block">Tạo bộ từ sau buổi học để bắt đầu.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{sets.slice(0, 3).map((set) => {
							const maxChannels = maxSrsChannelsForSet(set.itemCount);
							const progress = set.srsActive
								? computeSetChannelProgress(set.itemCount, set.dueCount)
								: 0;
							const masteredChannels = Math.max(0, maxChannels - set.dueCount);
							const status = setStatusLabel(progress);
							return (
								<div
									key={set.id}
									className="card-paper group relative flex flex-col gap-2 overflow-hidden p-4"
								>
									<div className="absolute right-0 top-0 -z-0 h-16 w-16 rounded-bl-full bg-surface-hover opacity-50 transition-transform group-hover:scale-110" />
									<Link href={`/sets/${set.id}`} className="relative z-10 flex-1">
										<span className={`label-caps mb-2 inline-block rounded-full px-2 py-1 ${status.className}`}>
											{status.label}
										</span>
										<h3 className="text-lg font-extrabold text-foreground transition-colors group-hover:text-accent">
											{set.title}
										</h3>
										<p className="mt-1 text-sm text-muted">{set.description || 'Giáo trình chuẩn'}</p>
										<div className="mt-3 pt-2">
											<div className="mb-1 flex justify-between text-sm text-foreground-secondary">
												<span>Tiến độ</span>
												<span className={`font-bold ${progress >= 100 ? 'text-success' : 'text-accent'}`}>
													{set.srsActive ? `${masteredChannels} / ${maxChannels}` : '—'}
												</span>
											</div>
											<ProgressBar
												value={progress}
												barClassName={progress >= 100 ? 'bg-success' : 'bg-accent'}
											/>
										</div>
									</Link>
									<div className="relative z-10 flex gap-2 pt-2">
										<Link
											href={`/practice/${set.id}?mode=smart_mixed`}
											className="btn-primary flex-1"
										>
											<MaterialIcon name="play_arrow" size={16} />
											Luyện tập
										</Link>
										<Link href={`/sets/${set.id}`} className="btn-secondary shrink-0">
											Xem từ
										</Link>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
