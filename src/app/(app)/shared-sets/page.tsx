import Link from 'next/link';
import { redirect } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import SharedSetCard from '@/app/(app)/shared-sets/SharedSetCard';
import SetInfoPopover from '@/app/(app)/sets/SetInfoPopover';
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
				<div className="mt-2 flex items-center gap-1">
					<h1 className="text-3xl font-black text-foreground">Chia sẻ bộ từ</h1>
					<SetInfoPopover title="Về thư viện chia sẻ" label="Thông tin chia sẻ bộ từ" align="right">
						<p>
							Bộ từ nhân bản sẽ thuộc về bạn hoàn toàn — có thể chỉnh sửa, bật SRS và luyện tập như bộ từ thường.
						</p>
						{isAdmin && (
							<div className="space-y-2">
								<p className="font-bold text-foreground">Cách chia sẻ một bộ từ</p>
								<ol className="list-decimal space-y-1 pl-5">
									<li>
										Vào{' '}
										<Link href="/sets" className="font-bold text-accent hover:underline">
											Bộ từ
										</Link>{' '}
										và mở bộ từ cần chia sẻ.
									</li>
									<li>
										Ở đầu trang chi tiết, bấm nút{' '}
										<strong className="text-foreground">Chia sẻ lên thư viện</strong>.
									</li>
									<li>Quay lại trang này — bộ từ sẽ hiển thị cho mọi người dùng.</li>
								</ol>
							</div>
						)}
					</SetInfoPopover>
				</div>
				<p className="mt-2 text-sm text-muted">
					Các bộ từ do admin chia sẻ. Nhân bản về tài khoản để học và quản lý riêng.
				</p>
			</section>

			{sets.length === 0 ? (
				<EmptyState
					title="Chưa có bộ từ chia sẻ"
					description={
						isAdmin
							? 'Chia sẻ một bộ từ từ mục Bộ từ để mọi người nhân bản.'
							: 'Admin sẽ đăng bộ từ lên thư viện — bạn có thể nhân bản về tài khoản.'
					}
					action={isAdmin ? { label: 'Đến Bộ từ', href: '/sets' } : undefined}
				/>
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
