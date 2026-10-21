import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { getEnglishHome } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function EnglishHomePage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const home = await getEnglishHome(session.user.id);
	const entries = [
		{ href: '/english/learn', title: 'Học mới', detail: `${home.newWords} từ · ${home.newPatterns} mẫu`, description: 'Từ mới trước, mẫu câu dùng lại từ vừa học hoặc đã biết.' },
		{ href: '/english/review', title: 'Ôn hôm nay', detail: `${home.due} bài`, description: 'Từ và mẫu câu đến hạn nằm chung một phiên.' },
		{ href: '/english/weak', title: 'Luyện điểm yếu', detail: `${home.weak} kỹ năng`, description: 'Chỉ những kỹ năng đang ở trạng thái yếu.' },
	];
	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section>
				<p className="label-caps">Hôm nay</p>
				<h1 className="mt-2 text-3xl font-black text-foreground">Học tiếng Anh</h1>
			</section>
			{home.enrolledSets === 0 ? (
				<Card>
					<CardContent className="space-y-3">
						<p className="font-black text-foreground">Chưa theo bộ học nào</p>
						<p className="text-sm text-muted">Bản này dùng bộ nội dung admin đã duyệt. Chọn một bộ để bắt đầu.</p>
						<Link href="/english/sets" className="inline-flex font-bold text-accent">Xem bộ học</Link>
					</CardContent>
				</Card>
			) : (
				<section className="grid gap-3 md:grid-cols-3">
					{entries.map((entry) => (
						<Link key={entry.href} href={entry.href}>
							<Card interactive>
								<CardContent>
									<p className="label-caps">{entry.detail}</p>
									<p className="mt-2 text-xl font-black text-foreground">{entry.title}</p>
									<p className="mt-1 text-sm text-muted">{entry.description}</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</section>
			)}
		</div>
	);
}
