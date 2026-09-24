const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function tryFetch(label, url) {
  console.log(`\n===== ${label}: ${url} =====`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' }, redirect: 'follow' });
    const text = await res.text();
    console.log('status', res.status, 'length', text.length);
    return text;
  } catch (e) { console.log('ERROR', e.message); return ''; }
}

function dumpAround(html, marker, before, after, label) {
  const idx = html.indexOf(marker);
  console.log(`--- ${label}: around "${marker}" (idx=${idx}) ---`);
  if (idx >= 0) console.log(html.slice(Math.max(0, idx - before), idx + after).replace(/\s+/g, ' '));
  else console.log('  not found');
}

// 동국대: 실제 항목 주변 마크업
const dg = await tryFetch('Dongguk SCHOOLNEWS', 'https://www.dongguk.edu/article/SCHOOLNEWS/list');
if (dg) dumpAround(dg, '/article/SCHOOLNEWS/26766331', 500, 1200, 'Dongguk item markup');

// 경희대: articleNo 패턴 전체 검색
const khu = await tryFetch('KHU notice', 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316');
if (khu) {
  const m = [...khu.matchAll(/articleNo=\d+/g)];
  console.log('KHU articleNo matches:', m.length, JSON.stringify(m.slice(0,5).map(x=>x[0])));
  if (m.length) dumpAround(khu, m[0][0], 600, 800, 'KHU first articleNo item');
  else {
    for (const cls of ['tbl_list','bbs_list','board_list','list_wrap','artclTable','artclList']) {
      const i = khu.indexOf(cls);
      if (i >= 0) { console.log(`KHU has class "${cls}" at ${i}`); dumpAround(khu, cls, 100, 1500, 'KHU '+cls); break; }
    }
  }
}

// 한양뉴스포털: 실제 목록 항목 마크업
const hy = await tryFetch('newshyu', 'https://www.newshyu.com/');
if (hy) dumpAround(hy, 'articleView.html?idxno=1026403', 400, 900, 'newshyu item markup');
