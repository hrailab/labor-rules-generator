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

const codes = ['A00001','A00003','A00004','A00005','A00006','A00007','A00009','A00010','A00011','A00013','A00014','A00015','A00016','A00017','A00018'];
for (const c of codes) {
  await sample(c);
  await new Promise(r => setTimeout(r, 250));
}
