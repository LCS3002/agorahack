import { NextRequest } from 'next/server';
import type { ClassificationResult, ModuleData, ModuleSliceMeta } from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';
import { mergeModuleData } from '@/lib/pipeline/mergeModuleData';
import { fetchParliamentVotingData } from '@/lib/sources/parliament';
import { fetchGdeltNewsData } from '@/lib/sources/gdelt';
import { fetchWikipediaEntitySummary } from '@/lib/sources/wikipedia';
import { buildLobbyingFromRegisterSnapshot } from '@/lib/transparencyRegister/search';
import { withSummarySources } from '@/lib/pipeline/summarySources';
import { createOpenAIClient, defaultOpenAIAgentModel, resolveActiveLlmProvider } from '@/lib/llm/provider';
import { runOpenAISummarizeAgent } from '@/lib/llm/openaiSummarizeAgent';

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

/** Compact JSON for the model when we pre-fetch voting (same payload shape as fetch_voting_data). */
function compactVotingSnapshotForPrompt(v: Record<string, unknown>): string {
  const md = v.matchedDocuments as Array<{ title?: string; reference?: string }> | undefined;
  const rv = v.recentVotes as
    | Array<{ for?: number; against?: number; abstain?: number; date?: string; label?: string }>
    | undefined;
  const d = md?.[0];
  const r = rv?.[0];
  return JSON.stringify({
    queryMatched: v.queryMatched,
    reference: d?.reference,
    lawTitle: d?.title,
    voteLabel: r?.label,
    for: r?.for,
    against: r?.against,
    abstain: r?.abstain,
    date: r?.date,
    shortName: v.shortName,
    committee: v.committee,
  });
}

/** Register-based lobbying already merged for the UI — give the model facts without a lobbying tool call. */
function compactLobbyingSnapshotForPrompt(lobbying: NonNullable<ModuleData['lobbying']>): string {
  return JSON.stringify({
    topic: lobbying.topic,
    totalDeclaredSpendEURm: lobbying.totalDeclaredSpend,
    period: lobbying.period,
    registryUrl: lobbying.registryUrl,
    organizations: lobbying.organizations.slice(0, 8).map(o => ({
      name: o.name,
      declaredSpendEURm: o.spend,
      sector: o.sector,
    })),
  });
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
const AGENT_SYSTEM = `You are Aletheia. Use tools silently, then reply with ONE polished brief for the end user — the same text a journalist would publish, not notes to an engineer.

CRITICAL — OUTPUT MUST NOT CONTAIN:
- Any chain-of-thought, planning, or self-dialogue (no "First,", "Next,", "Wait,", "Hmm,", "I should", "I'll call", "Putting it together", "This is a gap").
- Any mention of tools, APIs, "pre-fetched", "the user", "modules", or what you will/won't call.
- If you reason internally, none of that may appear in the message. Only the four sections below + SOURCES.

TOOL USE (silent — never describe in the answer):
- fetch_voting_data when VOTING is relevant (exact query string; procedure refs verbatim).
- fetch_news_data when NEWS is relevant.
- get_entity_background when it adds factual context.
- If the user message includes a "Pre-fetched voting record" JSON block, those counts and references are authoritative.
- If the user message includes "Pre-loaded declared lobbying context" JSON, use it for the **Who was active** section (declared spend / organisations only). There is no separate lobbying tool.

USER VISIBLE STRUCTURE — use these four lines exactly as bold labels, each followed by 1–3 short sentences (omit a section only if you truly have zero relevant facts; say so in one clause inside that section).

**What happened**  
Policy / file name, passed or rejected, vote numbers and date if available — this block is the lead.

**How it was decided**  
Political dynamics: which groups broadly supported or opposed, splits or controversy if known from data. No speculation.

**Who was active**  
Lobbying / actors: use the pre-loaded lobbying JSON when present; otherwise neutral one-liner that register-level detail was not included. Phrase as declared activity only ("active around", "declared spend", "registered interests"). Never say or imply that lobbying caused or influenced the vote.

**How it is discussed**  
Optional if thin: news framing or sentiment from fetch_news_data — as media coverage, not fact. Skip entirely if no news data.

SUBSTANCE RULES:
- No causality from lobbying to outcomes. No invented tools or apologies about tooling.
- **Length:** Before SOURCES, stay around **160–220 words** total across the four sections; tight sentences.
- **Markdown:** keep the **What happened** / **How it was decided** / **Who was active** / **How it is discussed** labels in bold; *italic* rarely; no bullet lists in the body.

SOURCES (required — after all sections):
- Blank line, then a line with exactly: SOURCES
- Blank line, then [1] … lines for every citation used in the text.
- Prefer **2–3** sources (4 only if needed). Order when applicable: [1] EP vote/procedure, [2] Transparency Register (registry URL from lobbying JSON if used), [3] news URL from fetch_news_data, [4] Wikipedia from get_entity_background.`;

// ── Fallback (no API key) ──────────────────────────────────────────────────────
function topLobbyingOrgBySpend(md: ModuleData) {
  const orgs = md.lobbying?.organizations;
  if (!orgs?.length) return null;
  return orgs.reduce((a, b) => (a.spend >= b.spend ? a : b));
}

function getFallbackSummary(query: string, md: ModuleData): string {
  if (md.lobbying?.conflictFlags?.length && md.voting) {
    const flag = md.lobbying.conflictFlags[0];
    return `${flag.mepName} received ${flag.meetings} documented meetings with ${flag.lobbyist} — one of the top-spending lobbyists on ${md.voting.lawName} at €${flag.amount}M — while ultimately voting ${flag.votedFor ? 'in favour of' : 'against'} the legislation [1]. The ${md.lobbying.topic} saw €${md.lobbying.totalDeclaredSpend}M in declared lobbying expenditure [2].${md.news ? ` Media sentiment is ${md.news.sentimentLabel.toLowerCase()}, with divergence between left and right outlets on whether the outcome represents democratic capture or legitimate advocacy [3].` : ''}`;
  }
  if (md.voting) {
    const v = md.voting;
    const lead = topLobbyingOrgBySpend(md);
    return `The ${v.lawName} passed with ${v.votes.for} votes in favour against ${v.votes.against} opposed — a margin that reflects political fracture, particularly within the EPP, where the vote split along national and agricultural interest lines [1].${md.lobbying && lead ? ` Declared lobbying spend among surfaced registrants totals €${md.lobbying.totalDeclaredSpend}M, with ${lead.name} highest at €${lead.spend}M [2].` : ''} The result is formally law, but the political coalition that produced it remains fragile [1].`;
  }
  const lead2 = topLobbyingOrgBySpend(md);
  return `The query "${query}" touches on active EU legislative and influence dynamics. Available data indicates significant lobbying activity and a contested political record [1]. The interests at play span industrial and civil society actors, with the balance of formal meetings and declared expenditure pointing toward ${lead2?.sector ?? md.lobbying?.organizations[0]?.sector ?? 'industry'} having disproportionate access to key decision-makers [2].`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { query, classification } = (await request.json()) as {
    query: string;
    classification: ClassificationResult;
  };

  const provider = resolveActiveLlmProvider();
  const { mockBase, lobbyingSliceMeta } = prepareModuleBase(classification, query);

  // ── No LLM key: run real data tools directly, return fallback text ────────
  if (provider === 'none') {
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

    let moduleData = mergeModuleData(classification, mockBase, toolResults, { lobbyingSliceMeta });
    moduleData = withSummarySources(moduleData, toolResults);
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

  // ── With LLM: tool-use agentic loop (OpenAI first, else Anthropic) ─────────
  try {
    let prefetchedVoting: Record<string, unknown> | null = null;
    if (classification.modules.includes('VOTING')) {
      const pv = await fetchParliamentVotingData(query, classification.entities);
      if (pv.queryMatched) prefetchedVoting = pv as unknown as Record<string, unknown>;
    }

    const prefetchNote =
      prefetchedVoting
        ? `\n\nPre-fetched voting record for this query (authoritative for vote totals and procedure; use in your summary):\n${compactVotingSnapshotForPrompt(prefetchedVoting)}\n`
        : '';

    const lobbyingNote =
      classification.modules.includes('LOBBYING') && mockBase.lobbying
        ? `\n\nPre-loaded declared lobbying context (use for "Who was active"; descriptive only, never imply influence on votes):\n${compactLobbyingSnapshotForPrompt(mockBase.lobbying)}\n`
        : '';

    const userAgentContent = `Query: "${query}"
Modules needed: ${classification.modules.join(', ')}
Entities detected: ${classification.entities.join(', ') || 'none'}
Timeframe: ${classification.timeframe}

Write only the user-facing brief (four bold sections + SOURCES). Do not discuss tools or your plan.${prefetchNote}${lobbyingNote}`;

    let toolResultsAccumulator: { name: string; result: Record<string, unknown> }[] = [];
    let finalText = '';

    if (provider === 'openai') {
      const openai = createOpenAIClient();
      const model = defaultOpenAIAgentModel();
      const { finalText: ft, toolResults } = await runOpenAISummarizeAgent(openai, {
        model,
        system: AGENT_SYSTEM,
        userContent: userAgentContent,
        executeTool: (name, input) => executeTool(name, input),
        maxTokens: 520,
      });
      finalText = ft;
      toolResultsAccumulator = toolResults;
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
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
        { role: 'user', content: userAgentContent },
      ];

      // Agentic loop — max 3 rounds
      for (let round = 0; round < 3; round++) {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 520,
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
    }

    if (classification.modules.includes('VOTING') && prefetchedVoting) {
      const rest = toolResultsAccumulator.filter(t => t.name !== 'fetch_voting_data');
      toolResultsAccumulator = [...rest, { name: 'fetch_voting_data', result: prefetchedVoting }];
    }

    let moduleData = mergeModuleData(classification, mockBase, toolResultsAccumulator, { lobbyingSliceMeta });
    moduleData = withSummarySources(moduleData, toolResultsAccumulator);
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
    let moduleData = mergeModuleData(classification, mb, emptyTools, { lobbyingSliceMeta: lm });
    moduleData = withSummarySources(moduleData, emptyTools);
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
