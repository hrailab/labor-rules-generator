const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972427';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('length:', html.length);

let idx = -1;
const positions = [];
while ((idx = html.indexOf('유아 입학', idx + 1)) !== -1) positions.push(idx);
console.log('occurrences at:', positions);

if (positions.length) {
  const last = positions[positions.length - 1];
  console.log('\n--- around LAST occurrence ---');
  console.log(html.slice(Math.max(0, last - 800), last + 3000));
}
