const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const LIST_URL = 'https://www.korea.kr/news/ministryNewsList.do?repCode=A00002&pWiseMinistry=ministryNews';
const res = await fetch(LIST_URL, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('STATUS/LENGTH', res.status, html.length);

console.log('---goDetailView( occurrences with context---');
const gdv = [...html.matchAll(/goDetailView\(([^)]*)\)/g)].slice(0, 10);
console.log('count(sample 10):', gdv.length);
gdv.forEach(m => console.log(m[0]));

console.log('---raw snippet around "list_type type2"---');
const idx1 = html.indexOf('list_type type2');
console.log(html.slice(Math.max(0, idx1 - 100), idx1 + 3000));

console.log('---raw snippet around "article_wrap"---');
const idx2 = html.indexOf('article_wrap');
console.log(html.slice(Math.max(0, idx2 - 100), idx2 + 2000));
