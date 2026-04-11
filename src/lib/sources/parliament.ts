/**
 * EU Parliament open data — plenary documents + recent votes (no API key).
 */

export interface ParliamentVotingFetchResult {
  matchedDocuments: Array<{ title: string; reference: string; date: string }>;
  recentVotes: Array<{
    label: string;
    for: number;
    against: number;
    abstain: number;
    date: string;
  }>;
  queryMatched: boolean;
}

export async function fetchParliamentVotingData(
  query: string,
  entities: string[] = [],
): Promise<ParliamentVotingFetchResult> {
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
