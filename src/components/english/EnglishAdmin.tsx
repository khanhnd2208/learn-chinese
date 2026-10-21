'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { sampleEnglishPack } from '@/lib/english/samplePack';

interface Issue {
	path: string;
	message: string;
	code: string;
}

interface SetRow {
	id: string;
	title: string;
	status: string;
	items: number;
	learners: number;
}

interface DisputeRow {
	id: string;
	answer: string;
	expected: string;
	skill: string;
}

export default function EnglishAdmin({ sets, disputes }: { sets: SetRow[]; disputes: DisputeRow[] }) {
	const router = useRouter();
	const [text, setText] = useState('');
	const [issues, setIssues] = useState<Issue[]>([]);
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	async function send(action: 'preview' | 'save') {
		setBusy(true);
		setMessage('');
		try {
			const pack = JSON.parse(text) as unknown;
			const response = await fetch('/api/english/admin/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, pack }),
			});
			const body = await response.json() as {
				ok?: boolean;
				error?: string;
				data?: { issues?: Issue[]; setId?: string; drafts?: number };
			};
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xử lý được gói nội dung');
			setIssues(body.data?.issues ?? []);
			setMessage(action === 'save'
				? `Đã lưu bản nháp${body.data?.setId ? ` ${body.data.setId}` : ''}.`
				: `Xem trước: ${body.data?.drafts ?? 0} câu có thể đưa vào ôn nếu đủ audio.`);
			if (action === 'save') router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'JSON không hợp lệ');
		} finally {
			setBusy(false);
		}
	}

	async function publish(setId: string) {
		setBusy(true);
		setMessage('');
		try {
			const response = await fetch('/api/english/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setId }),
			});
			const body = await response.json() as { ok?: boolean; error?: string; data?: { issues?: Issue[]; publishedSenses?: number; publishedPatterns?: number } };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không xuất bản được');
			setIssues(body.data?.issues ?? []);
			setMessage(`Đã xuất bản ${body.data?.publishedSenses ?? 0} từ và ${body.data?.publishedPatterns ?? 0} mẫu. Câu thiếu audio hoặc còn mơ hồ được giữ lại.`);
			router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không xuất bản được');
		} finally {
			setBusy(false);
		}
	}

	async function resolve(disputeId: string, decision: 'accepted' | 'rejected') {
		setBusy(true);
		try {
			const response = await fetch('/api/english/admin/disputes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ disputeId, decision }),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không duyệt được');
			router.refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không duyệt được');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
			<header>
				<h1 className="text-3xl font-black text-foreground">Nội dung tiếng Anh</h1>
				<p className="mt-2 text-sm text-muted">Dán JSON do AI tạo. Câu thiếu nghĩa Việt, audio hoặc còn mơ hồ không vào phiên ôn. File audio phải nằm trong thư mục ENGLISH_AUDIO_ROOT, ngoài thư mục release.</p>
			</header>
			<Card>
				<CardContent className="space-y-3">
					<textarea
						aria-label="Gói nội dung JSON"
						value={text}
						onChange={(event) => setText(event.target.value)}
						className="min-h-48 w-full rounded-control border border-border bg-surface p-3 font-mono text-xs"
					/>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="tertiary" onClick={() => setText(JSON.stringify(sampleEnglishPack, null, 2))}>Điền gói mẫu</Button>
						<Button type="button" variant="secondary" disabled={busy || !text.trim()} onClick={() => void send('preview')}>Xem trước</Button>
						<Button type="button" disabled={busy || !text.trim()} onClick={() => void send('save')}>Lưu bản nháp</Button>
					</div>
					{message && <p className="text-sm text-foreground">{message}</p>}
					{issues.length > 0 && (
						<ul className="space-y-1 text-sm text-warning">
							{issues.slice(0, 30).map((issue) => (
								<li key={`${issue.path}-${issue.code}`}>{issue.path}: {issue.message}</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Bộ đã lưu</h2>
				{sets.map((set) => (
					<Card key={set.id}>
						<CardContent className="flex items-center justify-between gap-3">
							<div>
								<p className="font-black">{set.title}</p>
								<p className="text-xs text-muted">{set.status} · {set.items} mục · {set.learners} người học</p>
							</div>
							<Button type="button" variant="secondary" disabled={busy} onClick={() => void publish(set.id)}>Xuất bản</Button>
						</CardContent>
					</Card>
				))}
			</section>
			<section className="space-y-3">
				<h2 className="text-xl font-black">Đáp án đang chờ duyệt</h2>
				{disputes.length === 0 && <p className="text-sm text-muted">Không có báo cáo chờ.</p>}
				{disputes.map((dispute) => (
					<Card key={dispute.id}>
						<CardContent className="space-y-2">
							<p>Người học: <span className="font-bold">{dispute.answer}</span></p>
							<p className="text-sm text-muted">Đáp án mục tiêu: {dispute.expected} · {dispute.skill}</p>
							<div className="flex gap-2">
								<Button type="button" disabled={busy} onClick={() => void resolve(dispute.id, 'accepted')}>Chấp nhận</Button>
								<Button type="button" variant="secondary" disabled={busy} onClick={() => void resolve(dispute.id, 'rejected')}>Không chấp nhận</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</section>
		</div>
	);
}
