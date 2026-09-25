// TEMP diagnostic script — verifies real article listings for MOCK_TRENDS URL matching.
// Deleted after use; not part of the permanent codebase.
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const DEPTS = [
  { name: '기획예산처', repCode: 'A00040' },
  { name: '교육부', repCode: 'A00002' },
  { name: '과기정통부', repCode: 'A00033' },
  { name: '중기부', repCode: 'A00032' },
  { name: '농식품부', repCode: 'A00008' },
];

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseListing(html) {
  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const inner = m[2];
    const titleMatch = inner.match(/<strong>([\s\S]*?)<\/strong>/);
    const leadMatch = inner.match(/<span class="lead">([\s\S]*?)<\/span>/);
    const dateMatch = inner.match(/<span class="source">\s*<span>(\d{4}-\d{2}-\d{2})<\/span>/);
    if (!titleMatch || !dateMatch) continue;
    const newsIdMatch = href.match(/newsId=(\d+)/);
    items.push({
      newsId: newsIdMatch ? newsIdMatch[1] : null,
      title: stripTags(titleMatch[1]),
      lead: leadMatch ? stripTags(leadMatch[1]) : '',
      date: dateMatch[1],
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
    });
  }
  return items;
}

async function fetchListing(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const html = await res.text();
  return { items: parseListing(html) };
}

const results = {};

for (const dept of DEPTS) {
  console.log(`=== ${dept.name} (${dept.repCode}) ===`);
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${dept.repCode}&pWiseMinistry=ministryNews`;
  try {
    const r = await fetchListing(url);
    if (r.error) { console.log(`  ${r.error}`); }
    else {
      console.log(`  ${r.items.length} items`);
      results[dept.name] = r.items;
      r.items.forEach(it => console.log(`  [${it.date}] ${it.title} (newsId=${it.newsId})`));
    }
  } catch (e) {
    console.log(`  fetch failed - ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}

console.log('\n=== 기타부처 (통합피드) ===');
try {
  const r = await fetchListing('https://www.korea.kr/news/policyNewsList.do');
  if (r.error) console.log(`  ${r.error}`);
  else {
    console.log(`  ${r.items.length} items`);
    r.items.forEach(it => console.log(`  [${it.date}] ${it.title} (newsId=${it.newsId})`));
    results['기타부처'] = r.items;
  }
} catch (e) {
  console.log(`  fetch failed - ${e.message}`);
}

await writeFile('/tmp/diag-listings.json', JSON.stringify(results, null, 2));
console.log('\nDone. Wrote /tmp/diag-listings.json');
