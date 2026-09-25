const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972427';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('length:', html.length);

const classRe = /class="([^"]*(?:view|cont|text|article|txt|body|news)[^"]*)"/gi;
const seen = new Set();
let m;
while ((m = classRe.exec(html)) !== null) {
  const cls = m[1];
  if (!seen.has(cls)) { seen.add(cls); }
}
console.log('candidate classes:', [...seen].join(' | '));
