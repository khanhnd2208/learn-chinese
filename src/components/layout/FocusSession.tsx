'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ui/ProgressBar';

interface FocusSessionValue {
	progress: number;
	setProgress: (value: number) => void;
}

const FocusSessionContext = createContext<FocusSessionValue | null>(null);

export function FocusSessionProvider({ children }: { children: ReactNode }) {
	const [progress, setProgress] = useState(0);
	return (
		<FocusSessionContext.Provider value={{ progress, setProgress }}>
			{children}
		</FocusSessionContext.Provider>
	);
}

/** Report 0–100 while a focus session is open. */
export function useFocusProgress(progress: number) {
	const ctx = useContext(FocusSessionContext);
	useEffect(() => {
		ctx?.setProgress(progress);
		return () => ctx?.setProgress(0);
	}, [ctx, progress]);
}

export function FocusSessionBar() {
	const ctx = useContext(FocusSessionContext);
	return (
		<div className="sticky top-0 z-sticky flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
			<Link
				href="/"
				aria-label="Thoát"
				className="flex h-10 w-10 items-center justify-center rounded-control text-xl font-black text-foreground hover:bg-surface-hover"
			>
				×
			</Link>
			<div className="min-w-0 flex-1">
				<ProgressBar value={ctx?.progress ?? 0} />
			</div>
		</div>
	);
}
