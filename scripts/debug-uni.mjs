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

function findFirstAnchorBlock(html, hrefPattern, label) {
  const re = new RegExp('<a[^>]+href="([^"]*' + hrefPattern + '[^"]*)"[^>]*>([\\s\\S]{0,300}?)<\\/a>', 'i');
  const m = html.match(re);
  console.log(`--- ${label} first matching <a> ---`);
  if (m) {
    console.log('href:', m[1]);
    console.log('inner:', m[2].replace(/\s+/g,' ').trim().slice(0,250));
    const idx = html.indexOf(m[0]);
    console.log('context before (300 chars):', html.slice(Math.max(0,idx-300), idx).replace(/\s+/g,' '));
  } else {
    console.log('  no match for pattern', hrefPattern);
  }
}

// 성균관대 공지
const skku = await tryFetch('SKKU notice01', 'https://www.skku.edu/skku/campus/skk_comm/notice01.do');
if (skku) findFirstAnchorBlock(skku, 'notice01', 'SKKU');
if (skku) { const i = skku.search(/class="[a-zA-Z_-]*board[a-zA-Z_-]*"/i); console.log('SKKU board-class ctx:', skku.slice(Math.max(0,i-50), i+800).replace(/\s+/g,' ')); }

// 이화여대 뉴스
const ewha = await tryFetch('Ewha news', 'https://www.ewha.ac.kr/ewha/news/ewha-news.do');
if (ewha) findFirstAnchorBlock(ewha, 'ewha-news|view', 'Ewha');
if (ewha) { const i = ewha.search(/class="[a-zA-Z_-]*board[a-zA-Z_-]*"|class="[a-zA-Z_-]*list[a-zA-Z_-]*"/i); console.log('Ewha board-class ctx:', ewha.slice(Math.max(0,i-50), i+1200).replace(/\s+/g,' ')); }

// 경희대 공지
const khu = await tryFetch('KHU notice', 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316');
if (khu) findFirstAnchorBlock(khu, 'BMSR00040', 'KHU');
if (khu) { const i = khu.search(/class="[a-zA-Z_-]*board[a-zA-Z_-]*"|class="[a-zA-Z_-]*list[a-zA-Z_-]*"/i); console.log('KHU board-class ctx:', khu.slice(Math.max(0,i-50), i+1500).replace(/\s+/g,' ')); }

// 동국대 학내뉴스 - 실제 항목 링크 패턴 탐색
const dgSchool = await tryFetch('Dongguk SCHOOLNEWS (retry)', 'https://www.dongguk.edu/article/SCHOOLNEWS/list');
if (dgSchool) findFirstAnchorBlock(dgSchool, 'SCHOOLNEWS/view|SCHOOLNEWS/detail', 'Dongguk SCHOOLNEWS');
if (dgSchool) {
  const matches = [...dgSchool.matchAll(/href="([^"]*article[^"]*)"/gi)].slice(0,10).map(m=>m[1]);
  console.log('Dongguk sample article-ish hrefs:', JSON.stringify([...new Set(matches)]));
}

// 중앙대 국제교류팀 실제 공지 게시판
const cauNotice = await tryFetch('CAU oias notice', 'https://oias.cau.ac.kr/cauoie/under/notice.do');
if (cauNotice) findFirstAnchorBlock(cauNotice, 'notice.do', 'CAU oias');
if (cauNotice) { const i = cauNotice.search(/class="[a-zA-Z_-]*board[a-zA-Z_-]*"|class="[a-zA-Z_-]*list[a-zA-Z_-]*"/i); console.log('CAU board-class ctx:', cauNotice.slice(Math.max(0,i-50), i+1500).replace(/\s+/g,' ')); }

// 한양대 대안: 산학협력단 정적 페이지 확인
await tryFetch('Hanyang university-industry-cooperation', 'https://www.hanyang.ac.kr/university-industry-cooperation');
