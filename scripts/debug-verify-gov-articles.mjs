const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148971010';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
console.log('status:', res.status);
const html = await res.text();
const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
console.log('page <title>:', titleMatch ? titleMatch[1].trim() : '(not found)');
const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
if (m) {
  const text = m[1].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/\n{2,}/g, '\n').trim();
  console.log('LENGTH:', text.length);
  console.log(text);
} else {
  console.log('article_body not found');
}
