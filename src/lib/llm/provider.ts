import OpenAI from 'openai';

export type ActiveLlmProvider = 'openai' | 'anthropic' | 'none';

/**
 * TNG: put model reasoning in a separate response field (not mixed into `message.content`).
 * - `header` — send `X-Separate-Reasoning: 1` on every request (organizer example 2).
 * - `body` — add JSON `{ separate_reasoning: true }` to the chat completion body (organizer example 1 / `extra_body`).
 * - unset / `off` / `0` / `false` — default API behavior.
 */
export type OpenAISeparateReasoningMode = 'off' | 'header' | 'body';

export function getOpenAISeparateReasoningMode(): OpenAISeparateReasoningMode {
  const raw = (process.env.OPENAI_SEPARATE_REASONING?.trim().toLowerCase() ?? '');
  if (raw === '' || raw === 'off' || raw === '0' || raw === 'false') return 'off';
  if (raw === 'body' || raw === 'extra_body') return 'body';
  if (raw === 'header' || raw === '1' || raw === 'true') return 'header';
  return 'off';
}

/** Merge TNG `separate_reasoning` into the chat completion JSON body when mode is `body`. */
export function withOpenAISeparateReasoningBody(body: Record<string, unknown>): Record<string, unknown> {
  if (getOpenAISeparateReasoningMode() !== 'body') return body;
  return { ...body, separate_reasoning: true };
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
