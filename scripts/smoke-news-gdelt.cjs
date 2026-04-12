/**
 * Quick check that GDELT returns articles for EU migration-style queries (no API keys).
 * Usage: node scripts/smoke-news-gdelt.cjs
 */
'use strict';

const q = new URLSearchParams({
  // Avoid 2-letter tokens (GDELT rejects "EU" alone); mirror app-style query.
  query: 'asylum migration European Parliament',
  mode: 'ArtList',
  maxrecords: '5',
  format: 'json',
  sourcelang: 'english',
  timespan: '6MONTH',
  sort: 'DateDesc',
});

fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${q}`)
  .then(r => r.text())
  .then(text => {
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      console.error('GDELT non-JSON:', text.slice(0, 200));
      process.exit(1);
      return;
    }
    const n = (d.articles ?? []).length;
    console.log(n ? `OK: ${n} articles` : 'WARN: 0 articles');
    if (n) console.log(' sample:', d.articles[0]?.title?.slice(0, 80));
    process.exit(n ? 0 : 1);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
