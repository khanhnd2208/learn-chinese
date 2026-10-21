'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import MaterialIcon from '@/components/ui/MaterialIcon';
import Sheet from '@/components/ui/Sheet';
import SmartStudyButton from '@/components/chinese/SmartStudyButton';

export interface SetCardModel {
	id: string;
	title: string;
	description?: string;
	level: number | null;
	itemCount: number;
	sampleWords?: string[];
	enrolled: boolean;
	legacy: boolean;
	srsActive: boolean;
	newCount: number;
	learningCount: number;
	masteredCount: number;
	dueCount: number;
}

interface Props {
	variant: 'explore' | 'library' | 'home';
	set: SetCardModel;
}

function SegmentBar({ set }: { set: SetCardModel }) {
	const total = Math.max(1, set.newCount + set.learningCount + set.masteredCount);
	const parts = [
		{ count: set.newCount, className: 'bg-border' },
		{ count: set.learningCount, className: 'bg-warning' },
		{ count: set.masteredCount, className: 'bg-success' },
	];
	return (
		<div className="flex h-2 overflow-hidden rounded-full bg-surface-container">
			{parts.map((part) => (
				<div
					key={part.className}
					className={part.className}
					style={{ width: `${(part.count / total) * 100}%` }}
				/>
			))}
		</div>
	);
}

function LibraryMenu({ set }: { set: SetCardModel }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [mobile, setMobile] = useState(false);
	const [confirmLeave, setConfirmLeave] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const media = window.matchMedia('(max-width: 767px)');
		const apply = () => setMobile(media.matches);
		apply();
		media.addEventListener('change', apply);
		return () => media.removeEventListener('change', apply);
	}, []);

	async function patchReview(srsActive: boolean) {
		setBusy(true);
		await fetch(`/api/library/${set.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ srsActive }),
		});
		setBusy(false);
		setOpen(false);
		router.refresh();
	}

	async function unfollow() {
		setBusy(true);
		await fetch(`/api/library/${set.id}`, { method: 'DELETE' });
		setBusy(false);
		setConfirmLeave(false);
		router.refresh();
	}

	async function deleteLegacy() {
		setBusy(true);
		await fetch(`/api/sets/${set.id}`, { method: 'DELETE' });
		setBusy(false);
		setConfirmDelete(false);
		router.refresh();
	}

	const items = (
		<div className="flex flex-col gap-1">
			<button
				type="button"
				className="rounded-control px-3 py-2 text-left text-sm font-bold hover:bg-surface-hover"
				disabled={busy}
				onClick={() => void patchReview(!set.srsActive)}
			>
				{set.srsActive ? 'Tạm dừng ôn tập' : 'Tiếp tục ôn'}
			</button>
			<button
				type="button"
				className="rounded-control px-3 py-2 text-left text-sm font-bold hover:bg-surface-hover"
				onClick={() => {
					setOpen(false);
					setConfirmLeave(true);
				}}
			>
				Bỏ theo học
			</button>
			{set.legacy && (
				<button
					type="button"
					className="rounded-control px-3 py-2 text-left text-sm font-bold text-error hover:bg-surface-hover"
					onClick={() => {
						setOpen(false);
						setConfirmDelete(true);
					}}
				>
					Xóa bộ cũ
				</button>
			)}
		</div>
	);

	return (
		<>
			<Button variant="ghost" aria-label="Thêm thao tác" onClick={() => setOpen((value) => !value)}>
				⋯
			</Button>
			{mobile ? (
				<Sheet open={open} onClose={() => setOpen(false)} title={set.title}>
					{items}
				</Sheet>
			) : open && (
				<div className="absolute right-0 top-10 z-dropdown min-w-48 rounded-card border border-border bg-surface p-2 shadow-overlay">
					{items}
				</div>
			)}
			<Dialog
				open={confirmLeave}
				onClose={() => setConfirmLeave(false)}
				title="Bỏ theo học"
				description="Tiến độ từng từ được giữ. Bạn có thể theo học lại và ôn tiếp từ chỗ đang dừng."
			>
				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={() => setConfirmLeave(false)}>Ở lại</Button>
					<Button loading={busy} onClick={() => void unfollow()}>Bỏ theo học</Button>
				</div>
			</Dialog>
			<Dialog
				open={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				title="Xóa bộ cũ"
				description="Bộ này chỉ còn trên tài khoản của bạn. Xóa bộ không xóa tiến độ các từ đã học."
			>
				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={() => setConfirmDelete(false)}>Giữ lại</Button>
					<Button variant="destructive" loading={busy} onClick={() => void deleteLegacy()}>Xóa</Button>
				</div>
			</Dialog>
		</>
	);
}

export default function SetCard({ variant, set }: Props) {
	const href = `/sets/${set.id}`;

	if (variant === 'explore') {
		return (
			<Card interactive className="flex h-full flex-col">
				<Link href={href} className="flex-1">
					<CardContent className="space-y-3">
						<div className="flex items-start justify-between gap-2">
							<h3 className="text-lg font-black text-foreground">{set.title}</h3>
							{set.level != null && <Badge>HSK {set.level}</Badge>}
						</div>
						<p className="text-sm text-muted">{set.itemCount} từ</p>
						{set.sampleWords && set.sampleWords.length > 0 && (
							<p className="hanzi-lg text-foreground">{set.sampleWords.join('  ')}</p>
						)}
					</CardContent>
				</Link>
				<CardContent className="pt-0">
					{set.enrolled ? (
						<Button variant="secondary" fullWidth disabled>✓ Đang học</Button>
					) : (
						<SmartStudyButton
							setId={set.id}
							dueCount={0}
							newCount={set.itemCount}
							enrolled={false}
							size="md"
						/>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="relative flex h-full flex-col">
			<CardContent className="flex flex-1 flex-col gap-3">
				<div className="flex items-start justify-between gap-2">
					<Link href={href} className="min-w-0 flex-1">
						<h3 className="text-lg font-black text-foreground">{set.title}</h3>
					</Link>
					{variant === 'library' && <LibraryMenu set={set} />}
				</div>
				<div className="flex flex-wrap gap-2">
					{set.legacy && <Badge>Bộ cũ</Badge>}
					{set.level != null && <Badge>HSK {set.level}</Badge>}
					{!set.srsActive && <Badge>Tạm dừng</Badge>}
				</div>
				<p className="text-sm text-muted">{set.itemCount} từ</p>
				<SegmentBar set={set} />
				<p className="text-xs text-muted">
					{set.newCount} mới · {set.learningCount} đang học · {set.masteredCount} đã nắm
				</p>
				{variant === 'home' ? (
					<Link href={href} className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-accent">
						Tiếp tục
						<MaterialIcon name="chevron_right" size={16} />
					</Link>
				) : (
					<div className="mt-auto">
						<SmartStudyButton
							setId={set.id}
							dueCount={set.srsActive ? set.dueCount : 0}
							newCount={set.newCount}
							enrolled
							size="md"
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
