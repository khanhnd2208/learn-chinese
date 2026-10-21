'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';

interface FlaggedExample {
	exampleId: string;
	hanzi: string;
	meaningVi: string;
	targetWord: string;
	attempts: number;
	cleanRate: number;
	revealRate: number;
	disputeUsers: number;
	topWrongAnswers: string[];
	noFillExamplesLeft: boolean;
}

function percent(rate: number) {
	return `${Math.round(rate * 100)}%`;
}

function highlightTarget(hanzi: string, target: string) {
	const index = target ? hanzi.indexOf(target) : -1;
	if (index < 0) return hanzi;
	return (
		<>
			{hanzi.slice(0, index)}
			<strong className="text-accent">{target}</strong>
			{hanzi.slice(index + target.length)}
		</>
	);
}

export default function AdminExampleQualityPage() {
	const [examples, setExamples] = useState<FlaggedExample[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [drafts, setDrafts] = useState<Record<string, { hanzi: string; pinyin: string; meaningVi: string }>>({});

	const load = useCallback(async () => {
		const res = await fetch('/api/admin/example-quality');
		const json = await res.json() as { ok: boolean; data?: { examples: FlaggedExample[] }; error?: string };
		if (!json.ok) throw new Error(json.error ?? 'Không tải được danh sách');
		setExamples(json.data?.examples ?? []);
		setError(null);
	}, []);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch('/api/admin/example-quality');
				const json = await res.json() as { ok: boolean; data?: { examples: FlaggedExample[] }; error?: string };
				if (cancelled) return;
				if (!json.ok) throw new Error(json.error ?? 'Không tải được danh sách');
				setExamples(json.data?.examples ?? []);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const act = async (exampleId: string, body: Record<string, unknown>, done: string) => {
		setBusyId(exampleId);
		setError(null);
		setNotice(null);
		try {
			const res = await fetch('/api/admin/example-quality', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exampleId, ...body }),
			});
			const json = await res.json() as {
				ok: boolean;
				error?: string;
				data?: { restored: number; noFillExamplesLeft: boolean };
			};
			if (!json.ok) throw new Error(json.error ?? 'Không xử lý được');
			const restored = json.data?.restored ?? 0;
			const warning = json.data?.noFillExamplesLeft ? ' Từ này không còn câu điền từ nào.' : '';
			setNotice(`${done} Đã trả bậc cho ${restored} người.${warning}`);
			await load();
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không xử lý được');
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-black text-foreground">Câu cần sửa</h1>
					<p className="mt-2 text-sm text-foreground-secondary">
						Câu điền từ nhiều người làm sai khi chưa nghe, hoặc nhiều người kháng nghị.
					</p>
				</div>
				<Link href="/admin" className="text-sm font-bold text-accent hover:underline">Về quản trị</Link>
			</div>

			{error && <p className="text-sm text-error">{error}</p>}
			{notice && <p className="text-sm text-foreground-secondary">{notice}</p>}
			{loading && <p className="text-sm text-muted">Đang tải...</p>}
			{!loading && examples.length === 0 && (
				<Card>
					<CardContent>
						<p className="text-sm text-foreground-secondary">Không có câu nào bị gắn cờ.</p>
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				{examples.map((example) => {
					const draft = drafts[example.exampleId] ?? {
						hanzi: example.hanzi,
						pinyin: '',
						meaningVi: example.meaningVi,
					};
					return (
						<Card key={example.exampleId}>
							<CardHeader>
								<CardTitle className="hanzi-lg text-xl">{highlightTarget(example.hanzi, example.targetWord)}</CardTitle>
								<p className="text-sm text-foreground-secondary">{example.meaningVi}</p>
							</CardHeader>
							<CardContent className="space-y-2">
								<p className="text-sm text-foreground">
									Từ đích: <span className="hanzi-lg font-bold">{example.targetWord}</span>
								</p>
								<p className="text-sm text-foreground-secondary">
									{example.attempts} lượt · đúng không nghe {percent(example.cleanRate)} · phải nghe {percent(example.revealRate)} · {example.disputeUsers} người kháng nghị
								</p>
								{example.topWrongAnswers.length > 0 && (
									<p className="text-sm text-foreground">
										Đáp án sai hay gặp: {example.topWrongAnswers.join(' · ')}
									</p>
								)}
								{example.noFillExamplesLeft && (
									<p className="text-sm text-warning">Từ này không còn câu điền từ nào.</p>
								)}
								<div className="grid gap-2 pt-2">
									<Input
										inputSize="sm"
										value={draft.hanzi}
										aria-label="Câu Hán"
										onChange={(event) => setDrafts((current) => ({
											...current,
											[example.exampleId]: { ...draft, hanzi: event.target.value },
										}))}
									/>
									<Input
										inputSize="sm"
										value={draft.pinyin}
										aria-label="Pinyin"
										placeholder="Pinyin cả câu"
										onChange={(event) => setDrafts((current) => ({
											...current,
											[example.exampleId]: { ...draft, pinyin: event.target.value },
										}))}
									/>
									<Input
										inputSize="sm"
										value={draft.meaningVi}
										aria-label="Nghĩa tiếng Việt"
										onChange={(event) => setDrafts((current) => ({
											...current,
											[example.exampleId]: { ...draft, meaningVi: event.target.value },
										}))}
									/>
								</div>
							</CardContent>
							<CardFooter className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="destructive"
									disabled={busyId === example.exampleId}
									onClick={() => void act(example.exampleId, { action: 'retire' }, 'Đã rút câu khỏi vòng hỏi.')}
								>
									Rút câu
								</Button>
								<Button
									size="sm"
									disabled={busyId === example.exampleId}
									onClick={() => void act(example.exampleId, {
										action: 'edit',
										hanzi: draft.hanzi,
										pinyin: draft.pinyin,
										meaningVi: draft.meaningVi,
									}, 'Đã sửa câu.')}
								>
									Lưu câu
								</Button>
								<Button
									size="sm"
									variant="secondary"
									disabled={busyId === example.exampleId || example.topWrongAnswers.length === 0}
									onClick={() => void act(example.exampleId, {
										action: 'accept-answers',
										answers: example.topWrongAnswers,
									}, 'Đã chấp nhận đáp án sai hay gặp.')}
								>
									Chấp nhận đáp án sai
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={busyId === example.exampleId}
									onClick={() => void act(example.exampleId, { action: 'dismiss' }, 'Đã giữ câu này.')}
								>
									Câu ổn
								</Button>
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
