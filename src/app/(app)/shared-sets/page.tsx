import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SharedSetCard from '@/app/(app)/shared-sets/SharedSetCard';
import { auth } from '@/lib/auth';
import { listSharedSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

export default async function SharedSetsPage() {
	const [session, sets] = await Promise.all([auth(), listSharedSets()]);
	if (!session?.user) redirect('/login');
	const isAdmin = session.user.role === 'admin';

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<span className="label-caps tracking-widest">Thư viện</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Chia sẻ bộ từ</h1>
				<p className="mt-2 text-sm text-muted">
					Các bộ từ do admin chia sẻ. Nhân bản về tài khoản để học và quản lý riêng.
				</p>
			</section>

			<div className="card-paper border-l-4 border-l-accent p-4 text-sm text-foreground-secondary">
				<p className="flex items-start gap-2">
					<MaterialIcon name="info" size={18} className="mt-0.5 shrink-0 text-accent" />
					<span>
						Bộ từ nhân bản sẽ thuộc về bạn hoàn toàn — có thể chỉnh sửa, bật SRS và luyện tập như bộ từ thường.
					</span>
				</p>
			</div>

			{isAdmin && sets.length === 0 && (
				<div className="card-paper space-y-3 border-l-4 border-l-accent p-5 text-sm">
					<p className="flex items-center gap-2 font-bold text-foreground">
						<MaterialIcon name="admin_panel_settings" size={18} className="text-accent" />
						Chưa có bộ từ nào được chia sẻ
					</p>
					<ol className="list-decimal space-y-2 pl-5 text-foreground-secondary">
						<li>
							Vào <Link href="/sets" className="font-bold text-accent hover:underline">Bộ từ</Link> và mở bộ từ cần chia sẻ.
						</li>
						<li>Ở đầu trang chi tiết, bấm nút <strong className="text-foreground">Chia sẻ lên thư viện</strong>.</li>
						<li>Quay lại trang này — bộ từ sẽ hiển thị cho mọi người dùng.</li>
					</ol>
				</div>
			)}

			{sets.length === 0 ? (
				!isAdmin && (
					<div className="text-sm text-muted">
						<p>Chưa có bộ từ nào được chia sẻ.</p>
					</div>
				)
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sets.map((set) => (
						<SharedSetCard key={set.id} set={set} />
					))}
				</div>
			)}
		</div>
	);
}
