const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const url = 'https://www.korea.kr/news/ministryNewsList.do?repCode=A00032&pWiseMinistry=ministryNews';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
let m, count = 0;
while ((m = ITEM_RE.exec(html)) !== null && count < 5) {
  console.log('HREF:', m[1]);
  count++;
}
if (count === 0) {
  console.log('No matches with the known regex. Dumping first 3000 chars of HTML for inspection:');
  console.log(html.slice(0, 3000));
}
