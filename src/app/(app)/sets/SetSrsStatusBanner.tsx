import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	srsActive: boolean;
	/** manage panel — explain add/remove/move impact */
	variant?: 'study' | 'manage';
}

export default function SetSrsStatusBanner({ srsActive, variant = 'study' }: Props) {
	if (srsActive) {
		return (
			<div className="card-paper border-l-4 border-l-success p-4 text-sm text-foreground-secondary">
				<p className="flex items-start gap-2">
					<MaterialIcon name="schedule" size={18} className="mt-0.5 shrink-0 text-success" />
					<span>
						<strong className="text-foreground">Bộ này đang trong SRS</strong>
						{' — '}
						từ sẽ xuất hiện ở{' '}
						<Link href="/review" className="font-bold text-accent hover:underline">/review</Link>.
						{variant === 'manage' && (
							<>
								{' '}Thêm từ có dữ liệu sẽ tự vào hàng đợi ôn.
								Tắt SRS chỉ tạm dừng ôn — tiến độ được giữ.
								Xóa từ hoặc dùng &quot;Xóa tiến độ SRS&quot; mới xóa lịch ôn.
								Chuyển sang bộ SRS-active khác sẽ giữ tiến độ.
							</>
						)}
					</span>
				</p>
			</div>
		);
	}

	return (
		<div className="card-paper border-l-4 border-l-accent p-4 text-sm text-foreground-secondary">
			<p className="flex items-start gap-2">
				<MaterialIcon name="fitness_center" size={18} className="mt-0.5 shrink-0 text-muted" />
				<span>
					Bật <strong className="text-foreground">Ôn SRS</strong> bên dưới để đưa từ vào{' '}
					<Link href="/review" className="font-bold text-accent hover:underline">/review</Link>.
					Luyện tập giúp học tự do; lịch ôn SRS chỉ thay đổi ở mục Ôn tập.
				</span>
			</p>
		</div>
	);
}
