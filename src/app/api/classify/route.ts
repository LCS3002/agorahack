import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult } from '@/lib/types';

const SYSTEM_PROMPT = `You are the Aletheia classification engine. Given a user query about EU politics, return ONLY a JSON object:
{
  "modules": ["VOTING"|"LOBBYING"|"NEWS"],
  "entities": string[],
  "timeframe": string,
  "query_type": "person"|"legislation"|"topic"|"event"
}
No other text. JSON only. Include 1-3 modules based on relevance. VOTING for votes/legislation/MEPs, LOBBYING for money/influence/donors/companies, NEWS for sentiment/debate/reaction/controversy.`;

function fallbackClassify(query: string): ClassificationResult {
  const q = query.toLowerCase();
  const modules: ClassificationResult['modules'] = [];

  if (q.match(/vote|voted|voting|passed|rejected|mep|parliament|legislation|law|act|directive|regulation/)) {
    modules.push('VOTING');
  }
  if (q.match(/lobby|lobbyist|money|spend|donor|influence|company|corporate|industry|fund|interest/)) {
    modules.push('LOBBYING');
  }
  if (q.match(/news|sentiment|debate|controversy|reaction|opinion|media|coverage|headline|recent|latest/)) {
    modules.push('NEWS');
  }

  // "show me everything" or "conflict of interest"
  if (q.match(/everything|all|full picture|conflict of interest|conflict/)) {
    if (!modules.includes('VOTING'))  modules.push('VOTING');
    if (!modules.includes('LOBBYING')) modules.push('LOBBYING');
    if (!modules.includes('NEWS'))    modules.push('NEWS');
  }

  // Default: show all three if nothing detected
  if (modules.length === 0) {
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  }

  // Extract rough entities
  const knownEntities: string[] = [];
  if (q.includes('von der leyen'))    knownEntities.push('Ursula von der Leyen');
  if (q.includes('pfizer'))           knownEntities.push('Pfizer');
  if (q.includes('nature restoration')) knownEntities.push('Nature Restoration Law');
  if (q.includes('ai act'))           knownEntities.push('EU AI Act');
  if (q.includes('farm'))             knownEntities.push('CAP Farm Subsidies');
  if (q.includes('pharma'))           knownEntities.push('Pharmaceutical Industry');

  const query_type: ClassificationResult['query_type'] =
    q.match(/who|mep|leyen|politician|person/) ? 'person' :
    q.match(/law|act|directive|regulation|vote/) ? 'legislation' :
    q.match(/when|event|summit|meeting/) ? 'event' : 'topic';

  return {
    modules,
    entities: knownEntities,
    timeframe: 'recent',
    query_type,
  };
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(fallbackClassify(query));
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const json = JSON.parse(text.trim());

    return NextResponse.json(json as ClassificationResult);
  } catch {
    // Fallback on any error (parse error, API error, etc.)
    return NextResponse.json(fallbackClassify(query));
  }
}
