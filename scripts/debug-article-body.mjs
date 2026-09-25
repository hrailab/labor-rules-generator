const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972427';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();

const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
if (m) {
  const text = m[1].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();
  console.log('LENGTH:', text.length);
  console.log(text.slice(0, 2000));
} else {
  console.log('article_body block not matched, dumping raw around it');
  const idx = html.indexOf('article_body');
  console.log(html.slice(idx, idx + 3000));
}
