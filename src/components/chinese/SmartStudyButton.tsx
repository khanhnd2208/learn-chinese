'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export interface StudyState {
	dueCount: number;
	newCount: number;
	enrolled: boolean;
	/** When set, the button is about this set. Home omits it. */
	setId?: string;
	/** Learner follows nothing. */
	hasSets?: boolean;
}

export function studyAction(state: StudyState): { href: string; label: string; follow: boolean; done: boolean } {
	if (state.setId && !state.enrolled) {
		return { href: '#', label: 'Theo học', follow: true, done: false };
	}
	if (!state.setId && state.hasSets === false) {
		return { href: '/explore', label: 'Khám phá bộ từ đầu tiên', follow: false, done: false };
	}
	if (state.dueCount > 0) {
		const label = state.setId ? `Ôn ${state.dueCount}` : `Ôn ${state.dueCount} từ hôm nay`;
		return { href: '/review', label, follow: false, done: false };
	}
	if (state.newCount > 0) {
		return { href: '/learn', label: state.setId ? 'Học' : `Học ${state.newCount} từ mới`, follow: false, done: false };
	}
	if (state.setId) {
		return { href: '/review', label: 'Ôn lại', follow: false, done: false };
	}
	return { href: '/explore', label: 'Hôm nay xong rồi 🎉', follow: false, done: true };
}

interface Props extends StudyState {
	size?: 'md' | 'lg';
}

export default function SmartStudyButton({ size = 'lg', ...state }: Props) {
	const router = useRouter();
	const action = studyAction(state);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	if (action.follow && state.setId) {
		return (
			<div className="space-y-2">
				<Button
					size={size}
					fullWidth
					loading={loading}
					onClick={() => {
						setLoading(true);
						setError('');
						void fetch(`/api/library/${state.setId}`, { method: 'POST' })
							.then(async (res) => {
								const json = await res.json() as { ok: boolean; error?: string };
								if (!json.ok) throw new Error(json.error ?? 'Không theo học được');
								router.refresh();
							})
							.catch((reason: unknown) => {
								setError(reason instanceof Error ? reason.message : 'Không theo học được');
							})
							.finally(() => setLoading(false));
					}}
				>
					Theo học
				</Button>
				{error && <p className="text-sm text-error">{error}</p>}
			</div>
		);
	}

	if (action.done) {
		const practiceHref = state.setId ? `/practice/${state.setId}?mode=smart_mixed` : '/explore';
		return (
			<div className="space-y-3">
				<p className="text-2xl font-black text-foreground">Hôm nay xong rồi 🎉</p>
				<Button variant="secondary" size={size} fullWidth onClick={() => router.push(practiceHref)}>
					Luyện tập tự do
				</Button>
			</div>
		);
	}

	return (
		<Button size={size} fullWidth onClick={() => router.push(action.href)}>
			{action.label}
		</Button>
	);
}
