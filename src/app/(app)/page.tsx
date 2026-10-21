import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import PracticeModePicker from '@/components/chinese/PracticeModePicker';
import { auth } from '@/lib/auth';
import {
	formatIntroducedLabel,
	formatMasteredLabel,
	formatSetDueChannelsLabel,
	masteredSharePct,
	type SetLearningSnapshot,
} from '@/lib/chinese/setSrsProgress';
import { countDueToday } from '@/services/chinese/cnSrsService';
import { getLearnQueue } from '@/services/chinese/cnLearnService';
import { CN_NEW_WORDS_PER_DAY } from '@/config/constants';
import { listUserSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

const ONBOARDING_STEPS = [
	{
		icon: 'upload_file',
		title: 'Import từ',
		description: 'Import Excel theo mẫu hoặc dùng AI Smart Import — dán TSV từ Gen AI.',
		href: '/sets/import',
	},
	{
		icon: 'toggle_on',
		title: 'Bật SRS cho bộ từ',
		description: 'Vào Bộ từ, bật Ôn SRS để app nhắc ôn theo lịch.',
		href: '/sets',
	},
	{
		icon: 'history',
		title: 'Luyện SRS hàng ngày',
		description: 'Làm phiên Luyện SRS mỗi ngày — mỗi từ qua 3 kênh: nghĩa, âm đọc, câu.',
		href: '/review',
	},
] as const;

function setStatusLabel(snapshot: SetLearningSnapshot): { label: string; className: string } {
	if (snapshot.total > 0 && snapshot.mastered >= snapshot.total) {
		return { label: 'Đã nắm', className: 'bg-success/10 text-success' };
	}
	if (snapshot.introduced > 0) {
		return { label: 'Đang học', className: 'bg-surface-container text-foreground-secondary' };
	}
	return { label: 'Mới', className: 'bg-border text-foreground-secondary' };
}

export default async function ChineseHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const userId = session.user.id;
	const [sets, dueToday, learnQueue] = await Promise.all([
		listUserSets(userId),
		countDueToday(userId),
		getLearnQueue(userId),
	]);
	const learnIsPrimary = dueToday === 0;

	const isNewUser = sets.length === 0;

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="animate-section-in">
				<span className="label-caps tracking-widest">Học tiếng Trung</span>
				<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
					Vocabulary Mastery
				</h1>
				<p className="mt-1 text-sm text-foreground-secondary">Làm chủ từ vựng mỗi ngày</p>
			</section>

			{isNewUser ? (
				<section className="animate-section-in card-paper space-y-6 p-6 md:p-8">
					<div>
						<h2 className="text-xl font-black text-foreground">Bắt đầu trong 3 bước</h2>
						<p className="mt-1 text-sm text-muted">
							Import từ, bật SRS, rồi luyện SRS mỗi ngày.
						</p>
					</div>
					<ol className="space-y-4">
						{ONBOARDING_STEPS.map((step, idx) => (
							<li key={step.title}>
								<Link
									href={step.href}
									className="group flex gap-4 rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
										<MaterialIcon name={step.icon} size={22} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-bold text-muted">Bước {idx + 1}</p>
										<p className="font-extrabold text-foreground group-hover:text-accent">{step.title}</p>
										<p className="mt-0.5 text-sm text-foreground-secondary">{step.description}</p>
									</div>
									<MaterialIcon name="chevron_right" className="shrink-0 self-center text-muted" size={20} />
								</Link>
							</li>
						))}
					</ol>
					<Link href="/sets/import" className="btn-primary w-full sm:w-auto">
						<MaterialIcon name="upload_file" size={16} />
						Import từ đầu tiên
					</Link>
				</section>
			) : (
				<section className="animate-section-in card-paper flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="label-caps">Hôm nay</p>
						{dueToday > 0 ? (
							<>
								<p className="mt-1 text-4xl font-black text-accent">{dueToday}</p>
								<p className="text-sm text-muted">mục cần ôn SRS</p>
							</>
						) : (
							<p className="mt-2 text-sm text-foreground-secondary">
								<MaterialIcon name="check_circle" className="mr-1 inline text-success" size={18} />
								Không có mục đến hạn — tiếp tục luyện tập hoặc thêm từ mới.
							</p>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						<Link href="/review" className={learnIsPrimary ? 'btn-secondary' : 'btn-primary'}>
							<MaterialIcon name="play_arrow" size={16} />
							Ôn hôm nay ({dueToday} mục)
						</Link>
						<Link href="/learn" className={learnIsPrimary ? 'btn-primary' : 'btn-secondary'}>
							<MaterialIcon name="school" size={16} />
							Học từ mới (còn {learnQueue.remainingToday}/{CN_NEW_WORDS_PER_DAY} hôm nay)
						</Link>
						<Link href="/sets" className="btn-secondary">
							<MaterialIcon name="library_books" size={16} />
							Quản lý bộ từ
						</Link>
						<Link href="/dashboard" className="btn-secondary">
							<MaterialIcon name="query_stats" size={16} />
							Báo cáo học tập
						</Link>
					</div>
				</section>
			)}

			<section className="flex flex-wrap items-center gap-2">
				<Link href="/sets/import" className="btn-primary shadow-sm">
					<MaterialIcon name="upload_file" size={16} />
					Import từ
				</Link>
			</section>

			<section className="animate-section-in space-y-4 pt-2">
				<div className="flex items-center justify-between border-b border-border pb-2">
					<h2 className="text-2xl font-black text-foreground">Bộ từ của tôi</h2>
					<Link href="/sets" className="label-caps transition-colors hover:text-accent">
						Xem tất cả
					</Link>
				</div>

				{sets.length === 0 ? (
					<div className="text-sm text-muted">
						<p>Chưa có bộ từ.</p>
						<p className="mt-1">Bắt đầu bằng cách import từ (Excel hoặc AI Smart Import).</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{sets.slice(0, 3).map((set) => {
							const snapshot: SetLearningSnapshot = {
								introduced: set.introducedCount,
								mastered: set.masteredCount,
								total: set.itemCount,
								dueChannels: set.dueCount,
							};
							const progress = set.srsActive ? masteredSharePct(snapshot) : 0;
							const status = setStatusLabel(snapshot);
							return (
								<div
									key={set.id}
									className="card-paper group relative flex flex-col gap-2 overflow-hidden p-4"
								>
									<div className="absolute right-0 top-0 z-0 h-16 w-16 rounded-bl-full bg-surface-hover opacity-50 transition-transform group-hover:scale-110" />
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
												<span>{formatMasteredLabel(snapshot)}</span>
												<span className={`font-bold ${progress >= 100 ? 'text-success' : 'text-accent'}`}>
													{set.srsActive ? `${progress}%` : '—'}
												</span>
											</div>
											<ProgressBar
												value={progress}
												barClassName={progress >= 100 ? 'bg-success' : 'bg-accent'}
											/>
											{set.srsActive && (
												<p className="mt-1.5 text-xs text-muted">
													{formatIntroducedLabel(snapshot)}
													{' · '}
													{set.dueCount > 0 ? formatSetDueChannelsLabel(set.dueCount) : 'Không có kênh đến hạn'}
												</p>
											)}
										</div>
									</Link>
									<div className="relative z-10 flex flex-col gap-2 pt-2">
										<PracticeModePicker setId={set.id} variant="compact" />
										<Link href={`/sets/${set.id}`} className="btn-secondary w-full justify-center">
											<MaterialIcon name="list" size={16} />
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
