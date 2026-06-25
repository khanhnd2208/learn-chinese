"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

export type ImportWizardStep = 'select' | 'review' | 'done';

export interface ImportPreview {
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
	badExampleWarnings?: {
		rowNumber: number;
		simplified: string;
		exampleIndex: 1 | 2 | 3 | 4 | 5;
		sentence: string;
		reason: string;
	}[];
}

export const EXCEL_STEPS: { id: ImportWizardStep; label: string }[] = [
	{ id: 'select', label: 'Chọn tệp' },
	{ id: 'review', label: 'Kiểm tra' },
	{ id: 'done', label: 'Hoàn tất' },
];

export const AI_STEPS: { id: ImportWizardStep; label: string }[] = [
	{ id: 'select', label: 'Chuẩn bị' },
	{ id: 'review', label: 'Kiểm tra' },
	{ id: 'done', label: 'Hoàn tất' },
];

function stepIndex(step: ImportWizardStep, steps: { id: ImportWizardStep; label: string }[]): number {
	return steps.findIndex((s) => s.id === step);
}

export function PreviewSummary({ preview }: { preview: ImportPreview }) {
	if (preview.validWords != null && preview.validWords > 0) {
		return (
			<p className="text-sm text-foreground-secondary">
				<span className="font-bold text-foreground">{preview.validWords}</span> từ trong{' '}
				<span className="font-bold text-foreground">{preview.setsCount ?? preview.sets}</span> bộ
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

export function StepTracker({
	currentStep,
	steps,
}: {
	currentStep: ImportWizardStep;
	steps: { id: ImportWizardStep; label: string }[];
}) {
	const currentIdx = stepIndex(currentStep, steps);

	return (
		<div className="mb-8 flex justify-center">
			<div className="flex items-start gap-2 sm:gap-4">
				{steps.map((s, idx) => {
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
							{idx < steps.length - 1 && (
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

export function ImportReviewPanel({
	preview,
	sourceLabel,
}: {
	preview: ImportPreview;
	sourceLabel?: ReactNode;
}) {
	const hasErrors = preview.errors.length > 0;
	const hasWarnings = preview.warnings.length > 0;
	const reviewStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

	return (
		<div className="space-y-6">
			{sourceLabel && (
				<p className="text-center text-sm text-muted">
					{sourceLabel}
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
							Có {preview.errors.length} lỗi — cần sửa trước khi import
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

				{(preview.badExampleWarnings?.length ?? 0) > 0 && (
					<div className="mt-4 space-y-3">
						<p className="text-sm font-bold text-foreground">Chi tiết lỗi câu ví dụ</p>
						{Object.entries(
							(preview.badExampleWarnings ?? []).reduce<
								Record<string, NonNullable<ImportPreview['badExampleWarnings']>>
							>((groups, item) => {
								const key = `${item.rowNumber}::${item.simplified}`;
								const list = groups[key] ?? [];
								list.push(item);
								groups[key] = list;
								return groups;
							}, {}),
						).map(([key, items]) => {
							const first = items?.[0];
							if (!first) return null;
							return (
								<div
									key={key}
									className="rounded-lg border border-border bg-surface-container px-3 py-2"
								>
									<p className="text-sm font-semibold text-foreground">
										Dòng {first.rowNumber} ({first.simplified})
									</p>
									<ul className="mt-2 space-y-1.5">
										{items?.map((item) => (
											<li key={`${item.exampleIndex}-${item.sentence}`} className="text-xs text-accent">
												<span className="font-medium">vi_du_{item.exampleIndex}</span>
												{' — '}
												{item.reason}
												{item.sentence && (
													<span className="mt-0.5 block font-mono text-foreground-secondary">
														{item.sentence}
													</span>
												)}
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
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
		</div>
	);
}

export function ImportDonePanel({
	result,
	onReset,
	resetLabel,
}: {
	result: ImportPreview;
	onReset: () => void;
	resetLabel: string;
}) {
	return (
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
				<button type="button" onClick={onReset} className="btn-secondary">
					<MaterialIcon name="upload_file" size={16} />
					{resetLabel}
				</button>
			</div>
		</div>
	);
}
