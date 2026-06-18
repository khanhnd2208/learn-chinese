import { Suspense } from 'react';
import ChinesePracticeClient from './ChinesePracticeClient';

export default function ChinesePracticePage() {
	return (
		<Suspense fallback={<main className="mx-auto max-w-2xl px-6 py-16 text-center text-muted">Đang tải...</main>}>
			<ChinesePracticeClient />
		</Suspense>
	);
}
