import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnWordCardDTO } from '@/types/chinese';

const CHANNEL_LABELS: Record<string, string> = {
	meaning: 'Nghĩa',
	listening: 'Nghe',
	pinyin: 'Pinyin',
	sentence: 'Câu',
	hanzi: 'Chữ Hán',
};

const MASTERY_COLORS: Record<string, string> = {
	not_practiced: 'text-muted',
	weak: 'text-warning',
	ok: 'text-foreground-secondary',
	good: 'text-success',
};

const STATE_LABEL: Record<string, string> = {
	new: 'Mới',
	learning: 'Đang học',
	weak: 'Yếu',
	familiar: 'Quen',
	strong: 'Khá chắc',
	mastered: 'Đã nhớ',
};

export default function ChannelMasteryPanel({ word }: { word: CnWordCardDTO }) {
	if (!word.channelMastery?.length) return null;

	return (
		<article className="rounded-lg border border-border bg-surface p-4">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
				<MaterialIcon name="insights" className="text-accent" size={18} />
				Tiến độ theo kỹ năng
			</h3>
			{word.progress && (
				<p className="mb-3 text-sm text-foreground-secondary">
					Tổng thể: <span className="font-bold text-foreground">{STATE_LABEL[word.progress.state] ?? word.progress.state}</span>
				</p>
			)}
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{word.channelMastery.map((ch) => (
					<div key={ch.channel} className="rounded-lg border border-border/60 bg-background px-3 py-2">
						<p className="label-caps text-muted">{CHANNEL_LABELS[ch.channel]}</p>
						<p className={`text-sm font-bold ${MASTERY_COLORS[ch.level]}`}>{ch.label}</p>
						{ch.total > 0 && <p className="text-xs text-muted">{ch.rate}%</p>}
					</div>
				))}
			</div>
		</article>
	);
}
