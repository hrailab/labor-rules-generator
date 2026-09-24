const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function tryFetch(label, url) {
  console.log(`\n===== ${label}: ${url} =====`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' }, redirect: 'follow' });
    const text = await res.text();
    console.log('status', res.status, 'finalUrl', res.url, 'length', text.length);
    return text;
  } catch (e) {
    console.log('ERROR', e.message);
    return '';
  }
}

function scanPatterns(html, label, patterns) {
  console.log(`--- ${label}: pattern scan ---`);
  for (const p of patterns) {
    const re = new RegExp(p, 'gi');
    const matches = [...html.matchAll(re)].slice(0, 5).map(m => m[0]);
    console.log(`  /${p}/ -> ${matches.length} sample:`, JSON.stringify(matches));
  }
}

function dumpAround(html, marker, before, after, label) {
  const idx = html.indexOf(marker);
  console.log(`--- ${label}: around "${marker}" (idx=${idx}) ---`);
  if (idx >= 0) console.log(html.slice(Math.max(0, idx - before), idx + after).replace(/\s+/g, ' '));
}

// SKKU: 검색폼 이후 실제 목록 행 찾기
const skku = await tryFetch('SKKU notice01', 'https://www.skku.edu/skku/campus/skk_comm/notice01.do');
if (skku) {
  scanPatterns(skku, 'SKKU', ['view\\.do\\?[^"\']*', 'articleNo=\\d+', 'nttId=\\d+', 'seq=\\d+']);
  dumpAround(skku, 'board_seaInputList', 2000, 3000, 'SKKU after search form');
}

// Ewha: 실제 목록 아이템 링크 패턴
const ewha = await tryFetch('Ewha news', 'https://www.ewha.ac.kr/ewha/news/ewha-news.do');
if (ewha) {
  scanPatterns(ewha, 'Ewha', ['view\\.do\\?[^"\']*', 'articleNo=\\d+', 'nttId=\\d+', 'amSeq=\\d+']);
  const idx = ewha.indexOf('id="container"');
  dumpAround(ewha, 'id="container"', 100, 3000, 'Ewha container area');
}

// KHU: 실제 게시글 행
const khu = await tryFetch('KHU notice', 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316');
if (khu) {
  scanPatterns(khu, 'KHU', ['view\\.do\\?[^"\']*', 'bbsSeq=\\d+', 'nttId=\\d+']);
  dumpAround(khu, 'utility_list', 0, 6000, 'KHU after utility_list (look further for table rows)');
}

// Dongguk: 숫자 경로 세그먼트 확인
const dg = await tryFetch('Dongguk SCHOOLNEWS', 'https://www.dongguk.edu/article/SCHOOLNEWS/list');
if (dg) {
  scanPatterns(dg, 'Dongguk', ['/article/SCHOOLNEWS/\\d+', 'articleNo=\\d+', 'idx=\\d+']);
  const idx = dg.indexOf('id="content"');
  dumpAround(dg, 'id="content"', 100, 3000, 'Dongguk content area');
}

// CAU: co-board 이후 실제 목록
const cau = await tryFetch('CAU oias notice', 'https://oias.cau.ac.kr/cauoie/under/notice.do');
if (cau) {
  scanPatterns(cau, 'CAU', ['view\\.do\\?[^"\']*', 'articleNo=\\d+', 'nttId=\\d+']);
  dumpAround(cau, 'b-search-box', 0, 4000, 'CAU after search box (look for list rows)');
}

// Hanyang 대안: 한양뉴스포털
const hyNews = await tryFetch('Hanyang newshyu portal', 'https://www.newshyu.com/');
if (hyNews) {
  scanPatterns(hyNews, 'newshyu', ['articleView\\.html\\?[^"\']*', 'idxno=\\d+']);
}
