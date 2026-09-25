const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972427';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('length:', html.length);

const titleIdx = html.indexOf('유아 입학');
console.log('title found at:', titleIdx);
if (titleIdx !== -1) {
  console.log(html.slice(Math.max(0, titleIdx - 500), titleIdx + 3000));
}
