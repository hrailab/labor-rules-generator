const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const SITES = [
  { name: '성균관대', url: 'https://www.skku.edu' },
  { name: '한양대', url: 'https://www.hanyang.ac.kr' },
  { name: '경희대', url: 'https://www.khu.ac.kr' },
  { name: '동국대', url: 'https://www.dongguk.edu' },
  { name: '중앙대', url: 'https://www.cau.ac.kr' },
  { name: '이화여대', url: 'https://www.ewha.ac.kr' },
];
const KEYWORDS = ['공지','보도','뉴스','소식','산학협력','국제교류','국제처','국제화','대외협력','글로벌','홍보'];

for (const site of SITES) {
  console.log(`\n===== ${site.name} (${site.url}) =====`);
  try {
    const res = await fetch(site.url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    console.log('status', res.status, 'finalUrl', res.url);
    const html = await res.text();
    console.log('length', html.length);

    const links = [...html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]{0,60}?)<\/a>/gi)];
    const seen = new Set();
    let count = 0;
    for (const m of links) {
      const href = m[1];
      const text = m[2].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
      const hay = (href + ' ' + text).toLowerCase();
      if (KEYWORDS.some(k => hay.includes(k.toLowerCase()) || href.includes(k) || text.includes(k))) {
        const key = href;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(' ', JSON.stringify(href), '|', text.slice(0,50));
        count++;
        if (count >= 20) break;
      }
    }
    if (count === 0) console.log('  (no keyword matches found in <a> tags)');
  } catch (e) {
    console.log('ERROR', e.message);
  }
}
