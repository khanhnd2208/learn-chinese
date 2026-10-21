'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import SmartStudyButton from '@/components/chinese/SmartStudyButton';
import StudyModeMenu from '@/components/chinese/StudyModeMenu';
import WordStatusBadge from '@/components/chinese/WordStatusBadge';
import type { CnWordSetDTO } from '@/types/chinese';

type Filter = 'all' | 'new' | 'learning' | 'mastered';

function bucket(state: string | null): Filter {
	if (!state || state === 'new') return 'new';
	if (state === 'mastered') return 'mastered';
	return 'learning';
}

export default function SetStudyView({ set }: { set: CnWordSetDTO }) {
	const [tab, setTab] = useState('words');
	const [filter, setFilter] = useState<Filter>('all');
	const words = useMemo(
		() => set.items.filter((item) => filter === 'all' || bucket(item.progressState) === filter),
		[filter, set.items],
	);

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					{set.level != null && <Badge>HSK {set.level}</Badge>}
					{set.legacy && <Badge>Bộ cũ</Badge>}
					<span className="text-sm text-muted">{set.itemCount} từ</span>
				</div>
				<h1 className="text-3xl font-black text-foreground">{set.title}</h1>
				{set.description && <p className="text-sm text-muted">{set.description}</p>}
				<p className="text-sm text-muted">
					{set.newCount} mới · {set.learningCount} đang học · {set.masteredCount} đã nắm
				</p>
				<SmartStudyButton
					setId={set.id}
					dueCount={set.srsActive ? set.dueCount : 0}
					newCount={set.newCount}
					enrolled={set.enrolled}
				/>
				{set.enrolled && <StudyModeMenu setId={set.id} />}
			</header>

			<Tabs value={tab} onValueChange={setTab}>
				<TabsList>
					<TabsTrigger value="words">Từ vựng</TabsTrigger>
					<TabsTrigger value="progress">Tiến độ</TabsTrigger>
				</TabsList>
				<TabsContent value="words">
					<div className="mb-4 flex flex-wrap gap-2">
						{([
							['all', 'Tất cả'],
							['new', 'Mới'],
							['learning', 'Đang học'],
							['mastered', 'Đã nắm'],
						] as const).map(([id, label]) => (
							<button
								key={id}
								type="button"
								onClick={() => setFilter(id)}
								className={`rounded-pill px-3 py-1 text-xs font-bold ${filter === id ? 'bg-accent text-accent-foreground' : 'bg-surface-container text-foreground-secondary'}`}
							>
								{label}
							</button>
						))}
					</div>
					<ul className="divide-y divide-border rounded-card border border-border bg-surface">
						{words.map((item) => (
							<li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
								<div className="min-w-0">
									{item.word ? (
										<Link href={`/words/${item.word.id}?setId=${set.id}`} className="hanzi-lg text-foreground hover:text-accent">
											{item.word.simplified}
										</Link>
									) : (
										<p className="hanzi-lg text-muted">{item.rawTerm}</p>
									)}
									{item.word && <p className="text-sm text-muted">{item.word.meaningVi}</p>}
								</div>
								<WordStatusBadge state={item.progressState ?? 'new'} />
							</li>
						))}
					</ul>
				</TabsContent>
				<TabsContent value="progress">
					<Card>
						<CardContent className="grid grid-cols-3 gap-4 text-center">
							<div>
								<p className="text-2xl font-black text-foreground">{set.newCount}</p>
								<p className="text-xs text-muted">Mới</p>
							</div>
							<div>
								<p className="text-2xl font-black text-foreground">{set.learningCount}</p>
								<p className="text-xs text-muted">Đang học</p>
							</div>
							<div>
								<p className="text-2xl font-black text-success">{set.masteredCount}</p>
								<p className="text-xs text-muted">Đã nắm</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
