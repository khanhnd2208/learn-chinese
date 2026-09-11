import MaterialIcon from './MaterialIcon';
import Button from './Button';
import { Card, CardContent } from './Card';

interface Props {
	title?: string;
	description?: string;
	onRetry?: () => void;
	onBack?: () => void;
	backLabel?: string;
}

export default function ErrorState({
	title = 'Đã xảy ra lỗi',
	description = 'Không thể tải dữ liệu. Vui lòng thử lại.',
	onRetry,
	onBack,
	backLabel = 'Quay lại',
}: Props) {
	return (
		<Card className="border-error/30 p-8 text-center">
			<CardContent className="flex flex-col items-center gap-4 p-0">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
					<MaterialIcon name="error_outline" size={28} />
				</div>
				<div>
					<p className="text-lg font-black text-foreground">{title}</p>
					<p className="mt-1 text-sm text-muted">{description}</p>
				</div>
				<div className="flex flex-wrap justify-center gap-3">
					{onRetry && (
						<Button onClick={onRetry} leftIcon={<MaterialIcon name="refresh" size={16} />}>
							Thử lại
						</Button>
					)}
					{onBack && (
						<Button variant="secondary" onClick={onBack}>
							{backLabel}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
