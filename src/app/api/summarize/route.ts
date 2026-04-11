import { NextRequest } from 'next/server';
import type { ClassificationResult, ModuleData, NewsHeadline, SentimentPoint } from '@/lib/types';
import { selectMockData } from '@/lib/mockDataSelector';

// ── Domain lean map ────────────────────────────────────────────────────────────
const LEAN_MAP: Record<string, 'LEFT' | 'CENTRE' | 'RIGHT'> = {
  'theguardian.com': 'LEFT', 'lemonde.fr': 'LEFT', 'taz.de': 'LEFT',
  'liberation.fr': 'LEFT', 'derstandard.at': 'LEFT',
  'ft.com': 'CENTRE', 'economist.com': 'CENTRE', 'politico.eu': 'CENTRE',
  'euractiv.com': 'CENTRE', 'reuters.com': 'CENTRE', 'bbc.co.uk': 'CENTRE',
  'bbc.com': 'CENTRE', 'apnews.com': 'CENTRE', 'dw.com': 'CENTRE',
  'elpais.com': 'CENTRE', 'sueddeutsche.de': 'CENTRE',
  'telegraph.co.uk': 'RIGHT', 'welt.de': 'RIGHT', 'bild.de': 'RIGHT',
  'lefigaro.fr': 'RIGHT', 'dailymail.co.uk': 'RIGHT', 'express.co.uk': 'RIGHT',
};

function getLean(domain: string): 'LEFT' | 'CENTRE' | 'RIGHT' {
  return LEAN_MAP[domain] ?? 'CENTRE';
}

function parseGDELTDate(d: string): string {
  if (d && d.length >= 8) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  return d ?? '';
}

// ── Tool implementations ───────────────────────────────────────────────────────

async function toolFetchVotingData(query: string, entities: string[] = []) {
  try {
    const [docsRes, votesRes] = await Promise.allSettled([
      fetch('https://data.europarl.europa.eu/api/v1/plenary-documents?format=application%2Fld%2Bjson&limit=50', {
        signal: AbortSignal.timeout(7000),
        headers: { Accept: 'application/json' },
      }),
      fetch('https://data.europarl.europa.eu/api/v1/votes?format=application%2Fld%2Bjson&limit=15', {
        signal: AbortSignal.timeout(7000),
        headers: { Accept: 'application/json' },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let docs: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let votes: any[] = [];

    if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
      const d = await docsRes.value.json();
      docs = d['@graph'] ?? d.results ?? [];
    }
    if (votesRes.status === 'fulfilled' && votesRes.value.ok) {
      const d = await votesRes.value.json();
      votes = d['@graph'] ?? d.results ?? [];
    }

    // Score documents by relevance
    const allTerms = [
      ...query.toLowerCase().split(/\s+/).filter(t => t.length > 3),
      ...entities.map(e => e.toLowerCase()),
    ];

    const scored = docs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((doc: any) => {
        const text = [doc.label, doc.notation, doc.title].filter(Boolean).join(' ').toLowerCase();
        const score = allTerms.filter(t => text.includes(t)).length;
        return { doc, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      matchedDocuments: scored.map(({ doc }) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: String((doc as any).label ?? (doc as any).title ?? 'Unknown'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reference: String((doc as any).notation ?? (doc as any)['@id'] ?? ''),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: String((doc as any).activityDate ?? (doc as any).date ?? ''),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentVotes: votes.slice(0, 5).map((v: any) => ({
        label: String(v.label ?? ''),
        for: Number(v.numberOfVotesFor ?? 0),
        against: Number(v.numberOfVotesAgainst ?? 0),
        abstain: Number(v.numberOfVotesAbstention ?? 0),
        date: String(v.activityDate ?? ''),
      })),
      queryMatched: scored.length > 0,
    };
  } catch {
    return { matchedDocuments: [], recentVotes: [], queryMatched: false };
  }
}

async function toolFetchNewsData(query: string, entities: string[] = []) {
  try {
    const terms: string[] = [];
    const entity = entities.find(e => e.length > 3);
    if (entity) terms.push(`"${entity}"`);
    terms.push('European Parliament');
    const extra = query.split(/\s+/).slice(0, 3).join(' ');
    if (extra) terms.push(extra);

    const qs = new URLSearchParams({
      query: terms.join(' '),
      mode: 'ArtList',
      maxrecords: '20',
      format: 'json',
      sourcelang: 'english',
      timespan: 'MONTH',
      sort: 'DateDesc',
    });

    const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${qs}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`GDELT ${res.status}`);

    const data = await res.json();
    const articles = (data.articles ?? []) as Array<{
      url: string; title: string; seendate: string; domain: string; tone: string;
    }>;

    if (!articles.length) return { headlines: [], sentiment: 0, framing: {}, queryMatched: false };

    const headlines: NewsHeadline[] = articles
      .filter(a => a.title && a.url)
      .slice(0, 10)
      .map(a => ({
        source: a.domain,
        title: a.title,
        sentiment: Math.max(-1, Math.min(1, (parseFloat(a.tone) || 0) / 40)),
        date: parseGDELTDate(a.seendate),
        lean: getLean(a.domain),
      }));

    const tones = articles.map(a => parseFloat(a.tone)).filter(n => !isNaN(n));
    const sentiment = tones.length
      ? Math.max(-1, Math.min(1, tones.reduce((a, b) => a + b, 0) / tones.length / 40))
      : 0;

    // Aggregate sentiment by day
    const byDay: Record<string, number[]> = {};
    for (const a of articles) {
      const date = parseGDELTDate(a.seendate);
      const tone = parseFloat(a.tone);
      if (!isNaN(tone) && date) (byDay[date] ??= []).push(tone / 40);
    }
    const sentimentHistory: SentimentPoint[] = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        score: Math.max(-1, Math.min(1, vals.reduce((a, b) => a + b, 0) / vals.length)),
      }));

    // Group headlines by lean for real framing divergence
    const byLean: Record<string, NewsHeadline[]> = { LEFT: [], CENTRE: [], RIGHT: [] };
    for (const h of headlines) (byLean[h.lean] ??= []).push(h);

    return {
      headlines,
      sentiment,
      sentimentHistory,
      framing: {
        left: byLean.LEFT[0]?.title ?? '',
        centre: byLean.CENTRE[0]?.title ?? '',
        right: byLean.RIGHT[0]?.title ?? '',
      },
      queryMatched: true,
    };
  } catch {
    return { headlines: [], sentiment: 0, sentimentHistory: [], framing: {}, queryMatched: false };
  }
}

async function toolGetEntityBackground(entity: string) {
  try {
    const encoded = encodeURIComponent(entity.replace(/ /g, '_'));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return { summary: null, found: false };
    const data = await res.json();
    return { summary: (data.extract as string | undefined) ?? null, found: true };
  } catch {
    return { summary: null, found: false };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: Record<string, any>) {
  switch (name) {
    case 'fetch_voting_data':
      return toolFetchVotingData(input.query as string, input.entities as string[] ?? []);
    case 'fetch_news_data':
      return toolFetchNewsData(input.query as string, input.entities as string[] ?? []);
    case 'get_entity_background':
      return toolGetEntityBackground(input.entity as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Build ModuleData from tool results ─────────────────────────────────────────
function buildModuleData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolResults: { name: string; result: Record<string, any> }[],
  classification: ClassificationResult,
  mockBase: ModuleData,
): ModuleData {
  const out: ModuleData = { ...mockBase };

  for (const { name, result } of toolResults) {
    if (name === 'fetch_voting_data' && result.queryMatched && classification.modules.includes('VOTING')) {
      const docs = result.matchedDocuments as Array<{ title: string; reference: string; date: string }>;
      const votes = result.recentVotes as Array<{ for: number; against: number; abstain: number; date: string; label: string }>;
      const doc = docs[0];
      const vote = votes[0];
      if (out.voting && (doc || vote)) {
        out.voting = {
          ...out.voting,
          ...(doc ? {
            lawName: doc.title || out.voting.lawName,
            reference: doc.reference || out.voting.reference,
            date: doc.date || vote?.date || out.voting.date,
          } : {}),
          ...(vote && vote.for + vote.against + vote.abstain > 0 ? {
            votes: {
              for: vote.for,
              against: vote.against,
              abstain: vote.abstain,
              total: vote.for + vote.against + vote.abstain,
            },
            status: vote.for > vote.against ? 'PASSED' : 'REJECTED',
          } : {}),
        };
      }
    }

    if (name === 'fetch_news_data' && result.queryMatched && classification.modules.includes('NEWS')) {
      const headlines = result.headlines as NewsHeadline[];
      const framing = result.framing as { left: string; centre: string; right: string };
      const sentiment = result.sentiment as number;
      const history = result.sentimentHistory as SentimentPoint[] ?? [];
      if (out.news && headlines.length > 0) {
        out.news = {
          ...out.news,
          headlines: headlines.slice(0, 8),
          overallSentiment: sentiment,
          sentimentLabel: sentiment > 0.15 ? 'POSITIVE' : sentiment < -0.15 ? 'NEGATIVE' : 'MIXED',
          ...(history.length ? { sentimentHistory: history } : {}),
          framingDivergence: {
            left: framing.left || out.news.framingDivergence.left,
            centre: framing.centre || out.news.framingDivergence.centre,
            right: framing.right || out.news.framingDivergence.right,
          },
        };
      }
    }
  }

  return out;
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
  const mockBase = selectMockData(classification, query);

  // ── No API key: run real data tools directly, return fallback text ────────
  if (!apiKey) {
    const [votingResult, newsResult] = await Promise.allSettled([
      classification.modules.includes('VOTING')
        ? toolFetchVotingData(query, classification.entities)
        : Promise.resolve(null),
      classification.modules.includes('NEWS')
        ? toolFetchNewsData(query, classification.entities)
        : Promise.resolve(null),
    ]);

    const toolResults: { name: string; result: Record<string, unknown> }[] = [];
    if (votingResult.status === 'fulfilled' && votingResult.value)
      toolResults.push({ name: 'fetch_voting_data', result: votingResult.value as Record<string, unknown> });
    if (newsResult.status === 'fulfilled' && newsResult.value)
      toolResults.push({ name: 'fetch_news_data', result: newsResult.value as Record<string, unknown> });

    const moduleData = buildModuleData(toolResults, classification, mockBase);
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

    if (!finalText) finalText = getFallbackSummary(query, mockBase);

    // Build real module data
    const moduleData = buildModuleData(toolResultsAccumulator, classification, mockBase);
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
    const text = getFallbackSummary(query, mockBase);
    const moduleDataB64 = Buffer.from(JSON.stringify(mockBase)).toString('base64');
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Module-Data': moduleDataB64,
        'Access-Control-Expose-Headers': 'X-Module-Data',
      },
    });
  }
}
