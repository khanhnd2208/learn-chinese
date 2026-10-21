import Link from 'next/link';
import { redirect } from 'next/navigation';
import SetCard, { type SetCardModel } from '@/components/chinese/SetCard';
import EmptyState from '@/components/ui/EmptyState';
import { auth } from '@/lib/auth';
import { listExploreSets, type ExploreSetCard } from '@/services/chinese/cnEnrollmentService';

export const dynamic = 'force-dynamic';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

function toCard(set: ExploreSetCard): SetCardModel {
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		level: set.level,
		itemCount: set.itemCount,
		sampleWords: set.sampleWords,
		enrolled: set.enrolled,
		legacy: false,
		srsActive: true,
		newCount: set.itemCount,
		learningCount: 0,
		masteredCount: 0,
		dueCount: 0,
	};
}

export default async function ExplorePage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; level?: string }>;
}) {
	const session = await auth();
	if (!session?.user) redirect('/login');

	const params = await searchParams;
	const level = params.level ? Number(params.level) : undefined;
	const sets = await listExploreSets(session.user.id, {
		q: params.q,
		level: level && Number.isInteger(level) ? level : undefined,
	});
	const showStarters = !level;
	const starters = showStarters ? sets.filter((set) => set.starter) : [];
	const rest = sets.filter((set) => !showStarters || !set.starter);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<header className="space-y-4">
				<div>
					<p className="label-caps">Khám phá</p>
					<h1 className="mt-2 text-3xl font-black text-foreground">Bộ từ đã xuất bản</h1>
				</div>
				<form className="flex flex-col gap-3 sm:flex-row" action="/explore">
					<input
						name="q"
						defaultValue={params.q ?? ''}
						placeholder="Tìm bộ từ"
						className="h-10 flex-1 rounded-control border border-border bg-surface px-3 text-sm"
					/>
					{level ? <input type="hidden" name="level" value={level} /> : null}
					<button type="submit" className="h-10 rounded-control bg-accent px-4 text-sm font-bold text-accent-foreground">
						Tìm
					</button>
				</form>
				<div className="flex flex-wrap gap-2">
					<Link
						href={params.q ? `/explore?q=${encodeURIComponent(params.q)}` : '/explore'}
						className={`rounded-pill px-3 py-1 text-xs font-bold ${!level ? 'bg-accent text-accent-foreground' : 'bg-surface-container text-foreground-secondary'}`}
					>
						Tất cả
					</Link>
					{LEVELS.map((item) => (
						<Link
							key={item}
							href={params.q ? `/explore?q=${encodeURIComponent(params.q)}&level=${item}` : `/explore?level=${item}`}
							className={`rounded-pill px-3 py-1 text-xs font-bold ${level === item ? 'bg-accent text-accent-foreground' : 'bg-surface-container text-foreground-secondary'}`}
						>
							HSK {item}
						</Link>
					))}
				</div>
			</header>

			{sets.length === 0 ? (
				<EmptyState
					icon="search"
					title="Không có bộ từ phù hợp"
					description="Thử từ khóa khác hoặc bỏ lọc trình độ."
				/>
			) : (
				<>
					{starters.length > 0 && (
						<section className="space-y-4">
							<h2 className="text-xl font-black text-foreground">Bắt đầu từ đây</h2>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								{starters.map((set) => <SetCard key={set.id} variant="explore" set={toCard(set)} />)}
							</div>
						</section>
					)}
					{rest.length > 0 && (
						<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{rest.map((set) => <SetCard key={set.id} variant="explore" set={toCard(set)} />)}
						</section>
					)}
				</>
			)}
		</div>
	);
}
