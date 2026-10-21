'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface Props {
	setId: string;
	level: number | null;
	sortOrder: number;
}

export default function SetCatalogForm({ setId, level, sortOrder }: Props) {
	const router = useRouter();
	const [levelValue, setLevelValue] = useState(level == null ? '' : String(level));
	const [orderValue, setOrderValue] = useState(String(sortOrder));
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);

	return (
		<Card>
			<CardContent>
				<form
					className="flex flex-col gap-3 sm:flex-row sm:items-end"
					onSubmit={(event) => {
						event.preventDefault();
						setLoading(true);
						setMessage('');
						void fetch(`/api/sets/${setId}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								level: levelValue === '' ? null : Number(levelValue),
								sortOrder: Number(orderValue),
							}),
						})
							.then(async (res) => {
								const json = await res.json() as { ok: boolean; error?: string };
								if (!json.ok) throw new Error(json.error ?? 'Không lưu được');
								setMessage('Đã lưu mức và thứ tự.');
								router.refresh();
							})
							.catch((reason: unknown) => {
								setMessage(reason instanceof Error ? reason.message : 'Không lưu được');
							})
							.finally(() => setLoading(false));
					}}
				>
					<label className="text-sm font-bold text-foreground">
						HSK
						<input
							value={levelValue}
							onChange={(event) => setLevelValue(event.target.value)}
							inputMode="numeric"
							placeholder="1–9"
							className="mt-1 block h-10 w-24 rounded-control border border-border bg-background px-3"
						/>
					</label>
					<label className="text-sm font-bold text-foreground">
						Thứ tự
						<input
							value={orderValue}
							onChange={(event) => setOrderValue(event.target.value)}
							inputMode="numeric"
							className="mt-1 block h-10 w-24 rounded-control border border-border bg-background px-3"
						/>
					</label>
					<Button type="submit" loading={loading}>Lưu</Button>
				</form>
				{message && <p className="mt-2 text-sm text-muted">{message}</p>}
			</CardContent>
		</Card>
	);
}
