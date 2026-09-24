const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

const url = 'https://www.korea.kr/news/policyNewsList.do';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('status:', res.status, 'length:', html.length);

const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
let m, count = 0;
while ((m = ITEM_RE.exec(html)) !== null && count < 8) {
  const inner = m[2];
  const titleMatch = inner.match(/<strong>([\s\S]*?)<\/strong>/);
  console.log('---');
  console.log('href:', m[1]);
  console.log('title:', titleMatch ? stripTags(titleMatch[1]) : 'N/A');
  const deptMatches = [...inner.matchAll(/class="[^"]*(?:dept|source|category|tag)[^"]*"[^>]*>([\s\S]{1,40}?)</gi)];
  deptMatches.forEach(dm => console.log('  dept-candidate:', stripTags(dm[1])));
  count++;
}
