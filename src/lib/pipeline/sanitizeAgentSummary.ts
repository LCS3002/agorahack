/**
 * Strip reasoning-model junk that leaks into `message.content` (TNG / R1-style models):
 * raw &lt;tool_call&gt; blobs, preamble planning paragraphs, etc.
 */
export function sanitizeAgentSummaryForUser(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n');

  const tc = t.toLowerCase().indexOf('<tool_call');
  if (tc !== -1) t = t.slice(0, tc).trimEnd();

  const wm = /\*\*What happened\*\*/i.exec(t);
  if (wm && wm.index > 0) t = t.slice(wm.index).trimStart();

  const lines = t.split('\n');
  let i = 0;
  while (i < lines.length) {
    const L = lines[i].trim();
    if (L === '') {
      i++;
      continue;
    }
    const cot =
      /^(Starting with|First,|For How|For Who|For What|Before proceeding|After getting|Time to issue|Check against|Finally,|Putting it together|I should|I'll |I need to|Hmm,|Wait,|Next,|Since [A-Z]|Let me |Now I |Looking at|Based on the|Given that|To answer|The query|The user|The search|The results|I will |I am going|I don't have|I cannot |I was unable|There is no |No information|Unfortunately|The available|As requested)/i.test(L) ||
      /^The tool call\b/i.test(L) ||
      /^Note:.*tool/i.test(L);
    if (cot) {
      i++;
      continue;
    }
    break;
  }
  t = lines.slice(i).join('\n').trimStart();

  // Strip sentences that admit to having no data — these should never reach the user.
  // The agent prompt forbids them, but as a safety net we remove them post-hoc.
  t = t.replace(
    /[^.!?]*\b(could not be verified|no information (was |is )?available|was unable to (find|confirm|verify)|data (was|were) not (returned|found|available)|records do not (confirm|show|indicate)|not (found|available) (in|through|via) (the |available )?(voting |parliamentary |our )?records?|specific (legislative )?details? (regarding|about|for|on)[^.!?]*could not[^.!?]*)[^.!?]*[.!?]/gi,
    ''
  ).replace(/\s{2,}/g, ' ').trim();

  // Strip Unicode replacement characters (U+FFFD) and other junk that appears
  // when TNG/R1 models output multi-byte chars that get mangled in transmission.
  t = t.replace(/\uFFFD/g, '').replace(/[\uFFFE\uFFFF]/g, '');

  // Decode common HTML entities that sneak in from LLM-generated text
  if (t.includes('&')) {
    t = t
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  return t.trim();
}
