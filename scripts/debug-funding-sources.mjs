const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function checkRepCode(code) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${code}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  let m, count = 0;
  console.log(`repCode=${code}`);
  while ((m = ITEM_RE.exec(html)) !== null && count < 5) {
    const titleMatch = m[2].match(/<strong>([\s\S]*?)<\/strong>/);
    if (titleMatch) console.log('  -', stripTags(titleMatch[1]));
    count++;
  }
  console.log();
}

for (const code of ['A00012', 'A00002', 'A00040']) {
  await checkRepCode(code);
  await new Promise(r => setTimeout(r, 300));
}
