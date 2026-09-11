'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
	active: string;
	setActive: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
	value: string;
	onValueChange: (value: string) => void;
	children: ReactNode;
	className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
	return (
		<TabsContext.Provider value={{ active: value, setActive: onValueChange }}>
			<div className={className}>{children}</div>
		</TabsContext.Provider>
	);
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			role="tablist"
			className={cn('flex gap-1 overflow-x-auto hide-scrollbar border-b border-border', className)}
		>
			{children}
		</div>
	);
}

interface TabTriggerProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function TabsTrigger({ value, children, className }: TabTriggerProps) {
	const ctx = useContext(TabsContext);
	if (!ctx) throw new Error('TabsTrigger must be inside Tabs');
	const active = ctx.active === value;

	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			onClick={() => ctx.setActive(value)}
			className={cn(
				'shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
				active
					? 'border-b-2 border-accent text-accent'
					: 'text-muted hover:text-foreground-secondary',
				className,
			)}
		>
			{children}
		</button>
	);
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
	const ctx = useContext(TabsContext);
	const id = useId();
	if (!ctx || ctx.active !== value) return null;

	return (
		<div role="tabpanel" id={id} className={cn('pt-4', className)}>
			{children}
		</div>
	);
}
