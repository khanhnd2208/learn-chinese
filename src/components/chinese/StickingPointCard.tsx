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
				Từ này khó với nhiều người{simplified ? ` — ${simplified}` : ''}
			</p>
			<p className="mt-2 text-sm text-foreground-secondary">
				Thử cách học khác: xem thẻ từ, phân tích chữ ở Hanzi Lab, hoặc luyện nghe trước khi ôn lại.
			</p>
			<div className="mt-3 flex flex-wrap gap-2">
				<Link href={`/words/${wordId}`} className="btn-secondary text-xs">
					Xem thẻ từ
				</Link>
				<Link href={`/hanzi-lab?term=${encodeURIComponent(simplified ?? '')}`} className="btn-secondary text-xs">
					Hanzi Lab
				</Link>
			</div>
		</div>
	);
}
