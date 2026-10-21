'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function EnrollButton({ setId, enrolled }: { setId: string; enrolled: boolean }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(enrolled);
	const [error, setError] = useState('');

	async function enroll() {
		setPending(true);
		setError('');
		try {
			const response = await fetch('/api/english/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setId }),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không theo học được');
			setDone(true);
			router.refresh();
		} catch (enrollError) {
			setError(enrollError instanceof Error ? enrollError.message : 'Không theo học được');
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="space-y-2">
			<Button type="button" disabled={done || pending} onClick={() => void enroll()}>
				{done ? 'Đang học' : 'Theo học'}
			</Button>
			{error && <p className="text-sm text-error">{error}</p>}
		</div>
	);
}
