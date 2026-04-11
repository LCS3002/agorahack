import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult, ModuleType } from '@/lib/types';

// Haiku — cheapest model, ideal for fast JSON routing
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are Aletheia's routing engine for EU political intelligence. Return ONLY valid JSON:
{
  "modules": ["VOTING","LOBBYING","NEWS"],
  "entities": string[],
  "timeframe": string,
  "query_type": "person"|"legislation"|"topic"|"event",
  "moduleContext": { "VOTING"?: string, "LOBBYING"?: string, "NEWS"?: string }
}

Module selection rules — load data only when contextually relevant:
- Legislation / policy / directive / regulation / law / act / bill / vote / committee → VOTING + LOBBYING + NEWS
- Lobbying / money / donors / corporate / industry / influence / conflict of interest / revolving door / corruption → VOTING + LOBBYING + NEWS
- Person / MEP / commissioner / minister WITH a named bill or policy → VOTING + LOBBYING + NEWS
- Person / MEP / commissioner / minister WITHOUT a named bill → VOTING + NEWS only
- Party / political group WITHOUT a named bill → VOTING + NEWS only
- Pure news / sentiment / media / debate / coverage → NEWS only
- Open-ended topic or "everything" → VOTING + LOBBYING + NEWS
- Default when uncertain: VOTING + LOBBYING + NEWS

moduleContext rules — only populate for modules NOT in the modules array, to explain the empty state:
- LOBBYING excluded for a person query: "Lobbying analysis is policy-level — mention a specific bill to see conflict-of-interest signals for [entity name]."
- LOBBYING excluded for a party query: "Lobbying analysis is policy-level — name a specific regulation to surface spend and conflict flags."
- VOTING excluded: "Mention a specific vote, bill, or MEP to see roll-call records."
- NEWS excluded: "Mention a topic or person to see media sentiment trends."
Do NOT populate moduleContext for modules that ARE in the modules array.

entities: proper names only (people, laws, companies, countries). Max 5.
timeframe: "recent" | "last year" | "2020-2024" | specific year as string.
Never return an empty modules array.`;

function fallbackClassify(query: string): ClassificationResult {
  const q = query.toLowerCase();

  const isPolicyQuery = !!q.match(
    /law|act|directive|regulation|legislation|policy|reform|vote|voted|voting|passed|rejected|parliament|plenary|committee/
  );
  const isPersonQuery = !!q.match(
    /who|mep|minister|commissioner|politician|leyen|von der|president|rapporteur|benifei|tudorache|hahn|voss|breyer/
  );
  const isLobbyQuery = !!q.match(
    /lobby|lobbyist|money|spend|donor|influence|company|corporate|industry|fund|interest|conflict|revolving/
  );
  const isNewsOnly = !isPolicyQuery && !isPersonQuery && !isLobbyQuery &&
    !!q.match(/news|sentiment|debate|controversy|reaction|opinion|media|coverage|headline/);
  const isPartyQuery = !isPersonQuery && !!q.match(
    /\bepp\b|\bs&d\b|\brenew\b|\becr\b|\bid\b|\bgreens\b|\bparty\b|\bgroup\b|socialist|conservative|liberal|green/
  );
  // Bill mentioned alongside person/party query?
  const hasBillMention = !!q.match(
    /ai act|artificial intelligence|nature restoration|csrd|gdpr|dsa|dma|taxonomy|green deal|farm subsidies|cap\b|pfizer|pharma|vaccine/
  );

  // Derive entities first so we can use them in moduleContext hints
  const entities: string[] = [];
  if (q.includes('von der leyen'))      entities.push('Ursula von der Leyen');
  if (q.includes('pfizer'))             entities.push('Pfizer');
  if (q.includes('nature restoration')) entities.push('Nature Restoration Law');
  if (q.includes('ai act'))             entities.push('EU AI Act');
  if (q.includes('farm'))               entities.push('CAP Farm Subsidies');
  if (q.includes('pharma'))             entities.push('Pharmaceutical Industry');
  if (q.includes('csrd'))               entities.push('CSRD');
  if (q.includes('benifei'))            entities.push('Brando Benifei');
  if (q.includes('voss'))               entities.push('Axel Voss');

  const entityName = entities[0] ?? 'this person';

  const modules: ClassificationResult['modules'] = [];
  const moduleContext: Partial<Record<ModuleType, string>> = {};

  if (isPolicyQuery || isLobbyQuery || q.match(/everything|all|full picture/)) {
    // Policy or lobbying focus → full picture
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  } else if (isPersonQuery && hasBillMention) {
    // Person + specific bill → all three
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  } else if (isPersonQuery && !hasBillMention) {
    // Pure person profile → voting record + news; lobbying is policy-level
    modules.push('VOTING', 'NEWS');
    moduleContext['LOBBYING'] = `Lobbying analysis is policy-level — mention a specific bill to see conflict-of-interest signals for ${entityName}.`;
  } else if (isPartyQuery && !hasBillMention) {
    // Party query without a specific file → voting + news
    modules.push('VOTING', 'NEWS');
    moduleContext['LOBBYING'] = 'Lobbying analysis is policy-level — name a specific regulation to surface spend and conflict flags.';
  } else if (isNewsOnly) {
    modules.push('NEWS');
    moduleContext['VOTING'] = 'Mention a specific vote, bill, or MEP to see roll-call records.';
    moduleContext['LOBBYING'] = 'Mention a specific regulation to surface lobbying spend and conflict flags.';
  } else {
    // Default: all three
    modules.push('VOTING', 'LOBBYING', 'NEWS');
  }

  const query_type: ClassificationResult['query_type'] =
    isPersonQuery ? 'person' :
    isPolicyQuery ? 'legislation' :
    q.match(/when|event|summit|meeting/) ? 'event' : 'topic';

  return {
    modules,
    entities,
    timeframe: q.match(/\b20\d\d\b/) ? (q.match(/\b20\d\d\b/)![0]) : 'recent',
    query_type,
    moduleContext: Object.keys(moduleContext).length ? moduleContext : undefined,
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
