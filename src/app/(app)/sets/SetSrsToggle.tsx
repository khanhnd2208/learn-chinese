'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	setId: string;
	srsActive: boolean;
	title: string;
	compact?: boolean;
	onChanged?: (active: boolean) => void;
}

export default function SetSrsToggle({ setId, srsActive, compact, onChanged }: Props) {
	const router = useRouter();
	const [active, setActive] = useState(srsActive);
	const [loading, setLoading] = useState(false);

	const applyToggle = async (next: boolean) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/sets/${setId}/srs`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: next }),
			});
			const json = await res.json() as {
				ok: boolean;
				error?: string;
				data?: { srsActive: boolean };
			};
			if (!json.ok) throw new Error(json.error ?? 'Không cập nhật được');
			setActive(json.data!.srsActive);
			onChanged?.(json.data!.srsActive);
			router.refresh();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<label className={`flex cursor-pointer items-center gap-2 ${compact ? '' : 'rounded-lg border border-border p-3'}`}>
			<input
				type="checkbox"
				checked={active}
				disabled={loading}
				onChange={(e) => { void applyToggle(e.target.checked); }}
				className="h-4 w-4 accent-accent"
			/>
			<span className="text-sm font-bold text-foreground-secondary">
				{active ? (
					<span className="inline-flex items-center gap-1 text-success">
						<MaterialIcon name="schedule" size={16} />
						Đang ôn SRS
					</span>
				) : (
					<span className="inline-flex items-center gap-1 text-muted">
						<MaterialIcon name="fitness_center" size={16} />
						Chỉ luyện tập
					</span>
				)}
			</span>
		</label>
	);
}

export async function confirmDeleteSrsSet(
	setId: string,
	title: string,
	srsActive: boolean,
): Promise<boolean> {
	if (!srsActive) {
		return confirm(`Xóa bộ từ "${title}"?`);
	}
	try {
		const res = await fetch(`/api/sets/${setId}/srs?preview=deactivate`);
		const json = await res.json() as {
			ok: boolean;
			data?: { exclusiveWordCount: number; wouldLoseProgress: boolean };
		};
		if (!json.ok || !json.data) return confirm(`Xóa bộ từ "${title}"?`);
		if (!json.data.wouldLoseProgress) {
			return confirm(`Xóa bộ từ "${title}"?`);
		}
		return confirm(
			`Bộ "${title}" đang trong SRS.\n\n`
			+ `Xóa sẽ mất tiến độ ôn của ${json.data.exclusiveWordCount} từ `
			+ 'không còn trong bộ SRS nào khác.\n\n'
			+ 'Lịch sử luyện tập vẫn được giữ.\n\n'
			+ 'Tiếp tục xóa?',
		);
	} catch {
		return confirm(`Xóa bộ từ "${title}"?`);
	}
}
