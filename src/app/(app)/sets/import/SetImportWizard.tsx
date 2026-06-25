"use client";

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import AiSmartImportPanel from '@/app/(app)/sets/import/AiSmartImportPanel';
import {
	EXCEL_STEPS,
	ImportDonePanel,
	ImportReviewPanel,
	type ImportPreview,
	type ImportWizardStep,
	StepTracker,
} from '@/app/(app)/sets/import/SetImportShared';

type ImportMode = 'excel' | 'ai';

function isExcelFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.xlsx') || name.endsWith('.xls');
}

export default function SetImportWizard() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importMode, setImportMode] = useState<ImportMode>('excel');
	const [step, setStep] = useState<ImportWizardStep>('select');
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<ImportPreview | null>(null);
	const [result, setResult] = useState<ImportPreview | null>(null);
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
				data?: { preview?: ImportPreview; result?: ImportPreview };
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

	const resetExcelWizard = () => {
		setStep('select');
		setFile(null);
		setPreview(null);
		setResult(null);
		setError(null);
		setRestoreProgress(false);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const switchMode = (mode: ImportMode) => {
		setImportMode(mode);
		resetExcelWizard();
		setError(null);
	};

	const hasErrors = (preview?.errors.length ?? 0) > 0;

	return (
		<div className="mx-auto max-w-4xl">
			<div className="mb-6 flex justify-center">
				<div className="inline-flex rounded-lg border border-border bg-surface p-1">
					<button
						type="button"
						onClick={() => switchMode('excel')}
						className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
							importMode === 'excel'
								? 'bg-accent text-accent-foreground'
								: 'text-muted hover:text-foreground'
						}`}
					>
						<MaterialIcon name="upload_file" size={18} />
						Tải Excel
					</button>
					<button
						type="button"
						onClick={() => switchMode('ai')}
						className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
							importMode === 'ai'
								? 'bg-accent text-accent-foreground'
								: 'text-muted hover:text-foreground'
						}`}
					>
						<MaterialIcon name="auto_awesome" size={18} />
						AI Smart Import
					</button>
				</div>
			</div>

			{importMode === 'ai' ? (
				<AiSmartImportPanel />
			) : (
				<>
					<StepTracker currentStep={step} steps={EXCEL_STEPS} />

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
										Sheet <strong>tu_vung</strong> — bo_tu, simplified, pinyin, meaning_vi (+ han_viet, part_of_speech, ghi_chu).
										Tải file mẫu để xem định dạng đầy đủ (5 từ ví dụ + sheet hướng dẫn).
									</p>
									<ul className="list-disc space-y-1 pl-4 text-xs text-foreground-secondary">
										<li><strong>huong_dan</strong> — hướng dẫn nhập liệu</li>
										<li><strong>tu_vung</strong> — 12 cột từ vựng + ví dụ</li>
									</ul>
									<div className="flex flex-col gap-2 pt-2">
										{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download API route */}
										<a
											href="/api/sets/sample"
											className="btn-secondary w-full justify-center text-sm"
										>
											<MaterialIcon name="description" size={16} />
											Tải file mẫu Excel
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
							<ImportReviewPanel
								preview={preview}
								sourceLabel={
									file ? (
										<>
											Tệp: <span className="font-bold text-foreground">{file.name}</span>
										</>
									) : undefined
								}
								errorReportContext={file ? `Excel Import · Tệp: ${file.name}` : 'Excel Import'}
							/>

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
						<ImportDonePanel
							result={result}
							onReset={resetExcelWizard}
							resetLabel="Thêm tệp khác"
						/>
					)}

					{error && (
						<div className="mt-4 rounded-lg border border-accent bg-accent-subtle px-4 py-3 text-sm text-accent">
							{error}
						</div>
					)}
				</>
			)}
		</div>
	);
}
