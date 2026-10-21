'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CnPracticeSessionResultDTO, CnPracticeSubmitItem } from '@/types/chinese';

const emptySummary = (): CnPracticeSessionResultDTO => ({
	total: 0,
	correct: 0,
	byType: {},
	weakWords: [],
});

function mergeItemsIntoSummary(
	prev: CnPracticeSessionResultDTO,
	items: CnPracticeSubmitItem[],
): CnPracticeSessionResultDTO {
	const byType = { ...prev.byType };
	const weakWords = new Set(prev.weakWords);
	let correct = prev.correct;
	let total = prev.total;

	for (const item of items) {
		total++;
		if (item.correct) correct++;
		else weakWords.add(item.wordId);
		if (!byType[item.questionType]) byType[item.questionType] = { correct: 0, total: 0 };
		byType[item.questionType].total++;
		if (item.correct) byType[item.questionType].correct++;
	}

	return { total, correct, byType, weakWords: [...weakWords] };
}

export interface UseIncrementalSubmitOptions {
	endpoint?: string;
}

export function useIncrementalSubmit(options: UseIncrementalSubmitOptions = {}) {
	const endpoint = options.endpoint ?? '/api/practice/submit';
	const queueRef = useRef<CnPracticeSubmitItem[]>([]);
	const flushPromiseRef = useRef<Promise<void> | null>(null);
	const [isFlushing, setIsFlushing] = useState(false);
	const [sessionResult, setSessionResult] = useState<CnPracticeSessionResultDTO>(emptySummary);

	const flush = useCallback(async (): Promise<void> => {
		if (flushPromiseRef.current) return flushPromiseRef.current;

		const batch = queueRef.current.splice(0);
		if (!batch.length) return;

		flushPromiseRef.current = (async () => {
			setIsFlushing(true);
			try {
				const res = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ items: batch }),
					// Lets a send that starts while the page closes still finish.
					keepalive: true,
				});
				const json = await res.json() as { ok: boolean; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Không lưu được kết quả');
			} catch (err) {
				queueRef.current.unshift(...batch);
				throw err;
			} finally {
				setIsFlushing(false);
				flushPromiseRef.current = null;
			}
		})();

		return flushPromiseRef.current;
	}, [endpoint]);

	const enqueue = useCallback((item: CnPracticeSubmitItem) => {
		queueRef.current.push(item);
		setSessionResult((prev) => mergeItemsIntoSummary(prev, [item]));
		void flush();
	}, [flush]);

	const flushAndWait = useCallback(async () => {
		for (;;) {
			await flush();
			while (flushPromiseRef.current) {
				await flushPromiseRef.current;
			}
			if (queueRef.current.length === 0) break;
		}
	}, [flush]);

	const resetSession = useCallback(() => {
		queueRef.current = [];
		setSessionResult(emptySummary());
	}, []);

	useEffect(() => {
		const flushOnPageHide = () => {
			const batch = queueRef.current.splice(0);
			if (!batch.length) return;
			const body = JSON.stringify({ items: batch });
			const blob = new Blob([body], { type: 'application/json' });
			navigator.sendBeacon(endpoint, blob);
		};
		window.addEventListener('pagehide', flushOnPageHide);
		return () => window.removeEventListener('pagehide', flushOnPageHide);
	}, [endpoint]);

	return { enqueue, flushAndWait, sessionResult, isFlushing, resetSession };
}
