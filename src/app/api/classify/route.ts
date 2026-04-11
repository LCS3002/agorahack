import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult } from '@/lib/types';

// Haiku — cheapest model, ideal for fast JSON routing
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are Aletheia's routing engine for EU political intelligence. Given a user query, return ONLY valid JSON with no other text:
{
  "modules": ["VOTING","LOBBYING","NEWS"],
  "entities": string[],
  "timeframe": string,
  "query_type": "person"|"legislation"|"topic"|"event"
}

Module selection rules (apply all that match):
- Legislation / policy / law / directive / regulation / act / vote → always all three: VOTING + LOBBYING + NEWS
- Person query (MEP, commissioner, politician, minister) → always all three: VOTING + LOBBYING + NEWS
- Lobbying / money / donors / influence / corporate / industry → LOBBYING + VOTING + NEWS
- Conflict of interest / revolving door / corruption → all three
- Media / sentiment / controversy / debate / reaction → NEWS (+ others if relevant)
- "everything" / "full picture" / open-ended topic → all three

Default to all three when uncertain. Never return an empty modules array.
entities: extract proper names (people, laws, companies, countries). Keep to ≤5.
timeframe: "recent" | "2020-2024" | "last year" | specific year as string.`;

function fallbackClassify(query: string): ClassificationResult {
  const q = query.toLowerCase();

  // Policy / legislation signals → all 3
  const isPolicyQuery = !!q.match(
    /law|act|directive|regulation|legislation|policy|reform|vote|voted|voting|passed|rejected|parliament|plenary|committee/
  );
  // Person signals → all 3
  const isPersonQuery = !!q.match(
    /who|mep|minister|commissioner|politician|leyen|von der|president|rapporteur/
  );
  // Lobbying signals
  const isLobbyQuery = !!q.match(
    /lobby|lobbyist|money|spend|donor|influence|company|corporate|industry|fund|interest|conflict|revolving/
  );
  // News-only signals (no policy/person angle)
  const isNewsOnly = !isPolicyQuery && !isPersonQuery && !isLobbyQuery &&
    !!q.match(/news|sentiment|debate|controversy|reaction|opinion|media|coverage|headline/);

  const modules: ClassificationResult['modules'] = [];

  if (isPolicyQuery || isPersonQuery || isLobbyQuery ||
      q.match(/everything|all|full picture/) ||
      modules.length === 0) {
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  } else if (isNewsOnly) {
    modules.push('NEWS');
  } else {
    // Default: all three
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  }

  // Deduplicate
  const uniqueModules = [...new Set(modules)] as ClassificationResult['modules'];

  const entities: string[] = [];
  if (q.includes('von der leyen'))      entities.push('Ursula von der Leyen');
  if (q.includes('pfizer'))             entities.push('Pfizer');
  if (q.includes('nature restoration')) entities.push('Nature Restoration Law');
  if (q.includes('digital services act') || /\bdsa\b/.test(q)) entities.push('Digital Services Act');
  if (q.includes('digital markets act') || /\bdma\b/.test(q)) entities.push('Digital Markets Act');
  if (q.includes('ai act'))             entities.push('EU AI Act');
  if (q.includes('farm'))              entities.push('CAP Farm Subsidies');
  if (q.includes('pharma'))            entities.push('Pharmaceutical Industry');
  if (q.includes('csrd'))              entities.push('CSRD');

  const query_type: ClassificationResult['query_type'] =
    isPersonQuery ? 'person' :
    isPolicyQuery ? 'legislation' :
    q.match(/when|event|summit|meeting/) ? 'event' : 'topic';

  return {
    modules: uniqueModules,
    entities,
    timeframe: q.match(/\b20\d\d\b/) ? (q.match(/\b20\d\d\b/)![0]) : 'recent',
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
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    // Strip markdown code fences if model wraps the JSON
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const json = JSON.parse(clean);

    return NextResponse.json(json as ClassificationResult);
  } catch {
    return NextResponse.json(fallbackClassify(query));
  }
}
