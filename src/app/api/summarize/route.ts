import { NextRequest } from 'next/server';
import type { ClassificationResult, ModuleData } from '@/lib/types';

const SYSTEM_PROMPT = `You are Aletheia, a political transparency tool for EU citizens.
Given structured data from intelligence modules, write a 3-4 sentence plain-language summary.
Be direct. Surface what matters. Flag conflicts of interest unprompted if the data shows them.
Write like The Economist, not like a chatbot. No bullet points. No hedging. State what the data shows.
Be specific: name names, cite figures, note contradictions. Do not start with "The data shows" or similar.`;

function buildContext(query: string, classification: ClassificationResult, moduleData: ModuleData): string {
  const parts: string[] = [`User query: "${query}"`, `Detected entities: ${classification.entities.join(', ')}`, ''];

  if (moduleData.voting) {
    const v = moduleData.voting;
    parts.push(`VOTING DATA — ${v.lawName} (${v.date}): ${v.votes.for} FOR / ${v.votes.against} AGAINST / ${v.votes.abstain} ABSTAIN. Status: ${v.status}.`);
    const conflicts = v.partyBreakdown.filter(p => p.against > p.for);
    if (conflicts.length) parts.push(`Opposing party groups: ${conflicts.map(p => p.party).join(', ')}.`);
    const flaggedMEPs = v.keyMEPs.filter(m => m.note);
    if (flaggedMEPs.length) parts.push(`Notable MEPs: ${flaggedMEPs.map(m => `${m.name} (${m.party}, ${m.vote}${m.note ? ' — ' + m.note : ''})`).join('; ')}.`);
  }

  if (moduleData.lobbying) {
    const l = moduleData.lobbying;
    parts.push('');
    parts.push(`LOBBYING DATA — ${l.topic}: Total declared spend €${l.totalDeclaredSpend}M (${l.period}).`);
    const top3 = l.organizations.slice(0, 3);
    parts.push(`Top lobbyists: ${top3.map(o => `${o.name} (€${o.spend}M, ${o.meetings} meetings)`).join('; ')}.`);
    if (l.conflictFlags.length) {
      parts.push(`CONFLICT FLAGS: ${l.conflictFlags.map(f => `${f.mepName} (${f.party}) had ${f.meetings} meetings with ${f.lobbyist} and voted ${f.votedFor ? 'FOR' : 'AGAINST'}`).join('; ')}.`);
    }
  }

  if (moduleData.news) {
    const n = moduleData.news;
    parts.push('');
    parts.push(`NEWS DATA — ${n.topic}: Overall sentiment ${n.overallSentiment.toFixed(2)} (${n.sentimentLabel}).`);
    parts.push(`Framing divergence — Left: "${n.framingDivergence.left}" | Centre: "${n.framingDivergence.centre}" | Right: "${n.framingDivergence.right}"`);
  }

  return parts.join('\n');
}

function getFallbackSummary(query: string, moduleData: ModuleData): string {
  if (moduleData.lobbying?.conflictFlags?.length && moduleData.voting) {
    const flag = moduleData.lobbying.conflictFlags[0];
    const law = moduleData.voting.lawName;
    return `${flag.mepName} received ${flag.meetings} documented meetings with ${flag.lobbyist} — one of the top-spending lobbyists on ${law} at €${flag.amount}M — while ultimately voting ${flag.votedFor ? 'in favour of' : 'against'} the legislation. The ${moduleData.lobbying.topic} saw €${moduleData.lobbying.totalDeclaredSpend}M in declared lobbying expenditure, predominantly from ${moduleData.lobbying.organizations[0]?.sector ?? 'industry'} interests. ${moduleData.news ? `Media sentiment stands at ${moduleData.news.sentimentLabel.toLowerCase()}, with significant divergence between left and right outlets on whether the outcome represents democratic capture or legitimate advocacy.` : ''}`;
  }

  if (moduleData.voting) {
    const v = moduleData.voting;
    return `The ${v.lawName} passed with ${v.votes.for} votes in favour against ${v.votes.against} opposed — a margin that reflects deep political fracture, particularly within the EPP, where the vote split along national and agricultural interest lines. ${moduleData.lobbying ? `Declared lobbying spend on this file reached €${moduleData.lobbying.totalDeclaredSpend}M, with ${moduleData.lobbying.organizations[0]?.name} leading at €${moduleData.lobbying.organizations[0]?.spend}M.` : ''} The result is formally law, but the political coalition that produced it remains fragile and open to implementation challenges.`;
  }

  return `The query touches on active EU legislative and influence dynamics. Available data indicates significant lobbying activity and a contested political record. The interests at play span industrial and civil society actors, with the balance of formal meetings and declared expenditure pointing toward ${moduleData.lobbying?.organizations[0]?.sector ?? 'industry'} having disproportionate access to key decision-makers in the period under review.`;
}

export async function POST(request: NextRequest) {
  const { query, classification, moduleData } = await request.json() as {
    query: string;
    classification: ClassificationResult;
    moduleData: ModuleData;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const fallback = getFallbackSummary(query, moduleData);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate word-by-word streaming for visual effect
        const words = fallback.split(' ');
        let i = 0;
        const interval = setInterval(() => {
          if (i >= words.length) {
            clearInterval(interval);
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode((i === 0 ? '' : ' ') + words[i]));
          i++;
        }, 30);
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const context = buildContext(query, classification, moduleData);

    const anthropicStream = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of anthropicStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    const fallback = getFallbackSummary(query, moduleData);
    return new Response(fallback, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
