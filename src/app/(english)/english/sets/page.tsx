import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import EnrollButton from '@/components/english/EnrollButton';
import { auth } from '@/lib/auth';
import { listEnglishSets } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function EnglishSetsPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const sets = await listEnglishSets(session.user.id, session.user.role === 'admin');
	if (sets.length === 0) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState icon="library_books" title="Chưa có bộ học" description="Admin cần nhập và xuất bản nội dung trước." />
			</div>
		);
	}
	return (
		<div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
			<h1 className="text-3xl font-black text-foreground">Bộ học</h1>
			<ul className="space-y-3">
				{sets.map((set) => (
					<li key={set.id}>
						<Card>
							<CardContent className="flex items-start justify-between gap-4">
								<div>
									<p className="font-black text-foreground">{set.title}</p>
									<p className="text-sm text-muted">{set.description}</p>
									<p className="mt-2 text-xs text-muted">{set.words} từ · {set.patterns} mẫu · {set.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</p>
								</div>
								{set.status === 'published' && <EnrollButton setId={set.id} enrolled={set.enrolled} />}
							</CardContent>
						</Card>
					</li>
				))}
			</ul>
		</div>
	);
}
