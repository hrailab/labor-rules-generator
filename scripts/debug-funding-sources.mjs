const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/ministryNewsList.do?pWiseMinistry=ministryNews';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('status:', res.status, 'length:', html.length);

const OPT_RE = /repCode=(A\d{5})[^"'>]*["'][^>]*>\s*([\s\S]{1,20}?)\s*<\/(?:option|a)>/g;
let m;
const found = new Set();
while ((m = OPT_RE.exec(html)) !== null) {
  const key = m[1] + ' :: ' + m[2].replace(/<[^>]+>/g,'').trim();
  if (!found.has(key)) { found.add(key); console.log(key); }
}
console.log('\ntotal matches:', found.size);

if (found.size === 0) {
  const ALT_RE = /data-repcode=["'](A\d{5})["'][^>]*>\s*([\s\S]{1,20}?)\s*</g;
  while ((m = ALT_RE.exec(html)) !== null) {
    console.log(m[1], '::', m[2].replace(/<[^>]+>/g,'').trim());
  }
}
