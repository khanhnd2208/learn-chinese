'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { buildAiSmartImportPrompt, buildAiSmartImportPromptMulti } from '@/lib/chinese/aiImportPrompt';
import {
	AI_STEPS,
	ImportDonePanel,
	ImportReviewPanel,
	type ImportPreview,
	type ImportWizardStep,
	StepTracker,
} from '@/app/(app)/sets/import/SetImportShared';

type NewSetMode = 'single' | 'multi';

const MULTI_RAW_PLACEHOLDER = `[HSK1 Bài 3]
老师 | giáo viên
你好 | xin chào

[HSK1 Bài 4]
谢谢 | cảm ơn
再见 | tạm biệt`;

export type TuVungPasteWizardProps =
	| {
		variant: 'new-set';
		initialMode?: NewSetMode;
		showModeSwitch?: boolean;
	}
	| {
		variant: 'existing-set';
		setId: string;
		setTitle: string;
		compact?: boolean;
		onPublished?: (addedCount: number) => void;
	};

export default function TuVungPasteWizard(props: TuVungPasteWizardProps) {
	const router = useRouter();
	const isExisting = props.variant === 'existing-set';
	const [mode, setMode] = useState<NewSetMode>(
		props.variant === 'new-set' ? (props.initialMode ?? 'single') : 'single',
	);
	const [step, setStep] = useState<ImportWizardStep>('select');
	const [setName, setSetName] = useState(
		isExisting ? props.setTitle : '',
	);
	const [rawList, setRawList] = useState('');
	const [pastedText, setPastedText] = useState('');
	const [preview, setPreview] = useState<ImportPreview | null>(null);
	const [result, setResult] = useState<ImportPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copyOk, setCopyOk] = useState(false);

	const effectiveSetName = isExisting ? props.setTitle : setName.trim();
	const prompt = useMemo(() => {
		if (!isExisting && mode === 'multi') {
			return buildAiSmartImportPromptMulti({ rawList });
		}
		return buildAiSmartImportPrompt({ rawList });
	}, [isExisting, mode, rawList]);

	const canBuildPrompt = rawList.trim().length > 0;
	const canPreview = isExisting
		? pastedText.trim().length > 0
		: mode === 'multi'
			? canBuildPrompt && pastedText.trim().length > 0
			: canBuildPrompt && pastedText.trim().length > 0 && effectiveSetName.length > 0;
	const hasErrors = (preview?.errors.length ?? 0) > 0;

	const errorReportContext = isExisting
		? `Thêm từ · Bộ: ${props.setTitle}`
		: mode === 'multi'
			? 'AI Smart Import · Nhiều bộ từ'
			: `AI Smart Import · Bộ: ${effectiveSetName}`;

	const reviewSourceLabel = isExisting ? (
		<>
			Thêm vào bộ: <span className="font-bold text-foreground">{props.setTitle}</span>
		</>
	) : mode === 'multi' ? (
		<>AI Smart Import · Nhiều bộ từ</>
	) : (
		<>
			Bộ: <span className="font-bold text-foreground">{effectiveSetName}</span>
			{' · '}AI Smart Import
		</>
	);

	const switchMode = (nextMode: NewSetMode) => {
		if (isExisting || nextMode === mode) return;
		setMode(nextMode);
		setStep('select');
		setSetName('');
		setRawList('');
		setPastedText('');
		setPreview(null);
		setResult(null);
		setError(null);
		setCopyOk(false);
	};

	const submit = useCallback(async (action: 'preview' | 'publish') => {
		setLoading(true);
		setError(null);
		try {
			const endpoint = isExisting
				? `/api/sets/${props.setId}/import/smart`
				: '/api/sets/import/smart';

			const body: {
				action: 'preview' | 'publish';
				text: string;
				setName?: string;
			} = {
				action,
				text: pastedText,
			};
			if (!isExisting && mode === 'single') {
				body.setName = effectiveSetName;
			}

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json() as {
				ok: boolean;
				data?: { preview?: ImportPreview; result?: ImportPreview; addedCount?: number };
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
				if (isExisting) {
					props.onPublished?.(json.data?.addedCount ?? 0);
				} else {
					router.refresh();
				}
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi import');
		} finally {
			setLoading(false);
		}
	}, [isExisting, props, mode, effectiveSetName, pastedText, router]);

	const handleCopyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopyOk(true);
			setStep('review');
			setTimeout(() => setCopyOk(false), 2000);
		} catch {
			setError('Không copy được — hãy chọn và copy thủ công');
		}
	};

	const resetWizard = () => {
		setStep('select');
		if (!isExisting) setSetName('');
		setRawList('');
		setPastedText('');
		setPreview(null);
		setResult(null);
		setError(null);
		setCopyOk(false);
	};

	const compact = isExisting && props.compact;

	return (
		<div>
			{!isExisting && props.showModeSwitch !== false && (
				<div className="mb-6 flex justify-center">
					<div className="inline-flex rounded-lg border border-border bg-surface p-1">
						<button
							type="button"
							onClick={() => switchMode('single')}
							className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
								mode === 'single'
									? 'bg-accent text-accent-foreground'
									: 'text-muted hover:text-foreground'
							}`}
						>
							<MaterialIcon name="library_books" size={18} />
							Một bộ từ
						</button>
						<button
							type="button"
							onClick={() => switchMode('multi')}
							className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
								mode === 'multi'
									? 'bg-accent text-accent-foreground'
									: 'text-muted hover:text-foreground'
							}`}
						>
							<MaterialIcon name="collections_bookmark" size={18} />
							Nhiều bộ từ
						</button>
					</div>
				</div>
			)}

			<StepTracker currentStep={step} steps={AI_STEPS} />

			{error && (
				<p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground-secondary">
					{error}
				</p>
			)}

			{step === 'select' && (
				<div className="space-y-6">
					{isExisting && (
						<p className="text-sm text-foreground-secondary">
							Thêm từ vào <strong>{props.setTitle}</strong> với đủ trường như import mới
							(pinyin, nghĩa, 5 ví dụ câu). Từ đã có trong thư viện sẽ được cập nhật metadata và ví dụ.
						</p>
					)}

					<section className="card-paper space-y-4 p-5">
						<div className="flex items-center gap-2">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">1</span>
							<h3 className="text-sm font-extrabold text-foreground">Chuẩn bị dữ liệu thô</h3>
						</div>
						<div>
							{!isExisting && mode === 'multi' && (
								<p className="mb-4 text-xs text-foreground-secondary">
									Mỗi bộ từ dùng dòng <strong>[Tên bộ từ]</strong> làm tiêu đề. AI sẽ xuất cột{' '}
									<strong>bo_tu</strong> trong TSV.
								</p>
							)}
							<label htmlFor="tu-vung-raw-list" className="label-caps mb-1 block text-muted">
								{!isExisting && mode === 'multi' ? 'Danh sách từ theo bộ' : 'Danh sách từ (mỗi dòng 1 từ)'}
							</label>
							<p className="mb-2 text-xs text-foreground-secondary">
								Tối thiểu cần <strong>chữ Hán (simplified)</strong> và <strong>nghĩa tiếng Việt</strong>.
							</p>
							<textarea
								id="tu-vung-raw-list"
								value={rawList}
								onChange={(e) => setRawList(e.target.value)}
								rows={compact ? 4 : !isExisting && mode === 'multi' ? 8 : 6}
								placeholder={!isExisting && mode === 'multi' ? MULTI_RAW_PLACEHOLDER : '老师 | giáo viên\n你好 | xin chào\n谢谢'}
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
								{copyOk ? 'Đã copy — sang bước Kiểm tra' : 'Copy prompt & tiếp tục'}
							</button>
						</div>
						<p className="text-xs text-foreground-secondary">
							Dán prompt vào ChatGPT, Claude, Gemini… Sau khi copy, app chuyển sang bước Kiểm tra để bạn dán output TSV.
						</p>
						{!compact && (
							<pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-container p-3 text-xs whitespace-pre-wrap text-foreground-secondary">
								{canBuildPrompt ? prompt : 'Nhập danh sách từ ở trên để sinh prompt…'}
							</pre>
						)}
					</section>

					{canBuildPrompt && (
						<div className="flex justify-end">
							<button
								type="button"
								onClick={() => setStep('review')}
								className="btn-secondary text-sm"
							>
								Bỏ qua — tôi đã có output TSV
								<MaterialIcon name="arrow_forward" size={16} />
							</button>
						</div>
					)}
				</div>
			)}

			{step === 'review' && (
				<div className="space-y-6">
					<div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'min-h-[min(70vh,640px)] lg:grid-cols-2 lg:gap-6'}`}>
						<section className="card-paper flex min-h-[280px] flex-col gap-4 p-4 sm:p-5">
							<div>
								<h3 className="text-sm font-extrabold text-foreground">Dán AI Output (TSV)</h3>
								<p className="mt-1 text-xs text-foreground-secondary">
									Dán toàn bộ output từ Gen AI (có dòng header).
									{hasErrors && (
										<span className="mt-1 block font-medium text-accent">
											Sửa lỗi bên Gen AI, copy đè lên ô này rồi ấn Kiểm tra lại.
										</span>
									)}
								</p>
							</div>
							{!isExisting && mode === 'single' && (
								<div>
									<label htmlFor="tu-vung-set-name" className="label-caps mb-1 block text-muted">
										Tên bộ từ
									</label>
									<input
										id="tu-vung-set-name"
										type="text"
										value={setName}
										onChange={(e) => setSetName(e.target.value)}
										placeholder="VD: HSK1 - Bài 3"
										className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
									/>
								</div>
							)}
							<textarea
								value={pastedText}
								onChange={(e) => setPastedText(e.target.value)}
								rows={compact ? 8 : 14}
								placeholder="Dán output TSV từ Gen AI vào đây…"
								className="min-h-0 flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground lg:min-h-[320px]"
							/>
							<button
								type="button"
								onClick={() => void submit('preview')}
								disabled={!canPreview || loading}
								className="btn-primary w-full justify-center disabled:opacity-50 sm:w-auto"
							>
								<MaterialIcon name={preview ? 'refresh' : 'fact_check'} size={16} />
								{loading ? 'Đang kiểm tra…' : preview ? 'Kiểm tra lại' : 'Kiểm tra dữ liệu'}
							</button>
						</section>

						<section className="flex min-h-[280px] min-w-0 flex-col">
							{preview ? (
								<ImportReviewPanel
									preview={preview}
									sourceLabel={reviewSourceLabel}
									errorReportContext={errorReportContext}
									embedded
								/>
							) : (
								<div className="card-paper flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
									<MaterialIcon name="content_paste" className="text-muted" size={40} />
									<p className="text-sm font-bold text-foreground">Chờ output từ Gen AI</p>
									<p className="max-w-xs text-xs text-muted">
										Dán TSV vào ô bên {compact ? 'trên' : 'trái'} rồi ấn <strong>Kiểm tra dữ liệu</strong>.
									</p>
								</div>
							)}
						</section>
					</div>

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
							Quay lại chuẩn bị
						</button>
						{preview && !hasErrors && (
							<button
								type="button"
								onClick={() => void submit('publish')}
								disabled={loading}
								className="btn-primary disabled:opacity-50"
							>
								{loading
									? 'Đang thêm…'
									: isExisting
										? 'Thêm từ vào bộ'
										: mode === 'multi'
											? 'Import các bộ từ'
											: 'Import bộ từ'}
							</button>
						)}
					</div>
				</div>
			)}

			{step === 'done' && result && (
				<ImportDonePanel
					result={result}
					onReset={resetWizard}
					resetLabel={isExisting ? 'Thêm từ khác' : 'Import bộ khác'}
				/>
			)}
		</div>
	);
}
