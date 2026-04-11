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
      /^(Starting with|First,|For How|For Who|For What|Before proceeding|After getting|Time to issue|Check against|Finally,|Putting it together|I should|I'll |I need to|Hmm,|Wait,|Next,|Since [A-Z])/i.test(L) ||
      /^The tool call\b/i.test(L) ||
      /^Note:.*tool/i.test(L);
    if (cot) {
      i++;
      continue;
    }
    break;
  }
  t = lines.slice(i).join('\n').trimStart();

  return t.trim();
}
