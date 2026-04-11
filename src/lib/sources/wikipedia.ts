export async function fetchWikipediaEntitySummary(entity: string): Promise<{
  summary: string | null;
  found: boolean;
  pageUrl?: string;
  title?: string;
}> {
  try {
    const encoded = encodeURIComponent(entity.replace(/ /g, '_'));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return { summary: null, found: false };
    const data = (await res.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
      title?: string;
    };
    const pageUrl = data.content_urls?.desktop?.page;
    return {
      summary: data.extract ?? null,
      found: true,
      ...(pageUrl ? { pageUrl } : {}),
      ...(data.title ? { title: data.title } : {}),
    };
  } catch {
    return { summary: null, found: false };
  }
}
