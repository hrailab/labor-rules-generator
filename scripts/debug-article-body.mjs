const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972427';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('status:', res.status, 'length:', html.length);

const patterns = [
  /<div class="article_cont"[^>]*>([\s\S]*?)<\/div>\s*<div/,
  /<div class="view_con"[^>]*>([\s\S]*?)<\/div>/,
  /<article[^>]*>([\s\S]*?)<\/article>/,
  /<div class="cont_body"[^>]*>([\s\S]*?)<\/div>/,
  /id="article_content"[^>]*>([\s\S]{0,3000})/,
];
for (const p of patterns) {
  const m = html.match(p);
  console.log('\npattern', p.source.slice(0, 40), '->', m ? 'FOUND (' + m[1].length + ' chars)' : 'not found');
  if (m) console.log(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500));
}
