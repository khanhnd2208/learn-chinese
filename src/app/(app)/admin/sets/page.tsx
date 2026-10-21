import Link from 'next/link';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { listUserSets } from '@/services/chinese/cnSetService';

export const dynamic = 'force-dynamic';

export default async function AdminSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = await listUserSets(session.user.id);

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="label-caps">Quản trị</p>
					<h1 className="mt-2 text-3xl font-black text-foreground">Bộ từ</h1>
				</div>
				<Link href="/admin/sets/new">
					<Button>Tạo bộ từ</Button>
				</Link>
			</div>
			{sets.length === 0 ? (
				<EmptyState
					icon="library_books"
					title="Chưa có bộ từ"
					description="Tạo bộ từ bằng Excel hoặc AI Smart Import, rồi xuất bản để người học theo."
					action={{ label: 'Tạo bộ từ', href: '/admin/sets/new' }}
				/>
			) : (
				<div className="overflow-x-auto rounded-card border border-border bg-surface">
					<table className="w-full min-w-[640px] text-left text-sm">
						<thead className="border-b border-border text-xs uppercase text-muted">
							<tr>
								<th className="px-4 py-3 font-bold">Tên</th>
								<th className="px-4 py-3 font-bold">Số từ</th>
								<th className="px-4 py-3 font-bold">Trạng thái</th>
								<th className="px-4 py-3 font-bold">Người học</th>
								<th className="px-4 py-3 font-bold">Cập nhật</th>
							</tr>
						</thead>
						<tbody>
							{sets.map((set) => (
								<tr key={set.id} className="border-b border-border last:border-0">
									<td className="px-4 py-3 font-bold">
										<Link href={`/admin/sets/${set.id}`} className="hover:text-accent">{set.title}</Link>
									</td>
									<td className="px-4 py-3">{set.itemCount}</td>
									<td className="px-4 py-3">{set.shared ? 'Đã xuất bản' : 'Nháp'}</td>
									<td className="px-4 py-3">{set.learnerCount}</td>
									<td className="px-4 py-3">{new Date(set.updatedAt).toLocaleDateString('vi-VN')}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
