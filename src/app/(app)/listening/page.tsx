"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { CnWordSetListItemDTO } from '@/types/chinese';

export default function ChineseListeningPage() {
	const [sets, setSets] = useState<CnWordSetListItemDTO[]>([]);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/sets');
			const json = await res.json() as { ok: boolean; data?: { items: CnWordSetListItemDTO[] } };
			if (json.ok) setSets(json.data?.items ?? []);
		})();
	}, []);

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
			<PageBreadcrumb crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Luyện nghe' }]} />

			<section>
				<span className="label-caps tracking-widest">Luyện tập</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Luyện nghe</h1>
				<p className="mt-2 text-sm text-foreground-secondary">
					5 dạng: nghe chọn Hán tự, nghĩa, pinyin, gõ pinyin, điền từ vào câu.
				</p>
			</section>

			{sets.length === 0 ? (
				<div className="card-paper p-8 text-center">
					<MaterialIcon name="hearing" className="mx-auto text-muted" size={48} />
					<p className="mt-4 text-sm text-muted">Tạo bộ từ trước để luyện nghe.</p>
					<Link href="/sets/create" className="btn-primary mt-4">Tạo bộ từ</Link>
				</div>
			) : (
				<div className="grid gap-3">
					{sets.map((set) => (
						<Link
							key={set.id}
							href={`/practice/${set.id}?mode=listening`}
							className="card-paper flex items-center justify-between p-4"
						>
							<div className="flex items-center gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-dim">
									<MaterialIcon name="headphones" className="text-accent" size={24} />
								</div>
								<div>
									<p className="font-bold text-foreground">{set.title}</p>
									<p className="text-xs text-muted">{set.itemCount} từ</p>
								</div>
							</div>
							<MaterialIcon name="chevron_right" className="text-muted" size={20} />
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
