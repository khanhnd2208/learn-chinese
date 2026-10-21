'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InfernoReportPanel from '@/components/chinese/InfernoReportPanel';
import { experimentalModesVisible } from '@/config/navigation';

const TABS = [
	{ id: 'srs' as const, label: 'Ôn tập' },
	{ id: 'inferno' as const, label: 'Địa Ngục' },
];

type TabId = (typeof TABS)[number]['id'];

interface Props {
	srsPanel: ReactNode;
}

export default function LearningReportTabs({ srsPanel }: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const infernoOpen = experimentalModesVisible() && searchParams.get('tab') === 'inferno';
	const tab: TabId = infernoOpen ? 'inferno' : 'srs';

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
					{infernoOpen ? 'Thành tích Địa Ngục — chế độ thử nghiệm' : 'Theo dõi tiến độ ôn tập'}
				</p>
			</section>

			{infernoOpen && (
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
			)}

			{tab === 'srs' ? srsPanel : <InfernoReportPanel />}
		</div>
	);
}
