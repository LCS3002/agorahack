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
const AGENT_SYSTEM = `You are Aletheia: gather EU policy intelligence with tools, then write ONLY the user-facing brief. Never tell the user what you fetched, which tools ran, or your process — jump straight into the substance.

TOOL USE (internal — do not narrate to the user):
- Call fetch_voting_data when VOTING is relevant. Use the user's exact query string; keep procedure references like 2020/0361(COD) verbatim.
- Call fetch_news_data when NEWS is relevant.
- Call get_entity_background for the primary entity when it adds factual context.
- If the user message includes a "Pre-fetched voting record" JSON block, those figures and references are authoritative — do not claim vote data is missing.

USER-FACING SUMMARY — neutral, fact-based intelligence for a general reader.

Goal — help them understand:
1. **What happened** — policy outcome (passed/rejected, vote counts if available).
2. **How it was decided** — voting / parliamentary dynamics (party alignment, notable splits).
3. **Who was active around it** — lobbying: declared organisations, spending, registrations (without implying they changed outcomes).
4. **How it is discussed** — news / sentiment as media framing, not as ground truth.

You may receive structured results from: voting (official), lobbying (Transparency Register declarations), news (headlines/sentiment), entity background (e.g. Wikipedia).

RULES:
- Do **not** infer causality. Never claim lobbying organisations influenced votes. Use neutral phrasing: "active around the policy", "declared spend on the file", "registered interest in discussions concerning…".
- State uncertainty clearly when data is missing or thin (e.g. "No matching plenary vote was returned for this query.").
- Keep types distinct: voting = factual outcome; lobbying = declared activity; news = how outlets frame the topic.
- No speculation on motives, hidden deals, or unverified relationships.
- **Length (strict):** Before the SOURCES block, write at most **~140–180 words** in **2–3 short paragraphs** (or 4 only if each is 1–2 sentences). Tight > complete: drop optional detail, merge ideas, one clause per sentence where possible.
- Do **not** use ### subheadings unless the topic truly needs a split; default is continuous prose.
- **Markdown:** **bold** only for the main outcome and one or two key labels; *italic* rarely. Avoid bullet lists in the main text.
- Tone: neutral, analytical, accessible to non-experts.
- Forbidden openers/meta: do not use "Based on the data", "The tools show", "I queried", "Here is what we found", "After fetching".

Compress into one flowing brief (omit whole angles if no data): outcome → dynamics → lobbying (if any) → media (if any) → half-sentence on gaps only if needed.

SOURCES (required machine format — after all prose):
- Put a blank line, then a single line containing exactly: SOURCES
- Then a blank line, then numbered lines [1] … matching every inline citation you used.
- **2–3 sources** preferred (4 only if you truly cited four distinct types). Only cite what you referenced.
- When those tools returned usable data, prefer this order: [1] EP procedure / vote, [2] EU Transparency Register, [3] a news item (URL from fetch_news_data when present), [4] Wikipedia / entity background URL from get_entity_background.`;

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

    const userAgentContent = `Query: "${query}"
Modules needed: ${classification.modules.join(', ')}
Entities detected: ${classification.entities.join(', ') || 'none'}
Timeframe: ${classification.timeframe}

Fetch the relevant data and write your summary.${prefetchNote}`;

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
