"use client";

import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import PracticeModePicker from '@/components/chinese/PracticeModePicker';
import SetSrsToggle from '@/app/(app)/sets/SetSrsToggle';
import SetSrsStatusBanner from '@/app/(app)/sets/SetSrsStatusBanner';
import type { CnWordSetDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
}

export default function SetStudyPanel({ set }: Props) {
	const hasResolvedWords = set.items.some((item) => item.wordId);

	return (
		<div className="space-y-6">
			<section>
				<h1 className="text-3xl font-black text-foreground">{set.title}</h1>
				{set.description && <p className="mt-1 text-sm text-muted">{set.description}</p>}
				<p className="mt-2 text-sm text-muted">
					{set.itemCount} từ
					{set.srsActive && ` · ${set.dueCount} cần ôn · ${set.weakCount} cần chú ý`}
				</p>

				<div className="mt-4 space-y-3">
					<SetSrsStatusBanner srsActive={set.srsActive} />

					<div className="rounded-lg border border-border bg-surface-container/50 p-4">
						<SetSrsToggle setId={set.id} srsActive={set.srsActive} title={set.title} />
						{!set.srsActive && hasResolvedWords && set.itemCount > 0 && (
							<p className="mt-2 text-xs text-muted">
								Bật ôn SRS để {set.items.filter((i) => i.wordId).length} từ có dữ liệu vào hàng đợi /review.
							</p>
						)}
					</div>
				</div>

				{set.srsActive && set.dueCount > 0 && (
					<div className="mt-3">
						<Link href="/review" className="btn-primary w-full justify-center sm:w-auto">
							<MaterialIcon name="school" size={16} />
							Luyện SRS ({set.dueCount} mục)
						</Link>
					</div>
				)}

				{hasResolvedWords && set.itemCount > 0 ? (
					<div className="mt-6">
						<h2 className="mb-3 text-sm font-bold text-foreground">Luyện tập</h2>
						<p className="mb-3 text-xs text-muted">
							Tổng hợp xen 3 kênh theo tiến độ SRS, hoặc Chỉ MCQ (trắc nghiệm). Không ảnh hưởng lịch ôn.
						</p>
						<PracticeModePicker setId={set.id} />
					</div>
				) : (
					<p className="mt-4 text-sm text-muted">Thêm từ có dữ liệu để bắt đầu luyện tập.</p>
				)}
			</section>
		</div>
	);
}
