const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const homeRes = await fetch('https://www.korea.kr/news/ministryNewsHome.do', { headers: { 'User-Agent': UA } });
const homeHtml = await homeRes.text();

console.log('---ALL srchMain(CODE, NAME) MAPPINGS---');
const all = [...homeHtml.matchAll(/srchMain\('([A-Z0-9]+)',\s*'([^']+)'\)/g)];
const seen = new Set();
all.forEach(m => {
  const key = m[1] + m[2];
  if (!seen.has(key)) { seen.add(key); console.log(m[1], '=>', m[2]); }
});
console.log('total unique:', seen.size);

// Now fetch the actual list page for 교육부 (A00002) to see article markup
const LIST_URL = 'https://www.korea.kr/news/ministryNewsList.do?repCode=A00002&pWiseMinistry=ministryNews';
const listRes = await fetch(LIST_URL, { headers: { 'User-Agent': UA } });
const listHtml = await listRes.text();
console.log('---LIST PAGE STATUS/LENGTH---', listRes.status, listHtml.length);

console.log('---LIST PAGE: candidate item containers (class names with list/item/article/board)---');
const classMatches = [...listHtml.matchAll(/class="([^"]*(?:list|item|article|board|txt|tit)[^"]*)"/gi)].map(m=>m[1]);
console.log(JSON.stringify([...new Set(classMatches)].slice(0,40)));

console.log('---LIST PAGE: <a> tags linking to detail views (newsView/View.do etc) ---');
const detailLinks = [...listHtml.matchAll(/<a[^>]+href="([^"]*(?:View|view|newsId)[^"]*)"[^>]*>([\s\S]{0,150}?)<\/a>/gi)].slice(0,15);
detailLinks.forEach(m => console.log(JSON.stringify(m[1]), '|', m[2].replace(/\s+/g,' ').trim().slice(0,100)));

console.log('---LIST PAGE: raw snippet around first detail link---');
const firstIdx = listHtml.search(/(View|newsId)/i);
console.log(listHtml.slice(Math.max(0, firstIdx - 800), firstIdx + 2500));
