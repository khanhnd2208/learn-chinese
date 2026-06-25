'use client';

import type { CnReviewStateDistributionDTO } from '@/types/chinese';

interface Props {
	distribution: CnReviewStateDistributionDTO;
}

const BUCKETS = [
	{ key: 'new', label: 'Chưa gặp', color: 'bg-muted' },
	{ key: 'learning', label: 'Đang học', color: 'bg-accent/60' },
	{ key: 'familiar', label: 'Quen dần', color: 'bg-accent' },
	{ key: 'mastered', label: 'Thuần thục', color: 'bg-success' },
] as const;

function bucketCount(dist: CnReviewStateDistributionDTO, key: (typeof BUCKETS)[number]['key']): number {
	switch (key) {
		case 'new':
			return dist.new;
		case 'learning':
			return dist.learning + dist.weak;
		case 'familiar':
			return dist.familiar + dist.strong;
		case 'mastered':
			return dist.mastered;
	}
}

export default function WordPipelineBar({ distribution }: Props) {
	if (!distribution.total) {
		return <p className="text-sm text-muted">Chưa có từ nào trong SRS.</p>;
	}

	const buckets = BUCKETS.map((b) => ({
		...b,
		count: bucketCount(distribution, b.key),
	}));

	return (
		<div className="card-paper p-4 sm:p-6">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{buckets.map((bucket, i) => (
					<div key={bucket.key} className="relative flex flex-col items-center text-center">
						{i > 0 && (
							<span
								className="absolute -left-2 top-4 hidden text-muted sm:block"
								aria-hidden
							>
								→
							</span>
						)}
						<p className="text-2xl font-black text-foreground sm:text-3xl">{bucket.count}</p>
						<p className="mt-1 text-xs text-muted">{bucket.label}</p>
					</div>
				))}
			</div>
			<div className="mt-4 flex h-3 w-full overflow-hidden rounded-full border border-border/50">
				{buckets.map((bucket) => {
					if (!bucket.count) return null;
					const pct = (bucket.count / distribution.total) * 100;
					return (
						<div
							key={bucket.key}
							className={bucket.color}
							style={{ width: `${pct}%` }}
							title={`${bucket.label}: ${bucket.count}`}
						/>
					);
				})}
			</div>
			<p className="mt-3 text-center text-xs text-muted">
				{distribution.total} từ trong SRS
			</p>
		</div>
	);
}
