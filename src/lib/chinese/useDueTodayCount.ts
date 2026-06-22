'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CnReviewStatusDTO } from '@/types/chinese';

/** Lightweight SRS status for nav badges */
export function useReviewStatus(refreshKey = 0) {
	const [status, setStatus] = useState<CnReviewStatusDTO | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await fetch('/api/review/status');
			const json = await res.json() as {
				ok: boolean;
				data?: { status: CnReviewStatusDTO };
			};
			if (json.ok && json.data) setStatus(json.data.status);
		} catch {
			// ignore — badge is optional chrome
		}
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- async badge on mount
		void refresh();
	}, [refresh, refreshKey]);

	return status;
}

/** @deprecated Use useReviewStatus */
export function useDueTodayCount(refreshKey = 0) {
	const status = useReviewStatus(refreshKey);
	return status?.dueTotal ?? null;
}

export function reviewBadgePressureClass(pressure: CnReviewStatusDTO['pressure'] | undefined): string {
	switch (pressure) {
		case 'severe':
			return 'bg-warning text-background';
		case 'moderate':
			return 'bg-warning/80 text-background';
		case 'mild':
			return 'bg-accent/90 text-background';
		default:
			return 'bg-accent text-background';
	}
}
