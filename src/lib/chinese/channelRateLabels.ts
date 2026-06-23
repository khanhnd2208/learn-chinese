/** Qualitative label for channel accuracy rate (learner-facing). */
export function channelRateQualitative(rate: number): {
	label: string;
	className: string;
	barClassName: string;
} {
	if (rate >= 80) {
		return { label: 'Tốt', className: 'text-success', barClassName: 'bg-success' };
	}
	if (rate >= 60) {
		return { label: 'Trung bình', className: 'text-warning', barClassName: 'bg-warning' };
	}
	if (rate > 0) {
		return { label: 'Yếu', className: 'text-accent', barClassName: 'bg-accent' };
	}
	return { label: '—', className: 'text-muted', barClassName: 'bg-muted/30' };
}
