'use client';

import MaterialIcon from '@/components/ui/MaterialIcon';
import Link from 'next/link';

interface Props {
	wordId: string;
	simplified?: string;
}

export default function StickingPointCard({ wordId, simplified }: Props) {
	return (
		<div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-left">
			<p className="flex items-center gap-2 text-sm font-bold text-warning">
				<MaterialIcon name="lightbulb" size={18} />
				Bạn đang gặp khó ở từ này{simplified ? ` — ${simplified}` : ''}
			</p>
			<p className="mt-2 text-sm text-foreground-secondary">
				Thử cách học khác: xem thẻ từ hoặc luyện nghe trước khi ôn lại.
			</p>
			<div className="mt-3 flex flex-wrap gap-2">
				<Link href={`/words/${wordId}`} className="btn-secondary text-xs">
					Xem thẻ từ
				</Link>
			</div>
		</div>
	);
}
