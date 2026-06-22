'use client';

import { useCallback, useEffect, useState } from 'react';

/** Lightweight due count for nav badges — uses review API with limit=0 */
export function useDueTodayCount(refreshKey = 0) {
	const [dueToday, setDueToday] = useState<number | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await fetch('/api/review?limit=0');
			const json = await res.json() as {
				ok: boolean;
				data?: { dueToday: number };
			};
			if (json.ok && json.data) setDueToday(json.data.dueToday);
		} catch {
			// ignore — badge is optional chrome
		}
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- async badge count on mount
		void refresh();
	}, [refresh, refreshKey]);

	return dueToday;
}
