// TEMP diagnostic script — parse srchWord-filtered policyNewsList.do results.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

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

const queries = [
  '창업중심대학', '대학혁신지원사업', '글로컬대학', '경력창업지원사업',
  '채용형 인턴제', '수의과대학 실습기자재', '대학 시설 안전관리', '대학 위탁 직업훈련'
];

for (const q of queries) {
  const url = `https://www.korea.kr/news/policyNewsList.do?srchWord=${encodeURIComponent(q)}`;
  console.log(`\n### query: ${q}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const items = parseListing(html);
    console.log(`  ${items.length} items parsed`);
    items.slice(0, 8).forEach(it => console.log(`  [${it.date}] ${it.title} (newsId=${it.newsId})`));
  } catch (e) {
    console.log(`  fetch failed: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
console.log('\nDone.');
