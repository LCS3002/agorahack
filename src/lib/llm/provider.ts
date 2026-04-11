import OpenAI from 'openai';

export type ActiveLlmProvider = 'openai' | 'anthropic' | 'none';

/** TNG hackathon gateway only exposes a fixed model list — not OpenAI IDs like gpt-4o. */
export function isTngOpenAiBaseUrl(): boolean {
  const base = process.env.OPENAI_BASE_URL?.trim().toLowerCase() ?? '';
  return base.includes('tngtech.com');
}

/**
 * TNG: put model reasoning in a separate response field (not mixed into `message.content`).
 * - `header` — send `X-Separate-Reasoning: 1` on every request (organizer example 2).
 * - `body` — add JSON `{ separate_reasoning: true }` to the chat completion JSON body (organizer example 1 / `extra_body`).
 * - unset — if `OPENAI_BASE_URL` is TNG (`tngtech.com`), defaults to `header`; otherwise off.
 * - `off` / `0` / `false` — never send separation (overrides TNG default).
 */
export type OpenAISeparateReasoningMode = 'off' | 'header' | 'body';

export function getOpenAISeparateReasoningMode(): OpenAISeparateReasoningMode {
  const raw = (process.env.OPENAI_SEPARATE_REASONING?.trim().toLowerCase() ?? '');
  if (raw === 'off' || raw === '0' || raw === 'false') return 'off';
  if (raw === 'body' || raw === 'extra_body') return 'body';
  if (raw === 'header' || raw === '1' || raw === 'true') return 'header';
  if (raw === '' && isTngOpenAiBaseUrl()) return 'header';
  return 'off';
}

/** Merge TNG `separate_reasoning` into the chat completion JSON body when mode is `body`. */
export function withOpenAISeparateReasoningBody(body: Record<string, unknown>): Record<string, unknown> {
  if (getOpenAISeparateReasoningMode() !== 'body') return body;
  return { ...body, separate_reasoning: true };
}

const DEFAULT_TNG_CHAT_MODEL = 'tngtech/R1T2-Chimera-Speed';

/** `OPENAI_MODEL_CLASSIFY` or a sane default for the configured base URL. */
export function defaultOpenAIClassifyModel(): string {
  const override = process.env.OPENAI_MODEL_CLASSIFY?.trim();
  if (override) return override;
  return isTngOpenAiBaseUrl() ? DEFAULT_TNG_CHAT_MODEL : 'gpt-4o-mini';
}

/** `OPENAI_MODEL_AGENT` or a sane default for the configured base URL. */
export function defaultOpenAIAgentModel(): string {
  const override = process.env.OPENAI_MODEL_AGENT?.trim();
  if (override) return override;
  return isTngOpenAiBaseUrl() ? DEFAULT_TNG_CHAT_MODEL : 'gpt-4o';
}

/** Prefer OpenAI when `OPENAI_API_KEY` is set (works with OpenAI-compatible gateways via `OPENAI_BASE_URL`). */
export function resolveActiveLlmProvider(): ActiveLlmProvider {
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic';
  return 'none';
}

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const base = process.env.OPENAI_BASE_URL?.trim();
  const teamName =
    process.env.TEAM_NAME?.trim() ||
    process.env.TUM_AI_TEAM_NAME?.trim() ||
    '';

  const headers: Record<string, string> = {};
  if (teamName !== '') headers['x-user-agent'] = `tum.ai/${teamName}`;
  if (getOpenAISeparateReasoningMode() === 'header') headers['X-Separate-Reasoning'] = '1';

  const defaultHeaders = Object.keys(headers).length > 0 ? headers : undefined;

  return new OpenAI({
    apiKey,
    ...(base ? { baseURL: base } : {}),
    ...(defaultHeaders ? { defaultHeaders } : {}),
  });
}
