"use client";

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { buildAiSmartImportPrompt } from '@/lib/chinese/aiImportPrompt';
import {
	AI_STEPS,
	ImportDonePanel,
	ImportReviewPanel,
	type ImportPreview,
	type ImportWizardStep,
	StepTracker,
} from '@/app/(app)/sets/import/SetImportShared';

export default function AiSmartImportPanel() {
	const router = useRouter();
	const [step, setStep] = useState<ImportWizardStep>('select');
	const [setName, setSetName] = useState('');
	const [rawList, setRawList] = useState('');
	const [pastedText, setPastedText] = useState('');
	const [preview, setPreview] = useState<ImportPreview | null>(null);
	const [result, setResult] = useState<ImportPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copyOk, setCopyOk] = useState(false);

	const prompt = useMemo(
		() => buildAiSmartImportPrompt({ setName, rawList }),
		[setName, rawList],
	);

	const canBuildPrompt = setName.trim().length > 0 && rawList.trim().length > 0;
	const canPreview = canBuildPrompt && pastedText.trim().length > 0;

	const submit = useCallback(async (action: 'preview' | 'publish') => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/sets/import/smart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					setName: setName.trim(),
					text: pastedText,
				}),
			});
			const json = await res.json() as {
				ok: boolean;
				data?: { preview?: ImportPreview; result?: ImportPreview };
				error?: string;
			};
			if (!json.ok) throw new Error(json.error ?? 'Lỗi import');
			const next = action === 'preview' ? json.data?.preview : json.data?.result;
			if (!next) throw new Error('Không nhận được dữ liệu từ server');

			if (action === 'preview') {
				setPreview(next);
				setStep('review');
			} else {
				setResult(next);
				setStep('done');
				router.refresh();
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi import');
		} finally {
			setLoading(false);
		}
	}, [setName, pastedText, router]);

	const handleCopyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopyOk(true);
			setTimeout(() => setCopyOk(false), 2000);
		} catch {
			setError('Không copy được — hãy chọn và copy thủ công');
		}
	};

	const resetWizard = () => {
		setStep('select');
		setSetName('');
		setRawList('');
		setPastedText('');
		setPreview(null);
		setResult(null);
		setError(null);
		setCopyOk(false);
	};

	const hasErrors = (preview?.errors.length ?? 0) > 0;

	return (
		<div>
			<StepTracker currentStep={step} steps={AI_STEPS} />

			{step === 'select' && (
				<div className="space-y-6">
					<section className="card-paper space-y-4 p-5">
						<div className="flex items-center gap-2">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">1</span>
							<h3 className="text-sm font-extrabold text-foreground">Chuẩn bị dữ liệu thô</h3>
						</div>
						<div>
							<label htmlFor="ai-set-name" className="label-caps mb-1 block text-muted">
								Tên bộ từ
							</label>
							<input
								id="ai-set-name"
								type="text"
								value={setName}
								onChange={(e) => setSetName(e.target.value)}
								placeholder="VD: HSK1 - Bài 3"
								className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
							/>
						</div>
						<div>
							<label htmlFor="ai-raw-list" className="label-caps mb-1 block text-muted">
								Danh sách từ (mỗi dòng 1 từ)
							</label>
							<p className="mb-2 text-xs text-foreground-secondary">
								Tối thiểu cần <strong>chữ Hán (simplified)</strong> và <strong>nghĩa tiếng Việt</strong>.
								Thứ tự cột tự do — AI bên ngoài sẽ tự hiểu.
							</p>
							<textarea
								id="ai-raw-list"
								value={rawList}
								onChange={(e) => setRawList(e.target.value)}
								rows={6}
								placeholder={'老师 | giáo viên\n你好 | xin chào\n谢谢'}
								className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
							/>
						</div>
					</section>

					<section className="card-paper space-y-4 p-5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">2</span>
								<h3 className="text-sm font-extrabold text-foreground">Copy prompt sang Gen AI</h3>
							</div>
							<button
								type="button"
								onClick={() => void handleCopyPrompt()}
								disabled={!canBuildPrompt}
								className="btn-primary text-sm disabled:opacity-50"
							>
								<MaterialIcon name="content_copy" size={16} />
								{copyOk ? 'Đã copy!' : 'Copy prompt'}
							</button>
						</div>
						<p className="text-xs text-foreground-secondary">
							Dán prompt vào ChatGPT, Claude, Gemini… rồi lấy output TSV về bước 3.
						</p>
						<pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-container p-3 text-xs whitespace-pre-wrap text-foreground-secondary">
							{canBuildPrompt ? prompt : 'Nhập tên bộ và danh sách từ ở bước 1 để sinh prompt…'}
						</pre>
					</section>

					<section className="card-paper space-y-4 p-5">
						<div className="flex items-center gap-2">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">3</span>
							<h3 className="text-sm font-extrabold text-foreground">Dán kết quả từ AI</h3>
						</div>
						<p className="text-xs text-foreground-secondary">
							Dán toàn bộ output TSV (có dòng header). App tự gán tên bộ &quot;{setName.trim() || '…'}&quot;.
						</p>
						<textarea
							value={pastedText}
							onChange={(e) => setPastedText(e.target.value)}
							rows={8}
							placeholder="Dán output TSV từ Gen AI vào đây…"
							className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
						/>
						<button
							type="button"
							onClick={() => void submit('preview')}
							disabled={!canPreview || loading}
							className="btn-primary w-full justify-center disabled:opacity-50 sm:w-auto"
						>
							{loading ? 'Đang kiểm tra…' : 'Kiểm tra dữ liệu'}
						</button>
					</section>
				</div>
			)}

			{step === 'review' && preview && (
				<div className="space-y-6">
					<ImportReviewPanel
						preview={preview}
						sourceLabel={
							<>
								Bộ: <span className="font-bold text-foreground">{setName.trim()}</span>
								{' · '}AI Smart Import
							</>
						}
					/>

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
							onClick={() => void submit('publish')}
							disabled={loading || hasErrors}
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
					onReset={resetWizard}
					resetLabel="Import bộ khác"
				/>
			)}

			{error && (
				<div className="mt-4 rounded-lg border border-accent bg-accent-subtle px-4 py-3 text-sm text-accent">
					{error}
				</div>
			)}
		</div>
	);
}
