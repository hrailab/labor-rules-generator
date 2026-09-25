// scripts/fetch-competitor-trends.mjs의 성균관대/한양대/중앙대 파서 로직을 그대로 재사용해
// 실제로 존재하는(카테고리 필터를 통과한) 최신 항목 목록을 그대로 출력한다.
// 목적: MOCK_COMPETITORS의 제목이 실제 링크된 게시글 내용과 일치하지 않는 문제를 검증하기 위해,
// 진짜로 일치하는 (title, category, url, date) 조합 후보를 확보한다.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const CATEGORY_RULES = [
  { name: '재정지원', keywords: ['재정지원', '지원사업'] },
  { name: '산학협력', keywords: ['산학협력', '산학연', '기술이전', '창업', '창업보육'] },
  { name: '국제', keywords: ['국제', '글로벌', '해외', '유학생', '외국인', '교환학생', '협정대학', 'MOU', '자매결연', '교류'] },
  { name: '대외협력', keywords: ['대외협력', '발전기금', '동문', '기부', '협약'] },
];
function categorize(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => title.includes(k))) return rule.name;
  }
  return null;
}
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function normDate(s) {
  return s.replace(/\./g, '-');
}
async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function parseSKKU() {
  const url = 'https://www.skku.edu/skku/campus/skk_comm/notice01.do';
  const html = await fetchHtml(url);
  const blockRe = /<dl class="board-list-content-wrap[^"]*">([\s\S]*?)<\/dl>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[1];
    const m = block.match(/<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const dateM = block.match(/<li>(\d{4}-\d{2}-\d{2})<\/li>/);
    if (!m || !dateM) continue;
    const title = stripTags(m[3]);
    const category = categorize(title);
    items.push({
      school: '성균관대', title, category,
      url: `https://www.skku.edu/skku/campus/skk_comm/notice01.do${m[1].replace(/&amp;/g, '&')}`,
      date: dateM[1],
    });
  }
  return items;
}

async function parseCAU() {
  const url = 'https://oias.cau.ac.kr/cauoie/under/notice.do';
  const html = await fetchHtml(url);
  const blockRe = /<tr class="[^"]*">([\s\S]*?)<\/tr>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[1];
    const noM = block.match(/articleNo=(\d+)/);
    const titleM = block.match(/<span class="b-title">\s*([\s\S]*?)\s*<\/span>/);
    const dateM = block.match(/<p class="b-date"><span>([\d.]+)<\/span><\/p>/);
    if (!noM || !titleM || !dateM) continue;
    const title = stripTags(titleM[1]);
    items.push({
      school: '중앙대', title, category: categorize(title) || '국제',
      url: `https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=${noM[1]}`,
      date: normDate(dateM[1]),
    });
  }
  return items;
}

async function parseHanyang() {
  const url = 'https://www.newshyu.com/';
  const html = await fetchHtml(url);
  const blockRe = /<a href="(\/news\/articleView\.html\?idxno=(\d+))"[^>]*>([\s\S]*?)<\/a>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[3];
    const titleM = block.match(/<strong class="auto-titles[^"]*">\s*([\s\S]*?)\s*<\/strong>/);
    if (!titleM) continue;
    const title = stripTags(titleM[1]);
    const category = categorize(title);
    items.push({
      school: '한양대', title, category,
      url: `https://www.newshyu.com${b[1]}`,
      date: null,
    });
  }
  return items;
}

const all = [
  ...(await parseSKKU().catch(e => { console.error('SKKU error', e.message); return []; })),
  ...(await parseHanyang().catch(e => { console.error('Hanyang error', e.message); return []; })),
  ...(await parseCAU().catch(e => { console.error('CAU error', e.message); return []; })),
];

console.log(`\nTotal raw items fetched: ${all.length}\n`);
for (const it of all) {
  console.log(`[${it.school}] cat=${it.category ?? '(none)'} date=${it.date ?? '?'}`);
  console.log(`  title: ${it.title}`);
  console.log(`  url: ${it.url}`);
}
