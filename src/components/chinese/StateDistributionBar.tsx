'use client';

import type { CnReviewStateDistributionDTO } from '@/types/chinese';

interface Props {
	distribution: CnReviewStateDistributionDTO;
	maturePct: number;
}

const SEGMENTS: Array<{
	key: keyof Omit<CnReviewStateDistributionDTO, 'total'>;
	label: string;
	className: string;
}> = [
	{ key: 'new', label: 'Mới', className: 'bg-muted' },
	{ key: 'learning', label: 'Đang học', className: 'bg-accent/40' },
	{ key: 'weak', label: 'Yếu', className: 'bg-warning/70' },
	{ key: 'familiar', label: 'Quen', className: 'bg-accent/70' },
	{ key: 'strong', label: 'Vững', className: 'bg-success/60' },
	{ key: 'mastered', label: 'Thuần thục', className: 'bg-success' },
];

export default function StateDistributionBar({ distribution, maturePct }: Props) {
	if (!distribution.total) {
		return (
			<p className="text-sm text-muted">Chưa có từ nào trong SRS.</p>
		);
	}

	return (
		<div className="card-paper p-4">
			<div className="flex h-3 w-full overflow-hidden rounded-full border border-border/50">
				{SEGMENTS.map((seg) => {
					const count = distribution[seg.key];
					if (!count) return null;
					const pct = (count / distribution.total) * 100;
					return (
						<div
							key={seg.key}
							className={seg.className}
							style={{ width: `${pct}%` }}
							title={`${seg.label}: ${count}`}
						/>
					);
				})}
			</div>
			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
				{SEGMENTS.map((seg) => (
					<span key={seg.key} className="flex items-center gap-1.5 text-xs text-muted">
						<span className={`h-2 w-2 rounded-full ${seg.className}`} />
						{seg.label}: <span className="font-bold text-foreground">{distribution[seg.key]}</span>
					</span>
				))}
			</div>
			<p className="mt-3 text-sm text-foreground-secondary">
				<span className="font-black text-accent">{maturePct}%</span> từ đã trưởng thành (kênh ở giai đoạn duy trì)
			</p>
		</div>
	);
}
