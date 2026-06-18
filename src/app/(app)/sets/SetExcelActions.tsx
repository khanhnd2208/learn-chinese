"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Preview {
	sets: number;
	items: number;
	progress: number;
	answerLogs: number;
	errors: string[];
	warnings: string[];
}

export default function SetExcelActions() {
	const router = useRouter();
	const fileRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<Preview | null>(null);
	const [restoreProgress, setRestoreProgress] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const submit = async (action: 'preview' | 'publish') => {
		const targetFile = file ?? fileRef.current?.files?.[0];
		if (!targetFile) return;
		setLoading(true);
		setMessage(null);
		const form = new FormData();
		form.append('file', targetFile);
		form.append('action', action);
		form.append('restoreProgress', restoreProgress ? 'true' : 'false');
		try {
			const res = await fetch('/api/sets/import', { method: 'POST', body: form });
			const json = await res.json() as {
				ok: boolean;
				data?: { preview?: Preview; result?: Preview };
				error?: string;
			};
			if (!json.ok) throw new Error(json.error ?? 'Lỗi import');
			const nextPreview = action === 'preview' ? json.data?.preview : json.data?.result;
			setPreview(nextPreview ?? null);
			if (action === 'publish') {
				setMessage('Đã import bộ từ từ Excel');
				setFile(null);
				if (fileRef.current) fileRef.current.value = '';
				router.refresh();
			}
		} catch (e) {
			setMessage(e instanceof Error ? e.message : 'Lỗi import');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="card-paper space-y-3 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="font-bold text-foreground">Excel</p>
					<p className="text-xs text-muted">Xuất/nhập bộ từ và tiến độ của tài khoản hiện tại.</p>
				</div>
				<Link href="/api/sets/export" className="btn-secondary">
					<MaterialIcon name="download" size={16} />
					Export
				</Link>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<input
					ref={fileRef}
					type="file"
					accept=".xlsx,.xls"
					className="text-sm"
					onChange={(e) => {
						const nextFile = e.target.files?.[0] ?? null;
						setFile(nextFile);
						setPreview(null);
						if (nextFile) void submit('preview');
					}}
				/>
				<label className="flex items-center gap-2 text-sm text-foreground-secondary">
					<input
						type="checkbox"
						checked={restoreProgress}
						onChange={(e) => setRestoreProgress(e.target.checked)}
					/>
					Khôi phục tiến độ
				</label>
				<button
					type="button"
					onClick={() => void submit('preview')}
					disabled={!file || loading}
					className="btn-secondary disabled:opacity-50"
				>
					Preview
				</button>
				<button
					type="button"
					onClick={() => void submit('publish')}
					disabled={!file || loading || !!preview?.errors.length}
					className="btn-primary disabled:opacity-50"
				>
					Import
				</button>
			</div>
			{preview && (
				<div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
					<p>{preview.sets} bộ · {preview.items} từ · {preview.progress} tiến độ · {preview.answerLogs} log</p>
					{preview.errors.map((err) => <p key={err} className="text-accent">{err}</p>)}
					{preview.warnings.map((warning) => <p key={warning} className="text-warning">{warning}</p>)}
				</div>
			)}
			{message && <p className="text-sm text-foreground-secondary">{message}</p>}
		</div>
	);
}
