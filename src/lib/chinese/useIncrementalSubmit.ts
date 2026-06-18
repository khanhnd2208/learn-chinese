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

export function useIncrementalSubmit() {
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
				const res = await fetch('/api/practice/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ items: batch }),
				});
				const json = await res.json() as { ok: boolean; error?: string };
				if (!json.ok) throw new Error(json.error ?? 'Không lưu được kết quả');
			} catch (err) {
				queueRef.current.unshift(...batch);
				throw err;
			} finally {
				setIsFlushing(false);
				flushPromiseRef.current = null;
				if (queueRef.current.length > 0) await flush();
			}
		})();

		return flushPromiseRef.current;
	}, []);

	const enqueue = useCallback((item: CnPracticeSubmitItem) => {
		queueRef.current.push(item);
		setSessionResult((prev) => mergeItemsIntoSummary(prev, [item]));
		void flush();
	}, [flush]);

	const flushAndWait = useCallback(async () => {
		await flush();
		while (flushPromiseRef.current) {
			await flushPromiseRef.current;
		}
		if (queueRef.current.length > 0) await flushAndWait();
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
			navigator.sendBeacon('/api/practice/submit', blob);
		};
		window.addEventListener('pagehide', flushOnPageHide);
		return () => window.removeEventListener('pagehide', flushOnPageHide);
	}, []);

	return { enqueue, flushAndWait, sessionResult, isFlushing, resetSession };
}
