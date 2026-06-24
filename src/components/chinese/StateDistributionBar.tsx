'use client';

import type { CnReviewStateDistributionDTO } from '@/types/chinese';
import { wordLevelName } from '@/lib/chinese/questionLabels';

interface Props {
	distribution: CnReviewStateDistributionDTO;
	maturePct: number;
	/** Collapse legend into Thành thạo / Đang học / Yếu buckets */
	simplifiedLegend?: boolean;
}

const SEGMENTS: Array<{
	key: keyof Omit<CnReviewStateDistributionDTO, 'total'>;
	label: string;
	className: string;
	simplifiedGroup: 'mature' | 'learning' | 'weak';
}> = [
	{ key: 'new', label: wordLevelName('new'), className: 'bg-muted', simplifiedGroup: 'learning' },
	{ key: 'learning', label: wordLevelName('learning'), className: 'bg-accent/40', simplifiedGroup: 'learning' },
	{ key: 'weak', label: wordLevelName('weak'), className: 'bg-warning/70', simplifiedGroup: 'weak' },
	{ key: 'familiar', label: wordLevelName('familiar'), className: 'bg-accent/70', simplifiedGroup: 'learning' },
	{ key: 'strong', label: wordLevelName('strong'), className: 'bg-success/60', simplifiedGroup: 'mature' },
	{ key: 'mastered', label: wordLevelName('mastered'), className: 'bg-success', simplifiedGroup: 'mature' },
];

export default function StateDistributionBar({ distribution, maturePct, simplifiedLegend = false }: Props) {
	if (!distribution.total) {
		return (
			<p className="text-sm text-muted">Chưa có từ nào trong SRS.</p>
		);
	}

	if (simplifiedLegend) {
		const mature = distribution.strong + distribution.mastered;
		const learning = distribution.new + distribution.learning + distribution.familiar;
		const weak = distribution.weak;
		const total = distribution.total;
		const maturePctBar = (mature / total) * 100;
		const learningPctBar = (learning / total) * 100;
		const weakPctBar = (weak / total) * 100;

		return (
			<div className="card-paper p-4">
				<div className="flex h-3 w-full overflow-hidden rounded-full border border-border/50">
					{mature > 0 && (
						<div className="bg-success" style={{ width: `${maturePctBar}%` }} title={`Thành thạo: ${mature}`} />
					)}
					{learning > 0 && (
						<div className="bg-gold/80" style={{ width: `${learningPctBar}%` }} title={`Đang học: ${learning}`} />
					)}
					{weak > 0 && (
						<div className="bg-warning/80" style={{ width: `${weakPctBar}%` }} title={`Yếu: ${weak}`} />
					)}
				</div>
				<div className="mt-3 flex flex-wrap justify-between gap-2 px-1">
					<LegendDot colorClass="bg-success" label={`THÀNH THẠO (${Math.round(maturePctBar)}%)`} />
					<LegendDot colorClass="bg-gold/80" label={`ĐANG HỌC (${Math.round(learningPctBar)}%)`} />
					<LegendDot colorClass="bg-warning/80" label={`YẾU (${Math.round(weakPctBar)}%)`} />
				</div>
				<p className="mt-3 text-sm text-foreground-secondary">
					<span className="font-black text-accent">{maturePct}%</span> từ đã trưởng thành (kênh ở giai đoạn duy trì)
				</p>
			</div>
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

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5 label-caps !text-[10px] text-muted">
			<span className={`h-2 w-2 rounded-full ${colorClass}`} />
			{label}
		</span>
	);
}
