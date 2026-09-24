const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function sample(code) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${code}&pWiseMinistry=ministryNews`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
    const m = ITEM_RE.exec(html);
    if (!m) { console.log(code, ': NO ITEMS'); return; }
    const titleMatch = m[2].match(/<strong>([\s\S]*?)<\/strong>/);
    console.log(code, ':', titleMatch ? stripTags(titleMatch[1]) : 'NO TITLE MATCH');
  } catch (e) {
    console.log(code, ': ERROR', e.message);
  }
}

const codes = ['A00019','A00020','A00021','A00022','A00023','A00024','A00025','A00026','A00027','A00028','A00029','A00030','A00031','A00034','A00035','A00036','A00037','A00038','A00039'];
for (const c of codes) {
  await sample(c);
  await new Promise(r => setTimeout(r, 200));
}
