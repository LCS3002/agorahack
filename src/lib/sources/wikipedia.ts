export async function fetchWikipediaEntitySummary(entity: string): Promise<{ summary: string | null; found: boolean }> {
  try {
    const encoded = encodeURIComponent(entity.replace(/ /g, '_'));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return { summary: null, found: false };
    const data = await res.json();
    return { summary: (data.extract as string | undefined) ?? null, found: true };
  } catch {
    return { summary: null, found: false };
  }
}
