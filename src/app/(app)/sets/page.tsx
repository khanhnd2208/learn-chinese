import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import SetCardActions from '@/app/(app)/sets/SetCardActions';
import SetSrsToggle from '@/app/(app)/sets/SetSrsToggle';
import SetSharePanel from '@/app/(app)/sets/SetSharePanel';
import SetInfoPopover from '@/app/(app)/sets/SetInfoPopover';
import PracticeModePicker from '@/components/chinese/PracticeModePicker';
import { auth } from '@/lib/auth';
import {
	formatIntroducedLabel,
	formatMasteredLabel,
	masteredSharePct,
	type SetLearningSnapshot,
	formatSetDueChannelsLabel,
} from '@/lib/chinese/setSrsProgress';
import { listUserSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

export default async function ChineseSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const sets = await listUserSets(session.user.id);
	const isAdmin = session.user.role === 'admin';

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<span className="label-caps tracking-widest">Bộ từ</span>
					<div className="mt-2 flex items-center gap-1">
						<h1 className="text-3xl font-black text-foreground">Danh sách bộ từ</h1>
						<SetInfoPopover title="Hướng dẫn bộ từ" label="Hướng dẫn bộ từ" align="right">
							<p>
								<strong className="text-foreground">Luyện tập</strong> giúp bạn học tự do trong từng bộ.{' '}
								<strong className="text-foreground">Lịch ôn SRS</strong> chỉ thay đổi khi bạn học ở mục{' '}
								<Link href="/review" className="font-bold text-accent hover:underline">Luyện SRS</Link>
								. Bật <strong className="text-foreground">Ôn SRS</strong> trên từng bộ để đưa từ vào hàng đợi.
							</p>
							{isAdmin && (
								<div className="space-y-2">
									<p className="font-bold text-foreground">Chia sẻ bộ từ (Admin)</p>
									<ol className="list-decimal space-y-1 pl-5">
										<li>Mở bộ từ bạn muốn chia sẻ (bấm <strong className="text-foreground">Xem từ</strong>).</li>
										<li>Ở đầu trang chi tiết, bấm <strong className="text-foreground">Chia sẻ lên thư viện</strong>.</li>
										<li>
											Người dùng sẽ thấy bộ từ tại sidebar →{' '}
											<Link href="/shared-sets" className="font-bold text-accent hover:underline">
												Chia sẻ bộ từ
											</Link>
											.
										</li>
									</ol>
								</div>
							)}
						</SetInfoPopover>
					</div>
				</div>
				<div className="hidden flex-wrap gap-2 md:flex">
					<Link href="/sets/import">
						<Button leftIcon={<MaterialIcon name="upload_file" size={16} />}>
							Import từ
						</Button>
					</Link>
				</div>
			</section>

			{sets.length === 0 ? (
				<EmptyState
					title="Chưa có bộ từ"
					description="Import từ sau buổi học để bắt đầu ôn SRS."
					action={{ label: 'Import từ', href: '/sets/import' }}
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sets.map((set) => {
						const snapshot: SetLearningSnapshot = {
							introduced: set.introducedCount,
							mastered: set.masteredCount,
							total: set.itemCount,
							dueChannels: set.dueCount,
						};
						const progress = set.srsActive ? masteredSharePct(snapshot) : 0;
						return (
							<Card key={set.id} className="group relative flex h-full flex-col gap-3 p-4">
								<div className="flex items-start justify-between gap-2">
									<Link href={`/sets/${set.id}`} className="min-w-0 flex-1">
										<h3 className="text-lg font-extrabold text-foreground transition-colors group-hover:text-accent">
											{set.title}
										</h3>
									</Link>
									<div className="hidden md:block">
										<SetCardActions set={set} />
									</div>
								</div>
								<p className="line-clamp-2 text-sm text-muted">{set.description || 'Không có mô tả'}</p>
								{isAdmin && (
									<SetSharePanel
										key={`${set.id}-${set.shared}`}
										setId={set.id}
										title={set.title}
										itemCount={set.itemCount}
										shared={set.shared}
										variant="card"
									/>
								)}
								<SetSrsToggle setId={set.id} srsActive={set.srsActive} title={set.title} compact />
								<div className="mt-auto">
									<div className="mb-1 flex justify-between gap-2 text-sm text-foreground-secondary">
										<span>
											{set.srsActive
												? `${formatMasteredLabel(snapshot)} · ${formatIntroducedLabel(snapshot)}`
												: `${set.itemCount} từ · không trong SRS`}
										</span>
									</div>
									{set.srsActive && (
										<p className="mb-1 text-xs text-muted">{formatSetDueChannelsLabel(set.dueCount)}</p>
									)}
									{set.srsActive && <ProgressBar value={progress} />}
								</div>
								<div className="flex flex-col gap-2 pt-1">
									<PracticeModePicker setId={set.id} variant="compact" />
									<Link href={`/sets/${set.id}`} className="btn-secondary w-full justify-center">
										<MaterialIcon name="list" size={16} />
										Xem từ
									</Link>
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
