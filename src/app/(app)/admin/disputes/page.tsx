'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';

interface DisputeGroup {
	exampleId: string;
	answer: string;
	hanzi: string;
	meaningVi: string;
	targetWord: string;
	targetMeaningVi: string;
	userCount: number;
	latestAt: string;
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

export default function AdminDisputesPage() {
	const [groups, setGroups] = useState<DisputeGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyKey, setBusyKey] = useState<string | null>(null);

	const load = useCallback(async () => {
		const res = await fetch('/api/admin/example-disputes');
		const json = await res.json() as { ok: boolean; data?: { groups: DisputeGroup[] }; error?: string };
		if (!json.ok) throw new Error(json.error ?? 'Không tải được hàng chờ');
		setGroups(json.data?.groups ?? []);
		setError(null);
	}, []);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch('/api/admin/example-disputes');
				const json = await res.json() as { ok: boolean; data?: { groups: DisputeGroup[] }; error?: string };
				if (cancelled) return;
				if (!json.ok) throw new Error(json.error ?? 'Không tải được hàng chờ');
				setGroups(json.data?.groups ?? []);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được hàng chờ');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const resolve = async (group: DisputeGroup, action: 'accept' | 'reject') => {
		const key = `${group.exampleId}:${group.answer}`;
		setBusyKey(key);
		setError(null);
		try {
			const res = await fetch('/api/admin/example-disputes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exampleId: group.exampleId, answer: group.answer, action }),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Không xử lý được');
			await load();
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không xử lý được');
		} finally {
			setBusyKey(null);
		}
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-black text-foreground">Kháng nghị câu điền từ</h1>
					<p className="mt-2 text-sm text-foreground-secondary">
						Người học cho rằng đáp án của họ cũng đúng. Chấp nhận để lần sau câu đó chấm đúng.
					</p>
				</div>
				<Link href="/admin" className="text-sm font-bold text-accent hover:underline">Về quản trị</Link>
			</div>

			{error && <p className="text-sm text-error">{error}</p>}
			{loading && <p className="text-sm text-muted">Đang tải...</p>}
			{!loading && groups.length === 0 && (
				<Card>
					<CardContent>
						<p className="text-sm text-foreground-secondary">Không có kháng nghị đang chờ.</p>
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				{groups.map((group) => {
					const key = `${group.exampleId}:${group.answer}`;
					return (
						<Card key={key}>
							<CardHeader>
								<CardTitle className="hanzi-lg text-xl">{highlightTarget(group.hanzi, group.targetWord)}</CardTitle>
								<p className="text-sm text-foreground-secondary">{group.meaningVi}</p>
							</CardHeader>
							<CardContent className="space-y-2">
								<p className="text-sm text-foreground">
									Từ đích: <span className="hanzi-lg font-bold">{group.targetWord}</span>
									<span className="text-muted"> · {group.targetMeaningVi}</span>
								</p>
								<p className="text-sm text-foreground">
									Đáp án người học: <span className="hanzi-lg font-bold text-accent">{group.answer}</span>
								</p>
								<p className="text-xs text-muted">
									{group.userCount} người đã báo · gần nhất {new Date(group.latestAt).toLocaleString('vi-VN')}
								</p>
							</CardContent>
							<CardFooter>
								<Button
									size="sm"
									disabled={busyKey === key}
									onClick={() => void resolve(group, 'accept')}
								>
									Chấp nhận
								</Button>
								<Button
									variant="secondary"
									size="sm"
									disabled={busyKey === key}
									onClick={() => void resolve(group, 'reject')}
								>
									Từ chối
								</Button>
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
