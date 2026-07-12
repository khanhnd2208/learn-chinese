'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import TuVungPasteWizard from '@/app/(app)/sets/import/TuVungPasteWizard';

interface Props {
	setId: string;
	setTitle: string;
}

export default function SetAddWordsPanel({ setId, setTitle }: Props) {
	const router = useRouter();
	const [expanded, setExpanded] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);

	const handlePublished = (count: number) => {
		setSuccess(`Đã thêm ${count} từ vào bộ "${setTitle}"`);
		setExpanded(false);
		router.refresh();
	};

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-extrabold text-foreground">Thêm từ vào bộ</h2>
					<p className="mt-1 text-xs text-muted">
						Bắt buộc đủ trường như import mới — dùng AI copy-paste TSV.
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setExpanded(!expanded);
						setSuccess(null);
					}}
					className="btn-secondary shrink-0"
				>
					<MaterialIcon name={expanded ? 'close' : 'add'} size={16} />
					{expanded ? 'Đóng' : 'Thêm từ'}
				</button>
			</div>

			{success && (
				<p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground-secondary">
					{success}
				</p>
			)}

			{expanded && (
				<div className="card-paper p-4 md:p-6">
					<TuVungPasteWizard
						variant="existing-set"
						setId={setId}
						setTitle={setTitle}
						compact
						onPublished={handlePublished}
					/>
				</div>
			)}
		</section>
	);
}
