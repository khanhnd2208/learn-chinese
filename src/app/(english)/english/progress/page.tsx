import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { getEnglishProgress } from '@/services/english/enCatalogService';

export const dynamic = 'force-dynamic';

export default async function EnglishProgressPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');
	const progress = await getEnglishProgress(session.user.id);
	if (progress.words.length === 0 && progress.patterns.length === 0) {
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState icon="trending_up" title="Chưa có tiến độ" description="Theo một bộ học rồi học từ đầu tiên." action={{ label: 'Bộ học', href: '/english/sets' }} />
			</div>
		);
	}
	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
			<h1 className="text-3xl font-black text-foreground">Tiến độ tiếng Anh</h1>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Từ</h2>
				{progress.words.map((word) => (
					<Card key={word.senseId}>
						<CardContent className="space-y-3">
							<div className="flex items-baseline justify-between gap-3">
								<p className="text-2xl font-black">{word.lemma}</p>
								<p className="text-sm text-muted">{word.mastered ? 'Đã nắm' : word.meaningVi}</p>
							</div>
							<ul className="grid gap-2 sm:grid-cols-3">
								{word.skills.map((skill) => (
									<li key={skill.skill} className="rounded-control bg-surface-container p-3">
										<p className="text-xs text-muted">{skill.label}</p>
										<p className="font-bold">{skill.open ? skill.stage : 'Chưa mở'}</p>
									</li>
								))}
							</ul>
							<p className="text-xs text-muted">
								Câu điền không nghe audio: {word.contexts}/2
								{word.longGap ? ' · Đã có lần nhớ lại sau ít nhất 7 ngày' : ' · Chưa có lần nhớ lại sau 7 ngày'}
							</p>
						</CardContent>
					</Card>
				))}
			</section>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Mẫu câu</h2>
				{progress.patterns.map((pattern) => (
					<Card key={pattern.patternId}>
						<CardContent>
							<p className="font-black">{pattern.frame}</p>
							<p className="text-sm text-muted">{pattern.purposeVi}</p>
							<p className="mt-2 text-xs text-muted">
								{pattern.stage} · {pattern.examples} bộ thành phần · {pattern.days} ngày
								{pattern.mastered ? ' · Đã nắm' : ''}
							</p>
						</CardContent>
					</Card>
				))}
			</section>
		</div>
	);
}
