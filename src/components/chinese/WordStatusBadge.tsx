import type { CnWordProgressState } from '@/types/chinese';

const LABELS: Record<CnWordProgressState, string> = {
	new: 'Mới',
	learning: 'Đang học',
	weak: 'Yếu',
	familiar: 'Quen',
	strong: 'Khá chắc',
	mastered: 'Đã nhớ',
};

const COLORS: Record<CnWordProgressState, string> = {
	new: 'bg-border text-foreground-secondary',
	learning: 'bg-accent-subtle text-accent',
	weak: 'bg-accent-subtle text-warning',
	familiar: 'bg-surface-container text-foreground-secondary',
	strong: 'bg-success/10 text-success',
	mastered: 'bg-gold/15 text-gold',
};

interface Props {
	state: CnWordProgressState | null;
}

export default function WordStatusBadge({ state }: Props) {
	if (!state) return <span className="text-xs text-muted">Chờ dữ liệu</span>;
	return (
		<span className={`label-caps inline-flex rounded-full px-2 py-0.5 ${COLORS[state]}`}>
			{LABELS[state]}
		</span>
	);
}
