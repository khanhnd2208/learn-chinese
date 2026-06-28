"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetWordsTable from '@/app/(app)/sets/[id]/SetWordsTable';
import type { CnWordSetDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
	allSets: Array<{ id: string; title: string }>;
}

export default function SetManagePanel({ set, allSets }: Props) {
	const router = useRouter();
	const [newTerms, setNewTerms] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showAddTerms, setShowAddTerms] = useState(false);

	const otherSets = allSets.filter((s) => s.id !== set.id);

	const addTerms = async () => {
		const terms = newTerms.split('\n').map((t) => t.trim()).filter(Boolean);
		if (!terms.length) return;
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch(`/api/sets/${set.id}/items`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ terms }),
			});
			const json = await res.json() as { ok: boolean; error?: string };
			if (!json.ok) throw new Error(json.error ?? 'Lỗi');
			setNewTerms('');
			setShowAddTerms(false);
			setSuccess(`Đã thêm ${terms.length} từ vào bộ`);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Lỗi');
		} finally {
			setLoading(false);
		}
	};

	const handleTableMessage = (message: { success?: string; error?: string }) => {
		setSuccess(message.success ?? null);
		setError(message.error ?? null);
	};

	return (
		<div className="hidden space-y-6 border-t border-border pt-8 md:block">
			<section className="flex items-center justify-between">
				<h2 className="text-lg font-extrabold text-foreground">Thêm từ vào bộ</h2>
				<button type="button" onClick={() => setShowAddTerms(!showAddTerms)} className="btn-secondary">
					<MaterialIcon name="add" size={16} />
					Thêm từ
				</button>
			</section>

			{showAddTerms && (
				<div className="card-paper space-y-3 p-4">
					<textarea
						value={newTerms}
						onChange={(e) => setNewTerms(e.target.value)}
						rows={4}
						placeholder="Mỗi dòng một từ"
						className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
					/>
					<button type="button" onClick={addTerms} disabled={loading || !newTerms.trim()} className="btn-primary">
						Thêm vào bộ
					</button>
				</div>
			)}

			{success && (
				<p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground-secondary">
					{success}
				</p>
			)}
			{error && <p className="text-sm text-accent">{error}</p>}

			<SetWordsTable
				set={set}
				otherSets={otherSets}
				onMessage={handleTableMessage}
			/>
		</div>
	);
}
