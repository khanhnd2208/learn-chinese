'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import MaterialIcon from './MaterialIcon';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
	id: number;
	message: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, string> = {
	success: 'check_circle',
	error: 'error',
	info: 'info',
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
	success: 'border-success/40 bg-success-subtle text-success',
	error: 'border-error/40 bg-error/10 text-error',
	info: 'border-border bg-surface text-foreground',
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ToastItem[]>([]);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setMounted(true), 0);
		return () => window.clearTimeout(timer);
	}, []);

	const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
		const id = ++toastId;
		setItems((prev) => [...prev.slice(-2), { id, message, variant }]);
		setTimeout(() => {
			setItems((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	}, []);

	const value = useMemo(() => ({ toast }), [toast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			{mounted &&
				createPortal(
					<div
						className="fixed bottom-20 left-1/2 z-toast flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
						aria-live="polite"
						role="status"
					>
						{items.map((item) => (
							<div
								key={item.id}
								className={cn(
									'flex items-center gap-2 rounded-card border px-4 py-3 text-sm font-medium shadow-elevated animate-fade-slide-up',
									VARIANT_CLASS[item.variant],
								)}
							>
								<MaterialIcon name={VARIANT_ICON[item.variant]} size={18} />
								{item.message}
							</div>
						))}
					</div>,
					document.body,
				)}
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useToast must be used within ToastProvider');
	return ctx;
}
