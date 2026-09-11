'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
	useEffect(() => {
		if (!('serviceWorker' in navigator)) return;
		void navigator.serviceWorker.register('/sw.js').catch(() => {
			// SW registration is best-effort
		});
	}, []);

	return null;
}
