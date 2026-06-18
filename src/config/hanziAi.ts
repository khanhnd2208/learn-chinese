export const HANZI_AI_POLL_INTERVAL_MS = Number(
	process.env.NEXT_PUBLIC_HANZI_AI_POLL_INTERVAL_MS ?? process.env.HANZI_AI_POLL_INTERVAL_MS ?? '2000',
);
export const HANZI_AI_POLL_MAX_MS = Number(
	process.env.NEXT_PUBLIC_HANZI_AI_POLL_MAX_MS ?? process.env.HANZI_AI_POLL_MAX_MS ?? '60000',
);
