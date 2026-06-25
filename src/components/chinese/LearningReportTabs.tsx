'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InfernoReportPanel from '@/components/chinese/InfernoReportPanel';

const TABS = [
	{ id: 'srs' as const, label: 'SRS' },
	{ id: 'inferno' as const, label: 'Địa Ngục' },
];

type TabId = (typeof TABS)[number]['id'];

interface Props {
	srsPanel: ReactNode;
}

export default function LearningReportTabs({ srsPanel }: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab: TabId = searchParams.get('tab') === 'inferno' ? 'inferno' : 'srs';

	const selectTab = useCallback((next: TabId) => {
		router.replace(next === 'inferno' ? '/dashboard?tab=inferno' : '/dashboard', { scroll: false });
	}, [router]);

	return (
		<div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
			<section className="animate-section-in">
				<span className="label-caps tracking-widest">Học tập</span>
				<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
					Báo cáo học tập
				</h1>
				<p className="mt-1 text-sm text-foreground-secondary">
					Theo dõi tiến độ SRS và thành tích Địa Ngục
				</p>
			</section>

			<nav className="hide-scrollbar flex gap-2 overflow-x-auto border-b border-border pb-px snap-x">
				{TABS.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => selectTab(t.id)}
						className={`snap-start whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-bold transition-colors ${
							tab === t.id
								? 'border border-b-0 border-border bg-surface text-accent'
								: 'text-muted hover:text-foreground'
						}`}
					>
						{t.label}
					</button>
				))}
			</nav>

			{tab === 'srs' ? srsPanel : <InfernoReportPanel />}
		</div>
	);
}
