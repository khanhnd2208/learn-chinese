import { HANZI_AI_SYSTEM_PROMPT, buildHanziAiUserPayload } from '../hanziPrompt';
import type { HanziAiGenerationResult, HanziAiProvider } from '../hanziAiTypes';

export class HanziProviderError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly category: 'transient_provider' | 'configuration' | 'unknown',
	) {
		super(message);
	}
}

interface DeepSeekResponse {
	id?: string;
	choices?: Array<{ message?: { content?: string } }>;
	usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class DeepSeekHanziProvider implements HanziAiProvider {
	private readonly apiKey = process.env.DEEPSEEK_API_KEY ?? '';
	private readonly baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
	private readonly model = process.env.HANZI_AI_MODEL ?? 'deepseek-v4-flash';

	assertConfigured(): void {
		if (!this.apiKey) throw new HanziProviderError('AI provider chưa được cấu hình', 'HANZI_AI_NOT_CONFIGURED', 'configuration');
	}

	async generateAnalysis(input: Parameters<HanziAiProvider['generateAnalysis']>[0]): Promise<HanziAiGenerationResult> {
		this.assertConfigured();
		const started = Date.now();
		let response: Response;
		try {
			response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
				signal: input.signal,
				body: JSON.stringify({
					model: this.model,
					messages: [
						{ role: 'system', content: HANZI_AI_SYSTEM_PROMPT },
						{ role: 'user', content: JSON.stringify(buildHanziAiUserPayload(input.term, input.knownFacts, input.repairErrors)) },
					],
					response_format: { type: 'json_object' },
					thinking: { type: 'disabled' },
					temperature: Number(process.env.HANZI_AI_TEMPERATURE ?? '0.1'),
					max_tokens: Number(process.env.HANZI_AI_MAX_OUTPUT_TOKENS ?? '2000'),
				}),
			});
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new HanziProviderError('AI provider timeout', 'PROVIDER_TIMEOUT', 'transient_provider');
			}
			throw new HanziProviderError('Không kết nối được AI provider', 'PROVIDER_NETWORK_ERROR', 'transient_provider');
		}
		if (!response.ok) {
			const transient = response.status === 429 || response.status >= 500;
			throw new HanziProviderError(
				transient ? 'AI provider tạm thời không khả dụng' : 'AI provider từ chối yêu cầu',
				response.status === 429 ? 'PROVIDER_RATE_LIMITED' : `PROVIDER_HTTP_${response.status}`,
				transient ? 'transient_provider' : 'configuration',
			);
		}
		const json = await response.json() as DeepSeekResponse;
		const rawText = json.choices?.[0]?.message?.content ?? '';
		let parsedJson: unknown = null;
		try { parsedJson = JSON.parse(rawText); } catch { /* validated by service */ }
		return {
			rawText,
			parsedJson,
			provider: 'deepseek', model: this.model,
			inputTokens: json.usage?.prompt_tokens ?? null,
			outputTokens: json.usage?.completion_tokens ?? null,
			latencyMs: Date.now() - started,
			requestId: json.id ?? response.headers.get('x-request-id'),
		};
	}
}

