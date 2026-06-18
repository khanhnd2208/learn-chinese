import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import ProgressBar from '@/components/ui/ProgressBar';
import SetCardActions from '@/app/(app)/sets/SetCardActions';
import SetExcelActions from '@/app/(app)/sets/SetExcelActions';
import { auth } from '@/lib/auth';
import { listUserSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

export default async function ChineseSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const sets = await listUserSets(session.user.id);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="flex items-end justify-between">
				<div>
					<span className="label-caps tracking-widest">Bộ từ</span>
					<h1 className="mt-2 text-3xl font-black text-foreground">Danh sách bộ từ</h1>
				</div>
				<Link href="/sets/create" className="btn-primary hidden md:inline-flex">
					<MaterialIcon name="add" size={16} />
					Tạo mới
				</Link>
			</section>

			<div className="hidden md:block">
				<SetExcelActions />
			</div>

			{sets.length === 0 ? (
				<div className="text-sm text-muted">
					<p>Chưa có bộ từ nào.</p>
					<p className="mt-1 md:hidden">Tạo bộ từ trên máy tính sau buổi học.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sets.map((set) => {
						const progress = set.itemCount > 0
							? Math.round(((set.itemCount - set.dueCount) / set.itemCount) * 100)
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
									<div className="mt-auto pt-2">
										<div className="mb-1 flex justify-between text-sm text-foreground-secondary">
											<span>{set.itemCount} từ · {set.dueCount} cần ôn</span>
											<span className="font-bold text-accent">{progress}%</span>
										</div>
										<ProgressBar value={progress} />
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
