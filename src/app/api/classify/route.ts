import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult, ModuleType } from '@/lib/types';
import { classifyQueryWithOpenAI } from '@/lib/llm/openaiClassify';
import { resolveActiveLlmProvider } from '@/lib/llm/provider';
import { normalizeSearchQuery } from '@/lib/normalizeQuery';
import { processIdFromLegislationKeywords } from '@/lib/sources/parliament';

// Haiku — cheapest model, ideal for fast JSON routing
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are Aletheia's routing engine for EU political intelligence. Return ONLY valid JSON:
{
  "modules": ["VOTING","LOBBYING","NEWS"],
  "entities": string[],
  "timeframe": string,
  "query_type": "person"|"legislation"|"topic"|"event",
  "search_query": string,
  "procedure_ref": "YYYY-NNNN" or null,
  "moduleContext": { "VOTING"?: string, "LOBBYING"?: string, "NEWS"?: string }
}

procedure_ref rules:
- If you know the EU Parliament procedure reference for this legislation, include it as "YYYY-NNNN" (year-number).
- Known references: AI Act → "2021-0106", DSA → "2020-0361", DMA → "2020-0374", GDPR → "2012-0011", Nature Restoration → "2022-0195", Green Deal/Climate Law → "2020-0036", Migration Pact/AMMR → "2020-0279", Asylum Procedures → "2016-0224", NIS2 Directive → "2020-0359", CBAM → "2021-0214", Corporate Sustainability → "2021-0104", Deforestation Regulation → "2021-0366", Packaging Regulation → "2022-0396", Critical Raw Materials → "2023-0079", Chips Act → "2022-0032", CRA → "2022-0272".
- For general topics without a single procedure (e.g. "farm subsidies", "energy policy"), return null.
- For person queries or news-only queries, return null.

search_query rules:
- Strip ALL question-word preamble: "what happened with", "tell me about", "who voted for", "explain", etc.
- Strip leading/trailing stop words and articles ("the", "a", "with", "about").
- Keep proper nouns, acronyms, legislation names, years, and key topic words.
- Examples: "what happened with the 2024 EU Asylum Pact" → "EU Asylum Pact 2024"; "tell me about AI Act lobbying" → "AI Act lobbying"; "who is von der Leyen" → "Ursula von der Leyen"; "taxonomy regulation vote" → "taxonomy regulation".
- If the query is already clean, return it as-is.
- Max 8 words.

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
    /ai act|artificial intelligence|nature restoration|csrd|gdpr|dsa|dma|taxonomy|green deal|farm subsidies|cap\b|pfizer|pharma|vaccine|asylum pact|pact on migration|asylum.*pact|migration.*pact/
  );

  // Derive entities first so we can use them in moduleContext hints
  const entities: string[] = [];
  if (q.includes('von der leyen'))      entities.push('Ursula von der Leyen');
  if (q.includes('pfizer'))             entities.push('Pfizer');
  if (q.includes('nature restoration')) entities.push('Nature Restoration Law');
  if (q.includes('digital services act') || /\bdsa\b/.test(q)) entities.push('Digital Services Act');
  if (q.includes('digital markets act') || /\bdma\b/.test(q)) entities.push('Digital Markets Act');
  if (q.includes('ai act'))             entities.push('EU AI Act');
  if (q.includes('farm'))               entities.push('CAP Farm Subsidies');
  if (q.includes('pharma'))             entities.push('Pharmaceutical Industry');
  if (q.includes('csrd'))               entities.push('CSRD');
  if (q.includes('benifei'))            entities.push('Brando Benifei');
  if (q.includes('voss'))               entities.push('Axel Voss');
  if (q.includes('asylum pact') || q.includes('pact on migration') ||
      (q.includes('asylum') && q.includes('pact')))
    entities.push('EU Pact on Migration and Asylum');
  else if (q.includes('asylum') || q.includes('migration pact'))
    entities.push('EU Asylum and Migration Policy');

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

  // Derive procedure_ref for well-known legislation from the keyword table
  const procedure_ref = processIdFromLegislationKeywords([query, ...entities].join(' ')) ?? null;

  return {
    modules,
    entities,
    timeframe: q.match(/\b20\d\d\b/) ? (q.match(/\b20\d\d\b/)![0]) : 'recent',
    query_type,
    search_query: normalizeSearchQuery(query, entities),
    procedure_ref,
    moduleContext: Object.keys(moduleContext).length ? moduleContext : undefined,
  };
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  const provider = resolveActiveLlmProvider();

  if (provider === 'none') {
    return NextResponse.json(fallbackClassify(query));
  }

  try {
    if (provider === 'openai') {
      const json = await classifyQueryWithOpenAI(query, SYSTEM_PROMPT);
      return NextResponse.json(json as ClassificationResult);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY!;
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
