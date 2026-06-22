"use client";

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';

type WizardStep = 'select' | 'review' | 'done';

interface Preview {
	sets: number;
	items: number;
	progress: number;
	answerLogs: number;
	matchedWords: number;
	pendingWords: number;
	errors: string[];
	warnings: string[];
	totalRows?: number;
	validWords?: number;
	setsCount?: number;
	examplesTotal?: number;
	examplesAuto?: number;
	examplesDraft?: number;
	wordsWithExamples?: number;
	wordsWithoutExamples?: number;
	duplicateSetNames?: string[];
}

const STEPS: { id: WizardStep; label: string }[] = [
	{ id: 'select', label: 'Chọn tệp' },
	{ id: 'review', label: 'Kiểm tra' },
	{ id: 'done', label: 'Hoàn tất' },
];

function stepIndex(step: WizardStep): number {
	return STEPS.findIndex((s) => s.id === step);
}

function isExcelFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.xlsx') || name.endsWith('.xls');
}

function PreviewSummary({ preview }: { preview: Preview }) {
	if (preview.validWords != null && preview.validWords > 0) {
		return (
			<p className="text-sm text-foreground-secondary">
				<span className="font-bold text-foreground">{preview.validWords}</span> từ trong{' '}
				<span className="font-bold text-foreground">{preview.setsCount ?? preview.sets}</span> bộ
				{(preview.wordsWithExamples ?? 0) > 0 && (
					<> · <span className="font-bold text-foreground">{preview.wordsWithExamples}</span> từ có câu điền từ</>
				)}
				{(preview.wordsWithoutExamples ?? 0) > 0 && (
					<> · <span className="font-bold text-foreground">{preview.wordsWithoutExamples}</span> từ chưa có câu ví dụ hợp lệ</>
				)}
				{(preview.examplesTotal ?? 0) > 0 && (
					<> · <span className="font-bold text-foreground">{preview.examplesAuto ?? 0}</span> câu đạt /{' '}
					<span className="font-bold text-foreground">{preview.examplesDraft ?? 0}</span> nháp</>
				)}
			</p>
		);
	}

	return (
		<p className="text-sm text-foreground-secondary">
			<span className="font-bold text-foreground">{preview.sets}</span> bộ ·{' '}
			<span className="font-bold text-foreground">{preview.items}</span> từ
			{preview.matchedWords + preview.pendingWords > 0 && (
				<> · {preview.matchedWords} khớp thư viện · {preview.pendingWords} chờ bổ sung</>
			)}
			{preview.progress > 0 && <> · {preview.progress} tiến độ</>}
			{preview.answerLogs > 0 && <> · {preview.answerLogs} log</>}
		</p>
	);
}

function StepTracker({ currentStep }: { currentStep: WizardStep }) {
	const currentIdx = stepIndex(currentStep);

	return (
		<div className="mb-8 flex justify-center">
			<div className="flex items-start gap-2 sm:gap-4">
				{STEPS.map((s, idx) => {
					const done = idx < currentIdx;
					const active = idx === currentIdx;
					return (
						<div key={s.id} className="flex items-start">
							<div className="flex flex-col items-center">
								<div
									className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
										done
											? 'border-success bg-success text-background'
											: active
												? 'border-accent bg-accent text-accent-foreground'
												: 'border-border bg-surface text-muted'
									}`}
								>
									{done ? (
										<MaterialIcon name="check" size={18} className="text-background" />
									) : (
										idx + 1
									)}
								</div>
								<span
									className={`label-caps mt-1 whitespace-nowrap !text-[10px] ${
										active ? 'text-accent' : done ? 'text-success' : 'text-muted'
									}`}
								>
									{s.label}
								</span>
							</div>
							{idx < STEPS.length - 1 && (
								<div
									className={`mt-4 h-0.5 w-8 sm:w-16 ${idx < currentIdx ? 'bg-success' : 'bg-border'}`}
									aria-hidden
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default function SetImportWizard() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [step, setStep] = useState<WizardStep>('select');
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<Preview | null>(null);
	const [result, setResult] = useState<Preview | null>(null);
	const [restoreProgress, setRestoreProgress] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const submit = useCallback(async (action: 'preview' | 'publish', targetFile: File) => {
		setLoading(true);
		setError(null);
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
			if (!nextPreview) throw new Error('Không nhận được dữ liệu từ server');

			if (action === 'preview') {
				setPreview(nextPreview);
				setStep('review');
			} else {
				setResult(nextPreview);
				setStep('done');
				router.refresh();
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi import');
		} finally {
			setLoading(false);
		}
	}, [restoreProgress, router]);

	const handleFile = useCallback((nextFile: File | null) => {
		if (!nextFile) return;
		if (!isExcelFile(nextFile)) {
			setError('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
			return;
		}
		setFile(nextFile);
		setPreview(null);
		setResult(null);
		setError(null);
		void submit('preview', nextFile);
	}, [submit]);

	const resetWizard = () => {
		setStep('select');
		setFile(null);
		setPreview(null);
		setResult(null);
		setError(null);
		setRestoreProgress(false);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const hasErrors = (preview?.errors.length ?? 0) > 0;
	const hasWarnings = (preview?.warnings.length ?? 0) > 0;
	const reviewStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

	return (
		<div className="mx-auto max-w-4xl">
			<StepTracker currentStep={step} />

			{step === 'select' && (
				<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
					<div className="flex-1">
						<input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,.xls"
							className="sr-only"
							onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
						/>
						<button
							type="button"
							disabled={loading}
							onClick={() => fileInputRef.current?.click()}
							onDragOver={(e) => {
								e.preventDefault();
								setDragOver(true);
							}}
							onDragLeave={() => setDragOver(false)}
							onDrop={(e) => {
								e.preventDefault();
								setDragOver(false);
								const dropped = e.dataTransfer.files?.[0];
								if (dropped) handleFile(dropped);
							}}
							className={`card-paper flex min-h-[280px] w-full flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-colors ${
								dragOver ? 'border-accent bg-accent-subtle' : 'hover:border-accent'
							} disabled:opacity-60`}
						>
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
								<MaterialIcon name="upload_file" className="text-accent" size={32} />
							</div>
							<h3 className="text-xl font-black text-foreground">Tải lên tệp Excel</h3>
							<p className="mt-2 max-w-sm text-sm text-foreground-secondary">
								Kéo thả tệp .xlsx vào đây hoặc nhấp để chọn từ thiết bị.
							</p>
							{loading ? (
								<p className="label-caps mt-4 text-accent">Đang kiểm tra tệp…</p>
							) : (
								<span className="btn-primary mt-6 pointer-events-none">Chọn tệp</span>
							)}
							{file && !loading && (
								<p className="mt-4 text-xs text-muted">{file.name}</p>
							)}
						</button>
					</div>

					<aside className="w-full lg:w-72 lg:shrink-0">
						<div className="card-paper space-y-4 p-4">
							<h4 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
								<MaterialIcon name="info" className="text-accent" size={20} />
								Cấu trúc tệp Excel
							</h4>
							<p className="text-xs text-foreground-secondary">
								Đảm bảo tệp có sheet <strong>tu_vung</strong> với các cột bắt buộc để hệ thống nhận diện tự động.
							</p>
							<ul className="list-disc space-y-1 pl-4 text-xs text-foreground-secondary">
								<li><strong>huong_dan</strong> — hướng dẫn nhập liệu / dùng AI</li>
								<li><strong>tu_vung</strong> — bo_tu, simplified, pinyin, meaning_vi (+ cột tùy chọn)</li>
								<li>File export cũ: sets, set_items, progress, answer_logs</li>
							</ul>
							<div className="flex flex-col gap-2 pt-2">
								{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download API route */}
								<a href="/api/sets/sample" className="btn-secondary w-full justify-center">
									<MaterialIcon name="description" size={16} />
									Tải tệp mẫu
								</a>
								{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download API route */}
								<a href="/api/sets/export" className="btn-secondary w-full justify-center">
									<MaterialIcon name="download" size={16} />
									Xuất dữ liệu
								</a>
							</div>
						</div>
					</aside>
				</div>
			)}

			{step === 'review' && preview && (
				<div className="space-y-6">
					{file && (
						<p className="text-center text-sm text-muted">
							Tệp: <span className="font-bold text-foreground">{file.name}</span>
						</p>
					)}

					<div className="card-paper p-6">
						<h3 className="text-lg font-extrabold text-foreground">Kết quả kiểm tra</h3>
						<div className="mt-4">
							<PreviewSummary preview={preview} />
						</div>

						<div
							className={`mt-4 rounded-lg border px-4 py-3 ${
								reviewStatus === 'error'
									? 'border-accent bg-accent-subtle'
									: reviewStatus === 'warning'
										? 'border-warning bg-warning/10'
										: 'border-success bg-success-subtle'
							}`}
						>
							{reviewStatus === 'error' && (
								<p className="flex items-center gap-2 text-sm font-bold text-accent">
									<MaterialIcon name="error" size={20} />
									Có {preview.errors.length} lỗi — cần sửa file trước khi import
								</p>
							)}
							{reviewStatus === 'warning' && (
								<p className="flex items-center gap-2 text-sm font-bold text-warning">
									<MaterialIcon name="warning" size={20} />
									Sẵn sàng import — {preview.warnings.length} cảnh báo (không chặn)
								</p>
							)}
							{reviewStatus === 'ok' && (
								<p className="flex items-center gap-2 text-sm font-bold text-success">
									<MaterialIcon name="check_circle" size={20} />
									Sẵn sàng import — không có lỗi
								</p>
							)}
						</div>

						{preview.errors.length > 0 && (
							<ul className="mt-4 space-y-2">
								{preview.errors.map((err) => (
									<li key={err} className="flex gap-2 text-sm text-accent">
										<MaterialIcon name="cancel" size={18} className="mt-0.5 shrink-0" />
										{err}
									</li>
								))}
							</ul>
						)}

						{preview.warnings.length > 0 && (
							<ul className="mt-4 space-y-2">
								{preview.warnings.map((warning) => (
									<li key={warning} className="flex gap-2 text-sm text-warning">
										<MaterialIcon name="info" size={18} className="mt-0.5 shrink-0" />
										{warning}
									</li>
								))}
							</ul>
						)}
					</div>

					<label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
						<input
							type="checkbox"
							checked={restoreProgress}
							onChange={(e) => setRestoreProgress(e.target.checked)}
							className="mt-1 h-4 w-4 accent-accent"
						/>
						<div>
							<p className="text-sm font-bold text-foreground">Khôi phục tiến độ (từ file export)</p>
							<p className="mt-1 text-xs text-muted">Chỉ áp dụng với file export cũ có sheet progress.</p>
						</div>
					</label>

					<div className="flex flex-wrap justify-between gap-3">
						<button
							type="button"
							onClick={() => {
								setStep('select');
								setPreview(null);
								setError(null);
							}}
							disabled={loading}
							className="btn-secondary disabled:opacity-50"
						>
							<MaterialIcon name="arrow_back" size={16} />
							Quay lại
						</button>
						<button
							type="button"
							onClick={() => file && void submit('publish', file)}
							disabled={!file || loading || hasErrors}
							className="btn-primary disabled:opacity-50"
						>
							{loading ? 'Đang import…' : 'Import bộ từ'}
						</button>
					</div>
				</div>
			)}

			{step === 'done' && result && (
				<div className="card-paper mx-auto max-w-lg space-y-6 p-8 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
						<MaterialIcon name="check_circle" className="text-success" size={40} />
					</div>
					<div>
						<h3 className="text-2xl font-black text-foreground">Import thành công</h3>
						<p className="mt-2 text-sm text-foreground-secondary">
							Đã thêm{' '}
							<span className="font-bold text-foreground">
								{result.validWords ?? result.items}
							</span>{' '}
							từ trong{' '}
							<span className="font-bold text-foreground">
								{result.setsCount ?? result.sets}
							</span>{' '}
							bộ.
						</p>
						{(result.wordsWithExamples ?? 0) > 0 && (
							<p className="mt-1 text-xs text-muted">
								{result.wordsWithExamples} từ có câu điền từ sẵn sàng cho SRS.
							</p>
						)}
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Link href="/sets" className="btn-primary">
							<MaterialIcon name="library_books" size={16} />
							Xem bộ từ
						</Link>
						<button type="button" onClick={resetWizard} className="btn-secondary">
							<MaterialIcon name="upload_file" size={16} />
							Thêm tệp khác
						</button>
					</div>
				</div>
			)}

			{error && (
				<div className="mt-4 rounded-lg border border-accent bg-accent-subtle px-4 py-3 text-sm text-accent">
					{error}
				</div>
			)}
		</div>
	);
}
