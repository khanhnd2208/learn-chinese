"use client";

import { useState } from 'react';
import SetWordsTable from '@/app/(app)/sets/[id]/SetWordsTable';
import SetAddWordsPanel from '@/app/(app)/sets/[id]/SetAddWordsPanel';
import type { CnWordSetDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
	allSets: Array<{ id: string; title: string }>;
}

export default function SetManagePanel({ set, allSets }: Props) {
	const otherSets = allSets.filter((s) => s.id !== set.id);
	const [tableMessage, setTableMessage] = useState<{ success?: string; error?: string } | null>(null);

	return (
		<div className="space-y-6 border-t border-border pt-8">
			<SetAddWordsPanel setId={set.id} setTitle={set.title} />

			{tableMessage?.success && (
				<p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground-secondary">
					{tableMessage.success}
				</p>
			)}
			{tableMessage?.error && (
				<p className="text-sm text-accent">{tableMessage.error}</p>
			)}

			<SetWordsTable
				set={set}
				otherSets={otherSets}
				onMessage={setTableMessage}
			/>
		</div>
	);
}
