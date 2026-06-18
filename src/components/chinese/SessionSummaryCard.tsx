'use client';

import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnPracticeSessionResultDTO } from '@/types/chinese';

interface Props {
	summary: CnPracticeSessionResultDTO;
	dueRemaining?: number;
	title?: string;
	subtitle?: string;
	primaryHref?: string;
	primaryLabel?: string;
	onPrimaryAction?: () => void;
	secondaryLinks?: Array<{ href: string; label: string; icon: string }>;
}

export default function SessionSummaryCard({
	summary,
	dueRemaining,
	title = 'Đã lưu tiến độ',
	subtitle,
	primaryHref = '/review',
	primaryLabel = 'Ôn tiếp',
	onPrimaryAction,
	secondaryLinks = [
		{ href: '/review/stats', label: 'Xem tiến độ', icon: 'query_stats' },
		{ href: '/', label: 'Trang chủ', icon: 'home' },
	],
}: Props) {
	const accuracy = summary.total > 0
		? Math.round((summary.correct / summary.total) * 100)
		: 0;

	return (
		<div className="mx-auto max-w-2xl px-4 py-12">
			<div className="card-paper p-8 text-center">
				<MaterialIcon name="check_circle" className="mx-auto text-success" size={48} />
				<h1 className="mt-4 text-3xl font-black text-foreground">{title}</h1>
				{subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
				<p className="mt-4 text-4xl font-black">
					<span className="text-success">{summary.correct}</span>
					<span className="text-muted"> / {summary.total}</span>
				</p>
				<p className="mt-1 text-sm text-muted">{accuracy}% đúng · {summary.total} câu đã lưu</p>
				{dueRemaining !== undefined && dueRemaining > 0 && (
					<p className="mt-3 text-sm text-foreground-secondary">
						Còn khoảng <span className="font-bold text-accent">{dueRemaining}</span> mục cần ôn
					</p>
				)}
				{dueRemaining === 0 && (
					<p className="mt-3 text-sm text-success">Không còn mục đến hạn — nghỉ ngơi nhé!</p>
				)}
				{summary.weakWords.length > 0 && (
					<p className="mt-2 text-sm text-warning">{summary.weakWords.length} từ vẫn cần ôn thêm.</p>
				)}
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					{onPrimaryAction ? (
						<button type="button" onClick={onPrimaryAction} className="btn-primary">
							<MaterialIcon name="refresh" size={16} />
							{primaryLabel}
						</button>
					) : (
						<Link href={primaryHref} className="btn-primary">
							<MaterialIcon name="refresh" size={16} />
							{primaryLabel}
						</Link>
					)}
					{secondaryLinks.map((link) => (
						<Link key={link.href} href={link.href} className="btn-secondary">
							<MaterialIcon name={link.icon} size={16} />
							{link.label}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
