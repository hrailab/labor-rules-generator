// '대학 ICT 연구인프라 고도화 사업'과 실제로 매칭되는(또는 근접한) 과기정통부 기사를 찾기 위한
// 진단 스크립트. 과기정통부 목록 페이지를 재조회하고, ICT·연구인프라·공동활용·연구장비 관련
// 키워드가 제목/리드에 있는 항목을 모두 출력한다.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchMinistryItems(repCode) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${repCode}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error(`fetch failed: HTTP ${res.status}`); return []; }
  const html = await res.text();
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
    const title = stripTags(titleMatch[1]);
    const lead = leadMatch ? stripTags(leadMatch[1]) : '';
    const newsIdMatch = href.match(/newsId=(\d+)/);
    items.push({
      title, desc: (lead && lead !== title) ? lead : '',
      date: dateMatch[1], newsId: newsIdMatch ? newsIdMatch[1] : href,
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
    });
  }
  return items;
}

const KEYWORDS = ['ICT', '연구인프라', '연구장비', '공동활용', '인프라', '반도체', '컨소시엄', 'AI'];

console.log('===== 과기정통부(A00033) 전체 목록 =====');
const items = await fetchMinistryItems('A00033');
items.forEach(it => {
  const hit = KEYWORDS.some(k => (it.title + ' ' + it.desc).includes(k));
  console.log(`${hit ? '[MATCH] ' : '        '}[${it.date}] (newsId=${it.newsId}) ${it.title}`);
  if (it.desc) console.log(`           lead: ${it.desc}`);
});
