import { NextRequest } from 'next/server';
import type { ClassificationResult, ModuleData, ModuleSliceMeta } from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';
import { mergeModuleData } from '@/lib/pipeline/mergeModuleData';
import { fetchParliamentVotingData } from '@/lib/sources/parliament';
import { fetchGdeltNewsData } from '@/lib/sources/gdelt';
import { fetchWikipediaEntitySummary } from '@/lib/sources/wikipedia';
import { buildLobbyingFromRegisterSnapshot } from '@/lib/transparencyRegister/search';

function prepareModuleBase(
  classification: ClassificationResult,
  query: string,
): { mockBase: ModuleData; lobbyingSliceMeta?: ModuleSliceMeta } {
  let mockBase = selectMockData(classification, query);
  let lobbyingSliceMeta: ModuleSliceMeta | undefined;
  if (classification.modules.includes('LOBBYING') && mockBase.lobbying) {
    const reg = buildLobbyingFromRegisterSnapshot(query, classification.entities, mockBase.lobbying);
    mockBase = { ...mockBase, lobbying: reg.lobbying };
    lobbyingSliceMeta = reg.sliceMeta;
  }
  return { mockBase, lobbyingSliceMeta };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: Record<string, any>) {
  switch (name) {
    case 'fetch_voting_data':
      return fetchParliamentVotingData(input.query as string, input.entities as string[] ?? []);
    case 'fetch_news_data':
      return fetchGdeltNewsData(input.query as string, input.entities as string[] ?? []);
    case 'get_entity_background':
      return fetchWikipediaEntitySummary(input.entity as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Prompts ────────────────────────────────────────────────────────────────────
const AGENT_SYSTEM = `You are Aletheia, an EU political intelligence agent with access to real-time data tools.

For every query:
1. Call fetch_voting_data if VOTING module is needed
2. Call fetch_news_data if NEWS module is needed
3. Call get_entity_background for the primary entity to add context
4. After receiving tool results, write a 3-4 sentence plain-language summary

Rules for the summary:
- Write like The Economist: direct, specific, no hedging, no bullet points
- Name names, cite figures, surface conflicts of interest unprompted
- Do not start with "The data shows" or "Based on the tools"
- After the summary, add a blank line, then "SOURCES" on its own line
- Add numbered citations [1] [2] [3] inline and as a list after SOURCES
- 2-4 sources maximum, only cite what you actually reference`;

// ── Fallback (no API key) ──────────────────────────────────────────────────────
function getFallbackSummary(query: string, md: ModuleData): string {
  if (md.lobbying?.conflictFlags?.length && md.voting) {
    const flag = md.lobbying.conflictFlags[0];
    return `${flag.mepName} received ${flag.meetings} documented meetings with ${flag.lobbyist} — one of the top-spending lobbyists on ${md.voting.lawName} at €${flag.amount}M — while ultimately voting ${flag.votedFor ? 'in favour of' : 'against'} the legislation [1]. The ${md.lobbying.topic} saw €${md.lobbying.totalDeclaredSpend}M in declared lobbying expenditure [2].${md.news ? ` Media sentiment is ${md.news.sentimentLabel.toLowerCase()}, with divergence between left and right outlets on whether the outcome represents democratic capture or legitimate advocacy [3].` : ''}`;
  }
  if (md.voting) {
    const v = md.voting;
    return `The ${v.lawName} passed with ${v.votes.for} votes in favour against ${v.votes.against} opposed — a margin that reflects political fracture, particularly within the EPP, where the vote split along national and agricultural interest lines [1].${md.lobbying ? ` Declared lobbying spend on this file reached €${md.lobbying.totalDeclaredSpend}M, with ${md.lobbying.organizations[0]?.name} leading at €${md.lobbying.organizations[0]?.spend}M [2].` : ''} The result is formally law, but the political coalition that produced it remains fragile [1].`;
  }
  return `The query "${query}" touches on active EU legislative and influence dynamics. Available data indicates significant lobbying activity and a contested political record [1]. The interests at play span industrial and civil society actors, with the balance of formal meetings and declared expenditure pointing toward ${md.lobbying?.organizations[0]?.sector ?? 'industry'} having disproportionate access to key decision-makers [2].`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { query, classification } = (await request.json()) as {
    query: string;
    classification: ClassificationResult;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { mockBase, lobbyingSliceMeta } = prepareModuleBase(classification, query);

  // ── No API key: run real data tools directly, return fallback text ────────
  if (!apiKey) {
    const [votingResult, newsResult] = await Promise.allSettled([
      classification.modules.includes('VOTING')
        ? fetchParliamentVotingData(query, classification.entities)
        : Promise.resolve(null),
      classification.modules.includes('NEWS')
        ? fetchGdeltNewsData(query, classification.entities)
        : Promise.resolve(null),
    ]);

    const toolResults: { name: string; result: Record<string, unknown> }[] = [];
    if (votingResult.status === 'fulfilled' && votingResult.value)
      toolResults.push({ name: 'fetch_voting_data', result: votingResult.value as unknown as Record<string, unknown> });
    if (newsResult.status === 'fulfilled' && newsResult.value)
      toolResults.push({ name: 'fetch_news_data', result: newsResult.value as unknown as Record<string, unknown> });

    const moduleData = mergeModuleData(classification, mockBase, toolResults, { lobbyingSliceMeta });
    const text = getFallbackSummary(query, moduleData);
    const moduleDataB64 = Buffer.from(JSON.stringify(moduleData)).toString('base64');

    const encoder = new TextEncoder();
    const words = text.split(' ');
    const stream = new ReadableStream({
      start(controller) {
        let i = 0;
        const tick = setInterval(() => {
          if (i >= words.length) { clearInterval(tick); controller.close(); return; }
          controller.enqueue(encoder.encode((i === 0 ? '' : ' ') + words[i++]));
        }, 28);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Module-Data': moduleDataB64,
        'Access-Control-Expose-Headers': 'X-Module-Data',
      },
    });
  }

  // ── With API key: tool-use agentic loop ───────────────────────────────────
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const tools = [
      {
        name: 'fetch_voting_data',
        description: 'Fetch EU Parliament plenary documents and recent vote results for a topic.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Topic or legislation to search for' },
            entities: { type: 'array', items: { type: 'string' }, description: 'Specific entities (bill names, MEP names)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'fetch_news_data',
        description: 'Fetch recent GDELT news headlines with sentiment and lean (LEFT/CENTRE/RIGHT) for a topic.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'News search query' },
            entities: { type: 'array', items: { type: 'string' }, description: 'Entities to include in search' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_entity_background',
        description: 'Get Wikipedia background on a person, organisation, law, or concept.',
        input_schema: {
          type: 'object' as const,
          properties: {
            entity: { type: 'string', description: 'Entity to look up' },
          },
          required: ['entity'],
        },
      },
    ];

    const messages: Parameters<typeof client.messages.create>[0]['messages'] = [
      {
        role: 'user',
        content: `Query: "${query}"
Modules needed: ${classification.modules.join(', ')}
Entities detected: ${classification.entities.join(', ') || 'none'}
Timeframe: ${classification.timeframe}

Fetch the relevant data and write your summary.`,
      },
    ];

    const toolResultsAccumulator: { name: string; result: Record<string, unknown> }[] = [];
    let finalText = '';

    // Agentic loop — max 3 rounds
    for (let round = 0; round < 3; round++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        system: AGENT_SYSTEM,
        tools,
        messages,
      });

      if (response.stop_reason === 'end_turn') {
        for (const block of response.content) {
          if (block.type === 'text') finalText = block.text;
        }
        break;
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolResultContent: Parameters<typeof client.messages.create>[0]['messages'][number]['content'] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input as Record<string, unknown>);
            toolResultsAccumulator.push({ name: block.name, result: result as Record<string, unknown> });
            toolResultContent.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        messages.push({ role: 'user', content: toolResultContent });
      }
    }

    const moduleData = mergeModuleData(classification, mockBase, toolResultsAccumulator, { lobbyingSliceMeta });
    if (!finalText) finalText = getFallbackSummary(query, moduleData);

    const moduleDataB64 = Buffer.from(JSON.stringify(moduleData)).toString('base64');

    // Stream the final text word-by-word
    const encoder = new TextEncoder();
    const words = finalText.split(' ');
    const stream = new ReadableStream({
      start(controller) {
        let i = 0;
        const tick = setInterval(() => {
          if (i >= words.length) { clearInterval(tick); controller.close(); return; }
          controller.enqueue(encoder.encode((i === 0 ? '' : ' ') + words[i++]));
        }, 22);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Module-Data': moduleDataB64,
        'Access-Control-Expose-Headers': 'X-Module-Data',
      },
    });
  } catch (err) {
    console.error('Summarize error:', err);
    const { mockBase: mb, lobbyingSliceMeta: lm } = prepareModuleBase(classification, query);
    const emptyTools: { name: string; result: Record<string, unknown> }[] = [];
    const moduleData = mergeModuleData(classification, mb, emptyTools, { lobbyingSliceMeta: lm });
    const text = getFallbackSummary(query, moduleData);
    const moduleDataB64 = Buffer.from(JSON.stringify(moduleData)).toString('base64');
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Module-Data': moduleDataB64,
        'Access-Control-Expose-Headers': 'X-Module-Data',
      },
    });
  }
}
