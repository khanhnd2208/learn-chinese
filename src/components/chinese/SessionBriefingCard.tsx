'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

export interface BriefingStat {
	label: string;
	value: string | number;
	sub?: string;
	highlight?: boolean;
}

interface Props {
	title: string;
	icon: string;
	theme?: 'accent' | 'warning';
	heroValue: string | number;
	heroLabel: string;
	heroSub?: string;
	stats?: BriefingStat[];
	insight?: string;
	primaryLabel: string;
	onPrimary: () => void;
	primaryDisabled?: boolean;
	secondaryLinks?: Array<{ href: string; label: string; icon: string }>;
	extra?: ReactNode;
}

const themeClasses = {
	accent: {
		icon: 'text-accent',
		hero: 'text-accent',
		insight: 'border-accent/20 bg-accent/5',
		btn: 'btn-primary',
	},
	warning: {
		icon: 'text-warning',
		hero: 'text-warning',
		insight: 'border-warning/20 bg-warning/5',
		btn: 'btn-primary',
	},
} as const;

export default function SessionBriefingCard({
	title,
	icon,
	theme = 'accent',
	heroValue,
	heroLabel,
	heroSub,
	stats = [],
	insight,
	primaryLabel,
	onPrimary,
	primaryDisabled = false,
	secondaryLinks = [],
	extra,
}: Props) {
	const t = themeClasses[theme];

	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<div className="card-paper w-full p-6 sm:p-8">
				<div className="flex items-center gap-2">
					<MaterialIcon name={icon} className={t.icon} size={28} filled={theme === 'warning'} />
					<h1 className="text-xl font-extrabold text-foreground">{title}</h1>
				</div>

				<div className="mt-6 text-center">
					<p className={`text-5xl font-black tabular-nums ${t.hero}`}>{heroValue}</p>
					<p className="mt-1 text-sm font-medium text-foreground-secondary">{heroLabel}</p>
					{heroSub && <p className="mt-1 text-xs text-muted">{heroSub}</p>}
				</div>

				{stats.length > 0 && (
					<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
						{stats.map((stat) => (
							<div key={stat.label} className="rounded-lg border border-border bg-surface px-3 py-2.5">
								<p className="label-caps !text-[10px] text-muted">{stat.label}</p>
								<p className={`mt-0.5 text-lg font-black tabular-nums ${
									stat.highlight ? t.hero : 'text-foreground'
								}`}>
									{stat.value}
								</p>
								{stat.sub && <p className="mt-0.5 text-[10px] text-muted">{stat.sub}</p>}
							</div>
						))}
					</div>
				)}

				{extra && <div className="mt-4">{extra}</div>}

				{insight && (
					<p className={`mt-5 rounded-lg border px-4 py-2.5 text-sm text-foreground-secondary ${t.insight}`}>
						{insight}
					</p>
				)}

				<div className="mt-6 flex flex-wrap justify-center gap-3">
					<button
						type="button"
						onClick={onPrimary}
						disabled={primaryDisabled}
						className={`${t.btn} inline-flex items-center gap-2 disabled:opacity-50`}
					>
						<MaterialIcon name="play_arrow" size={18} />
						{primaryLabel}
					</button>
					{secondaryLinks.map((link) => (
						<Link key={link.href} href={link.href} className="btn-secondary inline-flex items-center gap-2">
							<MaterialIcon name={link.icon} size={16} />
							{link.label}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
