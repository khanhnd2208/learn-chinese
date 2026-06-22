'use client';

import { useEffect, useState } from 'react';

interface MongoUser {
	id: string;
	name: string;
	email: string;
}

interface AdminMessageDTO {
	id: string;
	recipientEmail: string;
	content: string;
	dismissedAt: string | null;
	createdAt: string;
}

export default function UserMessageAdminPanel() {
	const [users, setUsers] = useState<MongoUser[]>([]);
	const [messages, setMessages] = useState<AdminMessageDTO[]>([]);
	const [email, setEmail] = useState('');
	const [content, setContent] = useState('');
	const [sending, setSending] = useState(false);
	const [result, setResult] = useState<string | null>(null);

	const loadData = async () => {
		const [uRes, mRes] = await Promise.all([
			fetch('/api/admin/user-messages?action=users'),
			fetch('/api/admin/user-messages'),
		]);
		const uJson = await uRes.json() as { ok: boolean; data?: { users: MongoUser[] } };
		const mJson = await mRes.json() as { ok: boolean; data?: { messages: AdminMessageDTO[] } };
		if (uJson.ok) setUsers(uJson.data?.users ?? []);
		if (mJson.ok) setMessages(mJson.data?.messages ?? []);
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
		void loadData();
	}, []);

	const handleSend = async () => {
		if (!email || !content.trim()) return;
		setSending(true);
		setResult(null);
		try {
			const res = await fetch('/api/admin/user-messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recipientEmail: email, content: content.trim() }),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setResult('✓ Đã gửi tin nhắn thành công!');
			setContent('');
			void loadData();
		} catch (e) {
			setResult('✗ ' + (e instanceof Error ? e.message : 'Lỗi không xác định'));
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="mt-10 rounded-xl border border-border p-6">
			<h2 className="font-bold">💌 Gửi tin nhắn riêng cho người dùng</h2>
			<p className="mt-1 text-sm text-muted">Tin nhắn sẽ hiện lên giữa màn hình khi họ mở app.</p>

			<div className="mt-5 space-y-4">
				<div>
					<label className="mb-1 block text-sm font-medium">Người nhận</label>
					<select
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
					>
						<option value="">— Chọn người dùng —</option>
						{users.map((u) => (
							<option key={u.id} value={u.email}>
								{u.name ? `${u.name} (${u.email})` : u.email}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="mb-1 block text-sm font-medium">Nội dung tin nhắn</label>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={4}
						placeholder="Nhập nội dung tin nhắn..."
						className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>

				<button
					type="button"
					disabled={!email || !content.trim() || sending}
					onClick={() => void handleSend()}
					className="btn-primary disabled:opacity-40"
				>
					{sending ? 'Đang gửi…' : 'Gửi tin nhắn'}
				</button>

				{result && (
					<p className={`text-sm ${result.startsWith('✓') ? 'text-success' : 'text-warning'}`}>
						{result}
					</p>
				)}
			</div>

			{messages.length > 0 && (
				<div className="mt-8">
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
						Lịch sử tin nhắn
					</h3>
					<div className="space-y-2">
						{messages.map((m) => (
							<div key={m.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
								<div className="flex-1 min-w-0">
									<p className="truncate font-medium">{m.recipientEmail}</p>
									<p className="mt-0.5 text-muted line-clamp-2">{m.content}</p>
								</div>
								<div className="shrink-0 text-right text-xs text-muted">
									<p>{new Date(m.createdAt).toLocaleString('vi-VN')}</p>
									{m.dismissedAt ? (
										<p className="mt-0.5 text-success">Đã xem</p>
									) : (
										<p className="mt-0.5 text-warning">Chưa xem</p>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
