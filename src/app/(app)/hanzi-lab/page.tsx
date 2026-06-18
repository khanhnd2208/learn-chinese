import { Suspense } from 'react';
import HanziLabClient from './HanziLabClient';

export default function HanziLabPage() {
	return (
		<Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted">Đang tải...</div>}>
			<HanziLabClient />
		</Suspense>
	);
}
