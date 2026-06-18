"use client";

import { useCallback, useEffect, useState } from 'react';
import { diffHanziAnalysisResults } from '@/lib/chinese/hanziAiDiff';
import type { HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';

interface AnalysisListItem {
	id: string;
	normalizedTerm: string;
	contentStatus: string;
	contentVersion: number;
	openReportCount: number;
	editedByHuman: boolean;
	updatedAt: string;
	_count: { revisions: number; reports: number; jobs: number };
}

interface RevisionItem {
	id: string;
	revisionNumber: number;
	candidateStatus: string;
	kind: string;
	resultJson: unknown;
	createdAt: string;
}

interface AttemptItem { id: string; errorCode: string | null; latencyMs: number; rawOutput: string | null; kind: string; status: string }
interface ReportItem { id: string; reason: string; note: string; status: string; updatedAt: string }
interface AdminDetail extends AnalysisListItem {
	currentRevision: RevisionItem | null;
	revisions: RevisionItem[];
	reports: ReportItem[];
	jobs: Array<{ id: string; status: string; failureCode: string | null; attempts: AttemptItem[] }>;
}

const WORD_VERIFY_FIELDS = ['pinyin', 'hanViet', 'meaningVi', 'partOfSpeech'] as const;

const HANZI_VERIFY_FIELDS = ['pinyin', 'hanViet', 'meaningVi', 'radical', 'components'] as const;

export default function HanziAiAdminPanel() {
	const [items, setItems] = useState<AnalysisListItem[]>([]);
	const [health, setHealth] = useState<{ configured: boolean; model: string; lastSuccessAt: string | null; lastErrorCode: string | null } | null>(null);
	const [detail, setDetail] = useState<AdminDetail | null>(null);
	const [editJson, setEditJson] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [verifyType, setVerifyType] = useState<'word' | 'hanzi'>('word');
	const [verifyId, setVerifyId] = useState('');
	const [verifySystem, setVerifySystem] = useState<string[]>([]);
	const [verifyExpert, setVerifyExpert] = useState<string[]>([]);

	const refresh = useCallback(async () => {
		const response = await fetch('/api/admin/hanzi-ai');
		const json = await response.json() as { ok: boolean; data?: { analyses: AnalysisListItem[]; health: typeof health } };
		if (json.ok) { setItems(json.data?.analyses ?? []); setHealth(json.data?.health ?? null); }
	}, []);

	const openDetail = async (id: string) => {
		const response = await fetch(`/api/admin/hanzi-ai/${id}`);
		const json = await response.json() as { ok: boolean; data?: AdminDetail; error?: string };
		if (!json.ok) return setMessage(json.error ?? 'Không đọc được chi tiết');
		setDetail(json.data ?? null);
		setEditJson(json.data?.currentRevision ? JSON.stringify(json.data.currentRevision.resultJson, null, 2) : '');
	};

	useEffect(() => {
		const timer = setTimeout(() => void refresh(), 0);
		return () => clearTimeout(timer);
	}, [refresh]);

	const action = async (body: Record<string, unknown>) => {
		if (!detail || busy) return;
		setBusy(true); setMessage(null);
		try {
			const response = await fetch(`/api/admin/hanzi-ai/${detail.id}`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
			});
			const json = await response.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Không thể cập nhật');
			await Promise.all([openDetail(detail.id), refresh()]);
			setMessage('Đã cập nhật');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không thể cập nhật');
		} finally { setBusy(false); }
	};

	const adminAction = async (body: Record<string, unknown>) => {
		setBusy(true); setMessage(null);
		try {
			const response = await fetch('/api/admin/hanzi-ai', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
			});
			const json = await response.json() as { ok: boolean; data?: { purged?: number; reconciled?: number }; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Không thể thực hiện');
			setMessage(body.action === 'purge_attempts' ? `Đã xóa ${json.data?.purged ?? 0} attempt cũ` : `Đã reconcile ${json.data?.reconciled ?? 0} analysis`);
			await refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Lỗi');
		} finally { setBusy(false); }
	};

	const submitVerification = async () => {
		setBusy(true); setMessage(null);
		try {
			const response = await fetch('/api/admin/hanzi-ai/verify', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: verifyType, id: verifyId.trim(),
					systemCheckedFields: verifySystem, expertVerifiedFields: verifyExpert,
				}),
			});
			const json = await response.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Không lưu được');
			setMessage('Đã cập nhật xác minh curated');
			await refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Lỗi');
		} finally { setBusy(false); }
	};

	const currentResult = detail?.currentRevision?.resultJson as HanziAnalysisResult | undefined;
	const verifyFields = verifyType === 'word' ? WORD_VERIFY_FIELDS : HANZI_VERIFY_FIELDS;

	return (
		<section className="mt-8 rounded-xl border border-border p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div><h2 className="font-bold">Hanzi AI governance</h2><p className="mt-1 text-xs text-muted">Revision, candidate, report và provider health.</p></div>
				<div className="flex flex-wrap gap-2">
					<button type="button" disabled={busy} onClick={() => void adminAction({ action: 'reconcile' })} className="btn-secondary text-xs">Reconcile all</button>
					<button type="button" disabled={busy} onClick={() => void adminAction({ action: 'purge_attempts' })} className="btn-secondary text-xs">Purge attempts 30d</button>
				</div>
				{health && <div className="text-right text-xs"><p className={health.configured ? 'text-success' : 'text-accent'}>{health.configured ? 'Provider đã cấu hình' : 'Thiếu API key'}</p><p>{health.model}</p><p className="text-muted">{health.lastErrorCode ?? 'Không có lỗi gần nhất'}</p></div>}
			</div>

			<div className="mt-6 rounded-lg border border-border p-4">
				<p className="label-caps mb-3">Xác minh curated (word/hanzi)</p>
				<div className="flex flex-wrap gap-3 text-sm">
					<select value={verifyType} onChange={(e) => { setVerifyType(e.target.value as 'word' | 'hanzi'); setVerifySystem([]); setVerifyExpert([]); }} className="rounded border border-border bg-background px-2 py-1">
						<option value="word">CnWord</option>
						<option value="hanzi">CnHanzi</option>
					</select>
					<input value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Record ID (cuid)" className="min-w-[200px] flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-xs" />
				</div>
				<div className="mt-3 flex flex-wrap gap-4 text-xs">
					{verifyFields.map((field) => (
						<label key={field} className="flex items-center gap-1">
							<input type="checkbox" checked={verifySystem.includes(field)} onChange={(e) => setVerifySystem((prev) => e.target.checked ? [...prev, field] : prev.filter((f) => f !== field))} />
							sys:{field}
						</label>
					))}
				</div>
				<div className="mt-2 flex flex-wrap gap-4 text-xs">
					{verifyFields.map((field) => (
						<label key={`ex-${field}`} className="flex items-center gap-1">
							<input type="checkbox" checked={verifyExpert.includes(field)} onChange={(e) => setVerifyExpert((prev) => e.target.checked ? [...prev, field] : prev.filter((f) => f !== field))} />
							expert:{field}
						</label>
					))}
				</div>
				<button type="button" disabled={busy || !verifyId.trim()} onClick={() => void submitVerification()} className="btn-secondary mt-3 text-xs">Lưu xác minh</button>
			</div>

			<div className="mt-4 max-h-72 overflow-auto rounded-lg border border-border">
				<table className="w-full text-sm"><thead className="bg-surface"><tr><th className="p-2 text-left">Từ</th><th className="p-2">Trạng thái</th><th className="p-2">Reports</th><th className="p-2">Revisions</th></tr></thead>
					<tbody>{items.map((item) => <tr key={item.id} className="cursor-pointer border-t border-border hover:bg-surface-hover" onClick={() => void openDetail(item.id)}><td className="hanzi-lg p-2 text-xl font-bold">{item.normalizedTerm}</td><td className="p-2 text-center">{item.contentStatus}{item.editedByHuman ? ' · human' : ''}</td><td className="p-2 text-center">{item.openReportCount}</td><td className="p-2 text-center">{item._count.revisions}</td></tr>)}</tbody>
				</table>
			</div>
			{detail && (
				<div className="mt-6 space-y-4 border-t border-border pt-5">
					<div className="flex flex-wrap items-center justify-between gap-3"><h3 className="hanzi-lg text-3xl font-black">{detail.normalizedTerm}</h3><span className="text-xs">v{detail.contentVersion} · {detail.contentStatus}</span></div>
					<div className="flex flex-wrap gap-2">
						<button type="button" disabled={busy} onClick={() => void action({ action: 'regenerate' })} className="btn-primary">Tạo candidate mới</button>
						<button type="button" disabled={busy} onClick={() => void action({ action: detail.contentStatus === 'blocked' ? 'unblock' : 'block', expectedContentVersion: detail.contentVersion })} className="btn-secondary">{detail.contentStatus === 'blocked' ? 'Bỏ chặn' : 'Chặn'}</button>
					</div>
					{detail.currentRevision && <div><p className="label-caps mb-2">Chỉnh revision hiện hành</p><textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={12} className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs" /><button type="button" disabled={busy} onClick={() => { try { void action({ action: 'edit', expectedContentVersion: detail.contentVersion, result: JSON.parse(editJson) }); } catch { setMessage('JSON không hợp lệ'); } }} className="btn-secondary mt-2">Validate và lưu revision</button></div>}
					<div>
						<p className="label-caps mb-2">Candidates</p>
						{detail.revisions.filter((r) => r.candidateStatus === 'candidate').map((revision) => {
							const candidate = revision.resultJson as HanziAnalysisResult;
							const diffs = diffHanziAnalysisResults(currentResult ?? null, candidate);
							return (
								<div key={revision.id} className="mb-4 rounded-lg border border-border p-3 text-sm">
									<p>Revision #{revision.revisionNumber} · {revision.kind}</p>
									{diffs.length > 0 ? (
										<table className="mt-2 w-full text-xs"><thead><tr><th className="p-1 text-left">Trường</th><th className="p-1 text-left">Hiện tại</th><th className="p-1 text-left">Candidate</th></tr></thead>
											<tbody>{diffs.map((d) => <tr key={d.field} className="border-t border-border"><td className="p-1 font-bold">{d.field}</td><td className="p-1">{d.current}</td><td className="p-1 text-accent">{d.candidate}</td></tr>)}</tbody>
										</table>
									) : <p className="mt-2 text-muted">Không có khác biệt trên các trường chính.</p>}
									<div className="mt-2 flex gap-2">
										<button type="button" onClick={() => void action({ action: 'accept_candidate', revisionId: revision.id, expectedContentVersion: detail.contentVersion })} className="btn-primary">Chấp nhận</button>
										<button type="button" onClick={() => void action({ action: 'reject_candidate', revisionId: revision.id })} className="btn-secondary">Từ chối</button>
									</div>
								</div>
							);
						})}
					</div>
					<div>
						<p className="label-caps mb-2">Provider attempts (raw output)</p>
						{detail.jobs.flatMap((job) => job.attempts.map((attempt) => (
							<details key={attempt.id} className="mb-2 rounded border border-border p-2 text-xs">
								<summary>{job.status} · {attempt.kind} · {attempt.errorCode ?? 'ok'} · {attempt.latencyMs}ms</summary>
								{attempt.rawOutput && (
									<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 font-mono text-[11px]">{attempt.rawOutput}</pre>
								)}
							</details>
						)))}
					</div>
					<div><p className="label-caps mb-2">Reports</p>{detail.reports.map((report) => <div key={report.id} className="mb-2 rounded-lg border border-border p-3 text-sm"><p className="font-bold">{report.reason} · {report.status}</p><p>{report.note}</p>{report.status === 'open' && <div className="mt-2 flex gap-2"><button type="button" onClick={() => void action({ action: 'resolve_report', reportId: report.id })} className="btn-secondary">Đã xử lý</button><button type="button" onClick={() => void action({ action: 'dismiss_report', reportId: report.id })} className="btn-secondary">Bỏ qua</button></div>}</div>)}</div>
				</div>
			)}
			{message && <p className="mt-3 text-sm text-muted">{message}</p>}
		</section>
	);
}
