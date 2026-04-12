import { NextRequest } from 'next/server';
import type { ClassificationResult, ModuleData, ModuleSliceMeta } from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';
import { mergeModuleData } from '@/lib/pipeline/mergeModuleData';
import { fetchParliamentVotingData } from '@/lib/sources/parliament';
import { fetchGdeltNewsData, type GdeltFetchResult } from '@/lib/sources/gdelt';
import { fetchValyuNewsData } from '@/lib/sources/valyu';
import { fetchWikipediaEntitySummary } from '@/lib/sources/wikipedia';
import { buildLobbyingFromRegisterSnapshot } from '@/lib/transparencyRegister/search';
import { withSummarySources } from '@/lib/pipeline/summarySources';
import { sanitizeAgentSummaryForUser } from '@/lib/pipeline/sanitizeAgentSummary';
import { normalizeSearchQuery } from '@/lib/normalizeQuery';
import { createOpenAIClient, defaultOpenAIAgentModel, resolveActiveLlmProvider } from '@/lib/llm/provider';
import { runOpenAISummarizeAgent } from '@/lib/llm/openaiSummarizeAgent';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: any };

// ── Stream event protocol ──────────────────────────────────────────────────────
// Each line ends with \n. Client parses by prefix (all ASCII — § caused build issues):
//   EVT_T:start:toolName       — tool is running
//   EVT_T:done:toolName:1|0    — tool finished (1=matched, 0=miss)
//   EVT_D:base64               — moduleData JSON, base64-encoded
//   EVT_X:base64               — full summary text, base64-encoded (client animates)

function prepareModuleBase(
  classification: ClassificationResult,
  query: string,
  searchQuery: string,
): { mockBase: ModuleData; lobbyingSliceMeta?: ModuleSliceMeta } {
  let mockBase = selectMockData(classification, query);
  let lobbyingSliceMeta: ModuleSliceMeta | undefined;
  if (classification.modules.includes('LOBBYING') && mockBase.lobbying) {
    // Use searchQuery (LLM-cleaned) for the lobbying topic title, not the raw prompt
    const reg = buildLobbyingFromRegisterSnapshot(searchQuery, classification.entities, mockBase.lobbying);
    mockBase = { ...mockBase, lobbying: reg.lobbying };
    lobbyingSliceMeta = reg.sliceMeta;
  }
  return { mockBase, lobbyingSliceMeta };
}

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

function compactNewsSnapshotForPrompt(news: GdeltFetchResult): string {
  return JSON.stringify({
    queryMatched: news.queryMatched,
    overallSentiment: news.sentiment,
    headlines: news.headlines.slice(0, 6).map(h => ({
      title: h.title,
      source: h.source,
      lean: h.lean,
      url: h.url,
    })),
    framing: news.framing,
  });
}

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

/** Valyu when key present, GDELT fallback on empty or error */
async function fetchNewsData(query: string, entities: string[]): Promise<GdeltFetchResult> {
  if (process.env.VALYU_API_KEY?.trim()) {
    try {
      const r = await fetchValyuNewsData(query, entities);
      if (r.queryMatched) return r;
      console.warn('Valyu returned 0 results, falling back to GDELT');
    } catch (e) { console.warn('Valyu failed, falling back to GDELT:', e); }
  }
  return fetchGdeltNewsData(query, entities);
}

/** Factory so each request's executeTool closes over classification.procedure_ref */
function makeExecuteTool(procedureRef?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async function executeTool(name: string, input: Record<string, any>) {
    switch (name) {
      case 'fetch_voting_data':
        return fetchParliamentVotingData(input.query as string, (input.entities as string[]) ?? [], procedureRef);
      case 'fetch_news_data':
        return fetchNewsData(input.query as string, (input.entities as string[]) ?? []);
      case 'get_entity_background':
        return fetchWikipediaEntitySummary(input.entity as string);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  };
}

// ── Agent system prompt ────────────────────────────────────────────────────────
const AGENT_SYSTEM = `You are Aletheia, an EU political intelligence briefing engine. Your job is to produce one polished, journalist-quality brief — always substantive, never hollow.

CRITICAL — OUTPUT MUST NOT CONTAIN:
- Any chain-of-thought, planning, or self-dialogue (no "First,", "Next,", "Wait,", "Hmm,", "I should", "I'll call", "Putting it together", "This is a gap").
- Any mention of tools, APIs, "pre-fetched", "the user", "modules", or what you will/won't call.
- Phrases like "could not be verified", "no information available", "I was unable to find", "data was not returned", "records do not confirm". These are forbidden.
- If you reason internally, none of that may appear in the message. Only the four sections below + SOURCES.

KNOWLEDGE RULE — most important:
You have broad training knowledge of EU politics, legislation, institutions, and controversies. ALWAYS use it. Tool outputs add real-time precision (vote counts, spending figures, live headlines) — they do not replace your knowledge base. If tools return no match, write the brief entirely from your training knowledge. A brief with general knowledge is always better than one that says "no information." Never leave a section empty because a tool returned nothing.

TOOL USE (silent — never describe in the answer):
- fetch_voting_data when VOTING is relevant (exact query string; procedure refs verbatim).
- fetch_news_data when NEWS is relevant.
- get_entity_background when it adds factual context on a person, organisation, or concept.
- If the user message includes a "Pre-fetched voting record" JSON block, those counts and references are authoritative — use them verbatim.
- If the user message includes "Pre-fetched news context" JSON, use it for the **How it is discussed** section.
- If the user message includes "Pre-loaded declared lobbying context" JSON, use it for the **Who was active** section (declared spend / organisations only). There is no separate lobbying tool.

USER VISIBLE STRUCTURE — use these four lines exactly as bold labels, each followed by 1–3 short sentences.

**What happened**
What the policy is, whether it passed or was rejected, vote numbers and date if known — or a clear factual summary of the file if no vote data is available.

**How it was decided**
Political dynamics: which groups supported or opposed, key splits, controversies, or coalitions. Draw on your knowledge when tool data is thin.

**Who was active**
Lobbying / key actors: use pre-loaded lobbying JSON when present. When absent, name the main industry or civil-society actors known to be active on this topic from your training knowledge — framed as declared or reported interests, never implying causation.

**How it is discussed**
Media framing, public controversy, or societal debate — draw on news tool results if available, otherwise your knowledge of how this topic has been covered and contested.

SUBSTANCE RULES:
- No causality from lobbying to outcomes. No invented vote tallies or spending figures without a source.
- Never say a topic is too obscure or that data was unavailable — write what you know.
- **Length:** Before SOURCES, stay around **160–220 words** total across the four sections; tight sentences.
- **Markdown:** keep the **What happened** / **How it was decided** / **Who was active** / **How it is discussed** labels in bold; *italic* rarely; no bullet lists in the body.

SOURCES (required — after all sections):
- Blank line, then a line with exactly: SOURCES
- Blank line, then [1] … lines for every citation used in the text.
- Prefer **2–3** sources (4 only if needed). Order when applicable: [1] EP vote/procedure, [2] Transparency Register (registry URL from lobbying JSON if used), [3] news URL from fetch_news_data, [4] Wikipedia from get_entity_background.`;

// ── Fallback summary (no LLM) ──────────────────────────────────────────────────
function topLobbyingOrgBySpend(md: ModuleData) {
  const orgs = md.lobbying?.organizations;
  if (!orgs?.length) return null;
  return orgs.reduce((a, b) => (a.spend >= b.spend ? a : b));
}

function getFallbackSummary(query: string, md: ModuleData): string {
  if (md.lobbying?.conflictFlags?.length && md.voting) {
    const flag = md.lobbying.conflictFlags[0];
    const lawName = md.voting.lawName ?? 'this legislation';
    return `${flag.mepName} received ${flag.meetings} documented meetings with ${flag.lobbyist} — one of the top-spending lobbyists on ${lawName} at €${flag.amount}M — while ultimately voting ${flag.votedFor ? 'in favour of' : 'against'} the legislation [1]. The ${md.lobbying.topic} saw €${md.lobbying.totalDeclaredSpend}M in declared lobbying expenditure [2].${md.news ? ` Media sentiment is ${md.news.sentimentLabel.toLowerCase()}, with divergence between left and right outlets on whether the outcome represents democratic capture or legitimate advocacy [3].` : ''}`;
  }
  if (md.voting) {
    const v = md.voting;
    const lawName = v.lawName ?? query;
    const status = v.status === 'PASSED' ? 'passed' : v.status === 'REJECTED' ? 'was rejected' : 'was voted on';
    const lead = topLobbyingOrgBySpend(md);
    return `The ${lawName} ${status} with ${v.votes?.for ?? 0} votes in favour against ${v.votes?.against ?? 0} opposed [1].${md.lobbying && lead ? ` Declared lobbying spend among surfaced registrants totals €${md.lobbying.totalDeclaredSpend}M, with ${lead.name} highest at €${lead.spend}M [2].` : ''} ${md.news ? `Media sentiment is ${md.news.sentimentLabel.toLowerCase()} [3].` : ''}`;
  }
  const lead2 = topLobbyingOrgBySpend(md);
  const sector = lead2?.sector ?? md.lobbying?.organizations?.[0]?.sector ?? 'industry';
  return `The query "${query}" relates to active EU legislative and influence dynamics.${md.lobbying ? ` Declared lobbying expenditure totals €${md.lobbying.totalDeclaredSpend}M, with ${sector} actors most prominent [1].` : ''}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    query: string;
    classification: ClassificationResult;
    /** Last N prior queries for multi-turn context (newest first from client). */
    conversationHistory?: Array<{ query: string; summary: string }>;
  };
  const { query, classification } = body;
  const conversationHistory = body.conversationHistory ?? [];
  // Use the LLM-extracted clean search phrase when available; fall back to regex normalizer
  const searchQuery = classification.search_query || normalizeSearchQuery(query, classification.entities);
  const procedureRef = classification.procedure_ref ?? null;
  const executeTool = makeExecuteTool(procedureRef);

  const provider = resolveActiveLlmProvider();
  const { mockBase, lobbyingSliceMeta } = prepareModuleBase(classification, query, searchQuery);

  const encoder = new TextEncoder();
  const enc = (s: string) => encoder.encode(s);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (line: string) => controller.enqueue(enc(line + '\n'));

      try {
        // ── No LLM: real data tools + fallback text ─────────────────────────
        if (provider === 'none') {
          if (classification.modules.includes('VOTING')) emit('EVT_T:start:fetch_voting_data');
          if (classification.modules.includes('NEWS')) emit('EVT_T:start:fetch_news_data');

          const [votingResult, newsResult] = await Promise.allSettled([
            classification.modules.includes('VOTING')
              ? fetchParliamentVotingData(searchQuery, classification.entities, procedureRef)
              : Promise.resolve(null),
            classification.modules.includes('NEWS')
              ? fetchNewsData(searchQuery, classification.entities)
              : Promise.resolve(null),
          ]);

          if (classification.modules.includes('VOTING')) {
            const ok = votingResult.status === 'fulfilled' && votingResult.value?.queryMatched;
            emit(`EVT_T:done:fetch_voting_data:${ok ? 1 : 0}`);
          }
          if (classification.modules.includes('NEWS')) {
            const ok = newsResult.status === 'fulfilled' && (newsResult.value as GdeltFetchResult | null)?.queryMatched;
            emit(`EVT_T:done:fetch_news_data:${ok ? 1 : 0}`);
          }

          const toolResults: { name: string; result: Record<string, unknown> }[] = [];
          if (votingResult.status === 'fulfilled' && votingResult.value)
            toolResults.push({ name: 'fetch_voting_data', result: votingResult.value as unknown as Record<string, unknown> });
          if (newsResult.status === 'fulfilled' && newsResult.value)
            toolResults.push({ name: 'fetch_news_data', result: newsResult.value as unknown as Record<string, unknown> });

          let moduleData = mergeModuleData(classification, mockBase, toolResults, { lobbyingSliceMeta, searchQuery });
          moduleData = withSummarySources(moduleData, toolResults);
          if (moduleData.meta?.voting?.source === 'mock') moduleData = { ...moduleData, voting: undefined };
          if (moduleData.meta?.news?.source === 'mock') moduleData = { ...moduleData, news: undefined };
          const text = getFallbackSummary(query, moduleData);

          emit(`EVT_D:${Buffer.from(JSON.stringify(moduleData)).toString('base64')}`);
          emit(`EVT_X:${Buffer.from(text).toString('base64')}`);
          controller.close();
          return;
        }

        // ── With LLM: parallel pre-fetch voting + news + Wikipedia background ──
        if (classification.modules.includes('VOTING')) emit('EVT_T:start:fetch_voting_data');
        if (classification.modules.includes('NEWS')) emit('EVT_T:start:fetch_news_data');

        // Always fetch Wikipedia background for the primary entity / query — gives
        // the agent a solid knowledge base even when EP API + news APIs return nothing.
        const backgroundEntity = classification.entities[0] || searchQuery;

        const [votingSettled, newsSettled, wikiSettled] = await Promise.allSettled([
          classification.modules.includes('VOTING')
            ? fetchParliamentVotingData(searchQuery, classification.entities, procedureRef).then(r => {
                emit(`EVT_T:done:fetch_voting_data:${r.queryMatched ? 1 : 0}`);
                return r;
              })
            : Promise.resolve(null),
          classification.modules.includes('NEWS')
            ? fetchNewsData(searchQuery, classification.entities).then(r => {
                emit(`EVT_T:done:fetch_news_data:${r.queryMatched ? 1 : 0}`);
                return r;
              })
            : Promise.resolve(null),
          fetchWikipediaEntitySummary(backgroundEntity),
        ]);

        const prefetchedVoting =
          votingSettled.status === 'fulfilled' && votingSettled.value?.queryMatched
            ? (votingSettled.value as unknown as Record<string, unknown>)
            : null;
        const prefetchedNews =
          newsSettled.status === 'fulfilled' && (newsSettled.value as GdeltFetchResult | null)?.queryMatched
            ? (newsSettled.value as GdeltFetchResult)
            : null;
        const wikiResult =
          wikiSettled.status === 'fulfilled' && wikiSettled.value?.found
            ? wikiSettled.value
            : null;

        const prefetchNote = prefetchedVoting
          ? `\n\nPre-fetched voting record (authoritative for vote totals; use in **What happened**):\n${compactVotingSnapshotForPrompt(prefetchedVoting)}\n`
          : '';
        const newsNote = prefetchedNews
          ? `\n\nPre-fetched news context (use in **How it is discussed**):\n${compactNewsSnapshotForPrompt(prefetchedNews)}\n`
          : '';
        const lobbyingNote =
          classification.modules.includes('LOBBYING') && mockBase.lobbying
            ? `\n\nPre-loaded declared lobbying context (use for **Who was active**; descriptive only, never imply influence on votes):\n${compactLobbyingSnapshotForPrompt(mockBase.lobbying)}\n`
            : '';
        const wikiNote = wikiResult?.summary
          ? `\n\nBackground context (Wikipedia — use freely across all sections as factual grounding):\n${wikiResult.summary.slice(0, 800)}\n`
          : '';

        const userAgentContent = `Query: "${query}"
Modules needed: ${classification.modules.join(', ')}
Entities detected: ${classification.entities.join(', ') || 'none'}
Timeframe: ${classification.timeframe}

Write only the user-facing brief (four bold sections + SOURCES). Do not discuss tools or your plan.${prefetchNote}${newsNote}${lobbyingNote}${wikiNote}`;

        // Multi-turn: prepend last 3 prior summaries as conversation context
        const priorMessages: ChatMsg[] = conversationHistory
          .slice(0, 3)
          .reverse() // oldest first
          .flatMap(h => ([
            { role: 'user' as const, content: `Prior query: "${h.query}"` },
            { role: 'assistant' as const, content: h.summary.split('\nSOURCES\n')[0].trim() },
          ]));

        let toolResultsAccumulator: { name: string; result: Record<string, unknown> }[] = [];
        let finalText = '';

        if (provider === 'openai') {
          const openai = createOpenAIClient();
          const model = defaultOpenAIAgentModel();
          const { finalText: ft, toolResults } = await runOpenAISummarizeAgent(openai, {
            model,
            system: AGENT_SYSTEM,
            userContent: userAgentContent,
            priorMessages,
            executeTool: (name, input) => executeTool(name, input),
            onToolStart: (name) => emit(`EVT_T:start:${name}`),
            onToolDone: (name, matched) => emit(`EVT_T:done:${name}:${matched ? 1 : 0}`),
            maxTokens: 900,
          });
          finalText = ft;
          toolResultsAccumulator = toolResults;
        } else {
          // Anthropic fallback
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
                  emit(`EVT_T:start:${block.name}`);
                  const result = await executeTool(block.name, block.input as Record<string, unknown>);
                  const matched = (result as Record<string, unknown>)?.queryMatched !== false;
                  emit(`EVT_T:done:${block.name}:${matched ? 1 : 0}`);
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

        // Inject pre-fetched results so mergeModuleData gets real data
        if (prefetchedVoting) {
          toolResultsAccumulator = [
            ...toolResultsAccumulator.filter(t => t.name !== 'fetch_voting_data'),
            { name: 'fetch_voting_data', result: prefetchedVoting },
          ];
        }
        if (prefetchedNews) {
          toolResultsAccumulator = [
            ...toolResultsAccumulator.filter(t => t.name !== 'fetch_news_data'),
            { name: 'fetch_news_data', result: prefetchedNews as unknown as Record<string, unknown> },
          ];
        }

        let moduleData = mergeModuleData(classification, mockBase, toolResultsAccumulator, { lobbyingSliceMeta, searchQuery });
        moduleData = withSummarySources(moduleData, toolResultsAccumulator);

        // Don't show fixture data when the query has no real match — clear unmatched modules
        // so the dashboard renders empty state rather than a wrong scenario.
        // IMPORTANT: strip mock data BEFORE generating fallback text so the text matches what the UI shows.
        if (moduleData.meta?.voting?.source === 'mock') moduleData = { ...moduleData, voting: undefined };
        if (moduleData.meta?.news?.source === 'mock') moduleData = { ...moduleData, news: undefined };

        finalText = sanitizeAgentSummaryForUser(finalText);
        if (!finalText) finalText = getFallbackSummary(searchQuery, moduleData);

        emit(`EVT_D:${Buffer.from(JSON.stringify(moduleData)).toString('base64')}`);
        emit(`EVT_X:${Buffer.from(finalText).toString('base64')}`);
        controller.close();

      } catch (err) {
        console.error('Summarize error:', err);
        try {
          const emptyTools: { name: string; result: Record<string, unknown> }[] = [];
          let moduleData = mergeModuleData(classification, mockBase, emptyTools, { lobbyingSliceMeta, searchQuery });
          moduleData = withSummarySources(moduleData, emptyTools);
          // Clear mock data in error path too — don't emit stale fixture data as if it were real
          if (moduleData.meta?.voting?.source === 'mock') moduleData = { ...moduleData, voting: undefined };
          if (moduleData.meta?.news?.source === 'mock') moduleData = { ...moduleData, news: undefined };
          const text = getFallbackSummary(searchQuery, moduleData);
          emit(`EVT_D:${Buffer.from(JSON.stringify(moduleData)).toString('base64')}`);
          emit(`EVT_X:${Buffer.from(text).toString('base64')}`);
        } finally {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
