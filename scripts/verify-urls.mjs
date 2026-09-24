const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

const DEPTS = [
  { name: '기획예산처', repCode: 'A00040' },
  { name: '교육부', repCode: 'A00002' },
  { name: '과기정통부', repCode: 'A00033' },
  { name: '중기부', repCode: 'A00032' },
  { name: '농식품부', repCode: 'A00008' },
];

async function fetchMinistryItems(dept) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${dept.repCode}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const titleMatch = m[2].match(/<strong>([\s\S]*?)<\/strong>/);
    const newsIdMatch = href.match(/newsId=(\d+)/);
    if (!titleMatch || !newsIdMatch) continue;
    items.push({ id: newsIdMatch[1], title: stripTags(titleMatch[1]), url: href.startsWith('http') ? href : `https://www.korea.kr${href}` });
  }
  return items;
}

for (const dept of DEPTS) {
  const items = await fetchMinistryItems(dept);
  console.log(`\n### ${dept.name} (${items.length}건)`);
  items.slice(0, 6).forEach(it => console.log(`  ${it.id} | ${it.title} | ${it.url}`));
  await new Promise(r => setTimeout(r, 300));
}

{
  const res = await fetch('https://www.korea.kr/news/policyNewsList.do', { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const titleMatch = m[2].match(/<strong>([\s\S]*?)<\/strong>/);
    const newsIdMatch = href.match(/newsId=(\d+)/);
    if (!titleMatch || !newsIdMatch) continue;
    items.push({ id: newsIdMatch[1], title: stripTags(titleMatch[1]), url: href.startsWith('http') ? href : `https://www.korea.kr${href}` });
  }
  console.log(`\n### 기타부처 통합피드 (${items.length}건)`);
  items.slice(0, 6).forEach(it => console.log(`  ${it.id} | ${it.title} | ${it.url}`));
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  return res.text();
}

async function parseSKKU() {
  const html = await fetchHtml('https://www.skku.edu/skku/campus/skk_comm/notice01.do');
  const blockRe = /<dl class="board-list-content-wrap[^"]*">([\s\S]*?)<\/dl>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const m = b[1].match(/<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    if (!m) continue;
    items.push({ id: m[2], title: stripTags(m[3]), url: `https://www.skku.edu/skku/campus/skk_comm/notice01.do${m[1].replace(/&amp;/g, '&')}` });
  }
  return items;
}
async function parseCAU() {
  const html = await fetchHtml('https://oias.cau.ac.kr/cauoie/under/notice.do');
  const blockRe = /<tr class="[^"]*">([\s\S]*?)<\/tr>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const noM = b[1].match(/articleNo=(\d+)/);
    const titleM = b[1].match(/<span class="b-title">\s*([\s\S]*?)\s*<\/span>/);
    if (!noM || !titleM) continue;
    items.push({ id: noM[1], title: stripTags(titleM[1]), url: `https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=${noM[1]}` });
  }
  return items;
}
async function parseDongguk() {
  const html = await fetchHtml('https://www.dongguk.edu/article/INTEXNOTICE/list');
  const blockRe = /<li>\s*<a href="#none" onclick="javascript:location\.href='([^']+)'">([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const idM = b[1].match(/\/(\d+)$/);
    const titleM = b[2].match(/<p class="tit">\s*([\s\S]*?)\s*<\/p>/);
    if (!idM || !titleM) continue;
    items.push({ id: idM[1], title: stripTags(titleM[1]), url: `https://www.dongguk.edu${b[1]}` });
  }
  return items;
}
async function parseHanyang() {
  const html = await fetchHtml('https://www.newshyu.com/');
  const blockRe = /<a href="(\/news\/articleView\.html\?idxno=(\d+))"[^>]*>([\s\S]*?)<\/a>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const titleM = b[3].match(/<strong class="auto-titles[^"]*">\s*([\s\S]*?)\s*<\/strong>/);
    if (!titleM) continue;
    items.push({ id: b[2], title: stripTags(titleM[1]), url: `https://www.newshyu.com${b[1]}` });
  }
  return items;
}
async function parseKHU() {
  const html = await fetchHtml('https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316');
  const re = /<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]{2,150}?)\s*<\/a>/g;
  const items = [];
  for (const m of html.matchAll(re)) {
    items.push({ id: m[2], title: stripTags(m[3]), url: `https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do${m[1].replace(/&amp;/g, '&')}` });
  }
  return items;
}
async function parseEwha() {
  const html = await fetchHtml('https://www.ewha.ac.kr/ewha/news/ewha-news.do');
  const re = /<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]{2,150}?)\s*<\/a>/g;
  const items = [];
  const seen = new Set();
  for (const m of html.matchAll(re)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    const title = stripTags(m[3]);
    if (!title) continue;
    items.push({ id: m[2], title, url: `https://www.ewha.ac.kr/ewha/news/ewha-news.do${m[1].replace(/&amp;/g, '&')}` });
  }
  return items;
}

const SCHOOLS = [
  { name: '성균관대', fn: parseSKKU },
  { name: '한양대', fn: parseHanyang },
  { name: '경희대', fn: parseKHU },
  { name: '동국대', fn: parseDongguk },
  { name: '중앙대', fn: parseCAU },
  { name: '이화여대', fn: parseEwha },
];

for (const school of SCHOOLS) {
  try {
    const items = await school.fn();
    console.log(`\n### ${school.name} (${items.length}건)`);
    items.slice(0, 6).forEach(it => console.log(`  ${it.id} | ${it.title} | ${it.url}`));
  } catch (e) {
    console.log(`\n### ${school.name}: ERROR ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
