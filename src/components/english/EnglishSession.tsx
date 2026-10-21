'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';

interface SessionItem {
	type: 'card' | 'pattern_card' | 'question';
	questionId: string | null;
	card: {
		lemma: string;
		ipa: string;
		stress: string;
		meaningVi: string;
		partOfSpeech: string;
		collocations: string[];
		pitfallVi: string;
		audioUrl: string | null;
		examples: Array<{ english: string; meaningVi: string; audioUrl: string | null }>;
	} | null;
	pattern: {
		purposeVi: string;
		frame: string;
		pitfallVi: string;
		examples: Array<{ english: string; meaningVi: string; audioUrl: string | null }>;
	} | null;
	question: {
		id: string;
		skill: string;
		kind: string;
		stage: string;
		prompt: unknown;
		hasAudio: boolean;
	} | null;
}

interface AnswerView {
	duplicate: boolean;
	result: string;
	message: string;
	displayCorrect: boolean;
	scheduleLabel: string;
	stage: string;
	skill: string;
	expected: string;
}

function record(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	return {};
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mixChunks(chunks: string[], seed: string): string[] {
	const copy = [...chunks];
	let hash = 0;
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	for (let index = copy.length - 1; index > 0; index -= 1) {
		hash = (hash * 1664525 + 1013904223) >>> 0;
		const swap = hash % (index + 1);
		const current = copy[index] ?? '';
		copy[index] = copy[swap] ?? '';
		copy[swap] = current;
	}
	if (copy.join('|') === chunks.join('|') && copy.length > 1) {
		const first = copy.shift();
		if (first) copy.push(first);
	}
	return copy;
}

const SKILL_LABEL: Record<string, string> = {
	meaning: 'Nghĩa',
	sound: 'Âm và chữ',
	usage: 'Dùng từ',
	pattern: 'Mẫu câu',
};

export default function EnglishSession({ mode }: { mode: 'learn' | 'review' | 'weak' }) {
	const [items, setItems] = useState<SessionItem[] | null>(null);
	const [index, setIndex] = useState(0);
	const [error, setError] = useState('');
	const [answer, setAnswer] = useState('');
	const [submitted, setSubmitted] = useState('');
	const [picked, setPicked] = useState<string[]>([]);
	const [result, setResult] = useState<AnswerView | null>(null);
	const [busy, setBusy] = useState(false);
	const [audioError, setAudioError] = useState(false);
	const [clientAnswerId, setClientAnswerId] = useState(() => crypto.randomUUID());

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch('/api/english/session', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mode }),
				});
				const body = await response.json() as { ok?: boolean; data?: { items?: SessionItem[] }; error?: string };
				if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không tải được phiên học');
				if (!cancelled) setItems(body.data?.items ?? []);
			} catch (loadError) {
				if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Không tải được phiên học');
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [mode]);

	const item = items?.[index] ?? null;
	const stepKey = `${index}:${item?.questionId ?? item?.type ?? 'empty'}`;
	const [seenStep, setSeenStep] = useState(stepKey);
	if (seenStep !== stepKey) {
		setSeenStep(stepKey);
		setAnswer('');
		setSubmitted('');
		setPicked([]);
		setResult(null);
		setAudioError(false);
		setClientAnswerId(crypto.randomUUID());
	}
	const prompt = record(item?.question?.prompt);
	const chunks = useMemo(() => mixChunks(strings(prompt.chunks), item?.question?.id ?? 'seed'), [item?.question?.id, prompt.chunks]);
	const blanks = Array.isArray(prompt.segments)
		? prompt.segments.filter((segment) => record(segment).kind === 'blank').length
		: 0;

	async function submit(value: string, skipped = false) {
		if (!item?.question || busy) return;
		setSubmitted(value);
		setBusy(true);
		setError('');
		try {
			const response = await fetch('/api/english/answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					questionId: item.question.id,
					clientAnswerId,
					answer: value,
					skipped,
				}),
			});
			const body = await response.json() as { ok?: boolean; data?: AnswerView; error?: string };
			if (!response.ok || !body.ok || !body.data) throw new Error(body.error ?? 'Không chấm được câu này');
			setResult(body.data);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Không chấm được câu này');
		} finally {
			setBusy(false);
		}
	}

	async function hearSentence() {
		if (!item?.question) return;
		setAudioError(false);
		const response = await fetch('/api/english/audio-open', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ questionId: item.question.id, clientAnswerId }),
		});
		if (!response.ok) {
			setAudioError(true);
			return;
		}
		const audio = new Audio(`/api/english/audio?questionId=${item.question.id}`);
		try {
			await audio.play();
		} catch {
			setAudioError(true);
		}
	}

	async function reportAnswer() {
		if (!item?.question || !result) return;
		setBusy(true);
		try {
			const response = await fetch('/api/english/dispute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					questionId: item.question.id,
					clientAnswerId,
					answer: submitted,
				}),
			});
			const body = await response.json() as { ok?: boolean; error?: string };
			if (!response.ok || !body.ok) throw new Error(body.error ?? 'Không gửi được báo cáo');
			setResult({ ...result, result: 'pending_review', message: 'Đã gửi duyệt. Lượt này chưa đổi lịch ôn.', displayCorrect: false, scheduleLabel: 'Chưa đổi lịch ôn' });
		} catch (reportError) {
			setError(reportError instanceof Error ? reportError.message : 'Không gửi được báo cáo');
		} finally {
			setBusy(false);
		}
	}

	if (error && !items) {
		return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState icon="error" title="Chưa mở được phiên" description={error} /></div>;
	}
	if (!items) {
		return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
	}
	if (items.length === 0 || index >= items.length) {
		const done = index >= items.length && items.length > 0;
		return (
			<div className="mx-auto max-w-xl px-4 py-16">
				<EmptyState
					icon={done ? 'check_circle' : 'inbox'}
					title={done ? 'Đã xong phiên này' : 'Chưa có bài'}
					description={done
						? 'Tiến độ từng kỹ năng đã được lưu. Bạn có thể thoát giữa phiên và quay lại.'
						: 'Hãy chọn một bộ học đã xuất bản, hoặc quay lại khi có bài đến hạn.'}
					action={done
						? { label: 'Xem tiến độ', href: '/english/progress' }
						: { label: 'Chọn bộ học', href: '/english/sets' }}
					secondaryAction={{ label: 'Về trang chủ', href: '/english' }}
				/>
			</div>
		);
	}
	if (!item) return null;

	const next = () => setIndex((current) => current + 1);

	return (
		<div className="mx-auto max-w-xl space-y-4 px-4 py-8">
			<p className="text-xs font-bold text-muted">{index + 1} / {items.length}</p>
			{item.type === 'card' && item.card && (
				<Card>
					<CardContent className="space-y-4">
						<p className="text-4xl font-black text-foreground">{item.card.lemma}</p>
						<p className="text-muted">{item.card.ipa} · {item.card.partOfSpeech}</p>
						<p className="text-xl text-foreground">{item.card.meaningVi}</p>
						{item.card.audioUrl && (
							<audio controls src={item.card.audioUrl} className="w-full">
								<track kind="captions" />
							</audio>
						)}
						{item.card.collocations.length > 0 && <p className="text-sm text-muted">{item.card.collocations.join(' · ')}</p>}
						<ul className="space-y-2 text-sm">
							{item.card.examples.map((example) => (
								<li key={example.english}>
									<p className="font-bold text-foreground">{example.english}</p>
									<p className="text-muted">{example.meaningVi}</p>
								</li>
							))}
						</ul>
						{item.card.pitfallVi && <p className="text-sm text-warning">{item.card.pitfallVi}</p>}
						<Button onClick={next}>Học câu hỏi</Button>
					</CardContent>
				</Card>
			)}
			{item.type === 'pattern_card' && item.pattern && (
				<Card>
					<CardContent className="space-y-4">
						<p className="label-caps">Mẫu câu</p>
						<p className="text-2xl font-black text-foreground">{item.pattern.frame}</p>
						<p className="text-muted">{item.pattern.purposeVi}</p>
						<ul className="space-y-2 text-sm">
							{item.pattern.examples.map((example) => (
								<li key={example.english}>
									<p className="font-bold">{example.english}</p>
									<p className="text-muted">{example.meaningVi}</p>
								</li>
							))}
						</ul>
						{item.pattern.pitfallVi && <p className="text-sm text-warning">{item.pattern.pitfallVi}</p>}
						<Button onClick={next}>Luyện mẫu này</Button>
					</CardContent>
				</Card>
			)}
			{item.type === 'question' && item.question && (
				<Card>
					<CardContent className="space-y-4">
						<p className="label-caps">{SKILL_LABEL[item.question.skill] ?? item.question.skill}</p>
						{(item.question.kind === 'meaning_choice' || item.question.kind === 'meaning_confusable') && (
							<>
								<p className="text-4xl font-black">{String(prompt.lemma ?? '')}</p>
								<p className="text-muted">{String(prompt.ipa ?? '')}</p>
								{item.question.hasAudio && <audio controls src={`/api/english/audio?questionId=${item.question.id}`} className="w-full"><track kind="captions" /></audio>}
							</>
						)}
						{item.question.kind === 'listen_choice' && (
							<audio controls autoPlay src={`/api/english/audio?questionId=${item.question.id}`} className="w-full"><track kind="captions" /></audio>
						)}
						{(item.question.kind === 'listen_type' || item.question.kind === 'spell_type') && (
							<>
								<p className="text-xl">{String(prompt.meaningVi ?? '')}</p>
								<audio controls src={`/api/english/audio?questionId=${item.question.id}`} className="w-full"><track kind="captions" /></audio>
							</>
						)}
						{item.question.kind === 'usage_fill' && (
							<>
								<p className="text-lg text-foreground">
									{String(prompt.before ?? '')}
									<span className="mx-1 inline-block min-w-16 border-b-2 border-accent"> </span>
									{String(prompt.after ?? '')}
								</p>
								<p className="text-muted">{String(prompt.meaningVi ?? '')}</p>
								{typeof prompt.firstLetter === 'string' && prompt.firstLetter && (
									<p className="text-sm text-muted">Gợi ý chữ cái đầu: {prompt.firstLetter}</p>
								)}
								<div className="flex gap-2">
									<Button type="button" variant="secondary" onClick={() => void hearSentence()}>Nghe cả câu</Button>
									{audioError && (
										<Button type="button" variant="tertiary" onClick={() => void submit('', true)}>Bỏ qua câu này</Button>
									)}
								</div>
							</>
						)}
						{item.question.kind === 'pattern_order' && (
							<>
								<p className="text-muted">{String(prompt.purposeVi ?? '')}</p>
								<p className="min-h-10 font-bold">{picked.join(' ') || 'Chọn các cụm theo thứ tự'}</p>
								<div className="flex flex-wrap gap-2">
									{chunks.map((chunk) => (
										<Button
											key={chunk}
											type="button"
											variant="secondary"
											disabled={picked.includes(chunk) || Boolean(result)}
											onClick={() => setPicked((current) => [...current, chunk])}
										>
											{chunk}
										</Button>
									))}
								</div>
							</>
						)}
						{item.question.kind === 'pattern_fill' && (
							<>
								<p className="text-muted">{String(prompt.purposeVi ?? '')}</p>
								<p>{String(prompt.meaningVi ?? '')}</p>
								<div className="space-y-2">
									{Array.isArray(prompt.segments) && prompt.segments.map((segment, segmentIndex) => {
										const part = record(segment);
										if (part.kind === 'text') return <span key={segmentIndex} className="mr-2 font-bold">{String(part.text ?? '')}</span>;
										return null;
									})}
								</div>
								{Array.from({ length: blanks }, (_, blankIndex) => (
									<input
										key={blankIndex}
										aria-label={`Phần cố định ${blankIndex + 1}`}
										value={answer.split('|')[blankIndex] ?? ''}
										onChange={(event) => {
											const parts = answer.split('|');
											while (parts.length < blanks) parts.push('');
											parts[blankIndex] = event.target.value;
											setAnswer(parts.slice(0, blanks).join('|'));
										}}
										className="h-10 w-full rounded-control border border-border bg-surface px-3"
									/>
								))}
							</>
						)}
						{strings(prompt.choices).length > 0 && (
							<div className="grid gap-2">
								{strings(prompt.choices).map((choice) => (
									<Button key={choice} type="button" variant="secondary" disabled={Boolean(result) || busy} onClick={() => void submit(choice)}>
										{choice}
									</Button>
								))}
							</div>
						)}
						{strings(prompt.choices).length === 0 && item.question.kind !== 'pattern_order' && item.question.kind !== 'pattern_fill' && (
							<form onSubmit={(event) => { event.preventDefault(); void submit(answer); }} className="flex gap-2">
								<input
									aria-label="Câu trả lời"
									value={answer}
									onChange={(event) => setAnswer(event.target.value)}
									className="h-12 flex-1 rounded-control border border-border bg-surface px-3"
									autoCapitalize="none"
									autoCorrect="off"
								/>
								<Button type="submit" disabled={busy || Boolean(result)}>Gửi</Button>
							</form>
						)}
						{item.question.kind === 'pattern_order' && !result && (
							<div className="flex gap-2">
								<Button type="button" variant="tertiary" onClick={() => setPicked([])}>Xếp lại</Button>
								<Button type="button" disabled={picked.length !== chunks.length || busy} onClick={() => void submit(picked.join('|'))}>Gửi</Button>
							</div>
						)}
						{item.question.kind === 'pattern_fill' && !result && (
							<Button type="button" disabled={busy} onClick={() => void submit(answer)}>Gửi</Button>
						)}
						{result && (
							<div className="space-y-2 rounded-card bg-surface-container p-4">
								<p className={`font-black ${result.displayCorrect ? 'text-success' : result.result === 'pending_review' ? 'text-foreground' : 'text-error'}`}>{result.message}</p>
								<p className="text-sm text-muted">{SKILL_LABEL[result.skill] ?? result.skill} · {result.scheduleLabel}</p>
								{!result.displayCorrect && result.result !== 'pending_review' && result.result !== 'skipped' && (
									<p className="text-sm">Đáp án: {result.expected}</p>
								)}
								{result.result === 'wrong' && (
									<Button type="button" variant="tertiary" disabled={busy} onClick={() => void reportAnswer()}>Đáp án của tôi cũng đúng</Button>
								)}
								<Button type="button" onClick={next}>Tiếp tục</Button>
							</div>
						)}
						{error && <p className="text-sm text-error">{error}</p>}
					</CardContent>
				</Card>
			)}
			<p className="text-center text-xs text-muted">
				<Link href="/english" className="text-accent">Thoát</Link>
				{' '}— phần đã làm được giữ lại.
			</p>
		</div>
	);
}
