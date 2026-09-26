// TEMP diagnostic script — fetch article bodies for candidate real articles to replace fabricated MOCK_TRENDS items.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const REP_CODE = { '기획예산처':'A00040', '교육부':'A00002', '과기정통부':'A00033', '중기부':'A00032', '농식품부':'A00008' };

function url(dept, newsId) {
  return `https://www.korea.kr/news/policyNewsView.do?newsId=${newsId}&repCode=${REP_CODE[dept]}&repCodeType=정부부처&pWiseMinistry=ministryNews`;
}

const candidates = [
  { dept: '과기정통부', newsId: '148971156', label: "이공계 연구생활장려금 대학 5곳 추가" },
  { dept: '중기부', newsId: '148970979', label: "내년 '모두의 창업' 2만 명" },
  { dept: '중기부', newsId: '148971274', label: "중소기업 AI 실무인력 1600명 양성" },
  { dept: '기획예산처', newsId: '148970426', label: "미래대응기금 신설" },
  { dept: '교육부', newsId: '148971440', label: "지방 사립대 신입생 국가장학금" },
  { dept: '과기정통부', newsId: '148971676', label: "지역 주도 자율 R&D" },
];

async function fetchBody(u) {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const html = await res.text();
  const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
  if (!m) return { error: 'no article_body match', htmlLen: html.length };
  const text = m[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return { text };
}

for (const c of candidates) {
  const u = url(c.dept, c.newsId);
  console.log(`\n=== [${c.dept}] ${c.label} (newsId=${c.newsId}) ===`);
  console.log(`URL: ${u}`);
  try {
    const r = await fetchBody(u);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    else console.log(r.text.slice(0, 2500));
  } catch (e) {
    console.log(`  fetch failed: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
console.log('\nDone.');
