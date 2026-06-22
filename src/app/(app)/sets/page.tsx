import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import SetCardActions from '@/app/(app)/sets/SetCardActions';
import SetSrsToggle from '@/app/(app)/sets/SetSrsToggle';
import { auth } from '@/lib/auth';
import {
	computeSetChannelProgress,
	formatSetDueChannelsLabel,
} from '@/lib/chinese/setSrsProgress';
import { listUserSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

export default async function ChineseSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const sets = await listUserSets(session.user.id);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<span className="label-caps tracking-widest">Bộ từ</span>
					<h1 className="mt-2 text-3xl font-black text-foreground">Danh sách bộ từ</h1>
				</div>
				<div className="hidden flex-wrap gap-2 md:flex">
					<Link href="/sets/import" className="btn-secondary">
						<MaterialIcon name="upload_file" size={16} />
						Thêm bộ từ
					</Link>
					<Link href="/sets/create" className="btn-primary">
						<MaterialIcon name="add" size={16} />
						Tạo mới
					</Link>
				</div>
			</section>

			<div className="card-paper border-l-4 border-l-accent p-4 text-sm text-foreground-secondary">
				<p>
					<strong className="text-foreground">Luyện tập</strong> giúp bạn học tự do trong từng bộ.
					<strong className="text-foreground"> Lịch ôn SRS</strong> chỉ thay đổi khi bạn học ở mục{' '}
					<Link href="/review" className="font-bold text-accent hover:underline">Ôn tập</Link>.
					Bật <strong className="text-foreground">Ôn SRS</strong> trên từng bộ để đưa từ vào hàng đợi.
				</p>
			</div>

			{sets.length === 0 ? (
				<div className="text-sm text-muted">
					<p>Chưa có bộ từ nào.</p>
					<p className="mt-1 md:hidden">Tạo bộ từ trên máy tính sau buổi học.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sets.map((set) => {
						const progress = set.srsActive
							? computeSetChannelProgress(set.itemCount, set.dueCount)
							: 0;
						return (
							<div key={set.id} className="card-paper group relative flex flex-col gap-2 overflow-hidden p-4">
								<div className="flex items-start justify-between gap-2">
									<Link href={`/sets/${set.id}`} className="flex-1">
										<h3 className="text-lg font-extrabold text-foreground transition-colors group-hover:text-accent">
											{set.title}
										</h3>
									</Link>
									<div className="hidden md:block">
										<SetCardActions set={set} />
									</div>
								</div>
								<div className="flex flex-1 flex-col gap-2">
									<p className="text-sm text-muted">{set.description || 'Không có mô tả'}</p>
									<SetSrsToggle setId={set.id} srsActive={set.srsActive} title={set.title} compact />
									<div className="mt-auto pt-2">
										<div className="mb-1 flex justify-between text-sm text-foreground-secondary">
											<span>
												{set.itemCount} từ
												{set.srsActive
													? ` · ${formatSetDueChannelsLabel(set.dueCount)}`
													: ' · không trong SRS'}
											</span>
											{set.srsActive && (
												<span className="font-bold text-accent">{progress}%</span>
											)}
										</div>
										{set.srsActive && <ProgressBar value={progress} />}
									</div>
								</div>
								<div className="flex gap-2 pt-2">
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
		</div>
	);
}
