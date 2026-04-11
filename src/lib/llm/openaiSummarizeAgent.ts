import type OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { withOpenAISeparateReasoningBody } from './provider';

function aletheiaTools(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'fetch_voting_data',
        description: 'Fetch EU Parliament plenary documents and recent vote results for a topic.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Topic or legislation to search for' },
            entities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific entities (bill names, MEP names)',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fetch_news_data',
        description: 'Fetch recent GDELT news headlines with sentiment and lean (LEFT/CENTRE/RIGHT) for a topic.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'News search query' },
            entities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Entities to include in search',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_entity_background',
        description: 'Get Wikipedia background on a person, organisation, law, or concept.',
        parameters: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity to look up' },
          },
          required: ['entity'],
        },
      },
    },
  ];
}

export async function runOpenAISummarizeAgent(
  openai: OpenAI,
  options: {
    model: string;
    system: string;
    userContent: string;
    /** Prior conversation turns prepended for multi-turn context (newest last). */
    priorMessages?: ChatCompletionMessageParam[];
    executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
    /** Called just before each tool execution — use to emit progress events. */
    onToolStart?: (name: string) => void;
    /** Called just after each tool execution. `matched` is true when the tool returned useful data. */
    onToolDone?: (name: string, matched: boolean) => void;
    maxRounds?: number;
    maxTokens?: number;
  },
): Promise<{ finalText: string; toolResults: { name: string; result: Record<string, unknown> }[] }> {
  const tools = aletheiaTools();
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: options.system },
    ...(options.priorMessages ?? []),
    { role: 'user', content: options.userContent },
  ];
  const toolResults: { name: string; result: Record<string, unknown> }[] = [];
  let finalText = '';
  const maxRounds = options.maxRounds ?? 3;

  for (let round = 0; round < maxRounds; round++) {
    const res = await openai.chat.completions.create(
      withOpenAISeparateReasoningBody({
        model: options.model,
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: options.maxTokens ?? 520,
      }) as never,
    );

    const choice = res.choices[0];
    if (!choice) break;

    const msg = choice.message;
    messages.push(msg as ChatCompletionMessageParam);

    const toolCalls = msg.tool_calls;
    if (choice.finish_reason === 'stop' || !toolCalls?.length) {
      finalText = msg.content ?? '';
      break;
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const fn = tc.function;
      let input: Record<string, unknown> = {};
      try {
        input = fn.arguments ? (JSON.parse(fn.arguments) as Record<string, unknown>) : {};
      } catch {
        input = {};
      }
      options.onToolStart?.(fn.name);
      const result = await options.executeTool(fn.name, input);
      const matched = (result as Record<string, unknown>)?.queryMatched !== false;
      options.onToolDone?.(fn.name, typeof matched === 'boolean' ? matched : true);
      toolResults.push({ name: fn.name, result: result as Record<string, unknown> });
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { finalText, toolResults };
}
