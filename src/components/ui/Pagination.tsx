import { cn } from '@/lib/cn';
import Button from './Button';
import MaterialIcon from './MaterialIcon';

interface Props {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	className?: string;
}

export default function Pagination({ page, totalPages, onPageChange, className }: Props) {
	if (totalPages <= 1) return null;

	return (
		<nav aria-label="Phân trang" className={cn('flex items-center justify-center gap-2', className)}>
			<Button
				variant="secondary"
				size="sm"
				disabled={page <= 1}
				onClick={() => onPageChange(page - 1)}
				aria-label="Trang trước"
				leftIcon={<MaterialIcon name="chevron_left" size={16} />}
			>
				Trước
			</Button>
			<span className="px-2 text-sm text-muted">
				{page} / {totalPages}
			</span>
			<Button
				variant="secondary"
				size="sm"
				disabled={page >= totalPages}
				onClick={() => onPageChange(page + 1)}
				aria-label="Trang sau"
				rightIcon={<MaterialIcon name="chevron_right" size={16} />}
			>
				Sau
			</Button>
		</nav>
	);
}
