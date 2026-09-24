const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function tryFetch(label, url, opts={}) {
  console.log(`\n----- ${label}: ${url} -----`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9', ...(opts.headers||{}) }, redirect: 'follow' });
    console.log('status', res.status, 'finalUrl', res.url);
    const html = await res.text();
    console.log('length', html.length);
    return html;
  } catch (e) {
    console.log('ERROR', e.message);
    return '';
  }
}

// 1) 성균관대: 대체 경로 시도
await tryFetch('SKKU root (no www)', 'https://skku.edu');
await tryFetch('SKKU /skku/index.do', 'https://www.skku.edu/skku/index.do');
await tryFetch('SKKU search', 'https://www.skku.edu/skku/campus/skk_comm/notice01.do');

// 2) 이화여대: 한국어 경로
const ewhaHtml = await tryFetch('Ewha /ewha/index.do', 'https://www.ewha.ac.kr/ewha/index.do');
if (ewhaHtml) {
  const links = [...ewhaHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]{0,60}?)<\/a>/gi)];
  const kws = ['공지','보도','뉴스','소식','산학협력','국제교류','국제처','대외협력','글로벌','홍보'];
  let n=0;
  for (const m of links) {
    const href=m[1], text=m[2].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    if (kws.some(k=>href.includes(k)||text.includes(k))) { console.log(' ', JSON.stringify(href),'|',text.slice(0,50)); if(++n>=15) break; }
  }
}

// 3) 경희대: 홈페이지 전체에서 "공지" 관련 더 넓게 검색 + 산학협력단 후보 URL 시도
const khuHtml = await tryFetch('KHU home (recheck)', 'https://www.khu.ac.kr/kor/user/main/view.do');
if (khuHtml) {
  const idx = khuHtml.search(/공지/);
  console.log('first "공지" occurrence context:', khuHtml.slice(Math.max(0,idx-300), idx+300).replace(/\s+/g,' '));
}
await tryFetch('KHU 산학협력단 guess', 'https://iacf.khu.ac.kr');

// 4) 한양대 공지 목록 페이지 실제 구조
const hyHtml = await tryFetch('Hanyang /notice_all', 'https://www.hanyang.ac.kr/notice_all');
if (hyHtml) {
  const idx = hyHtml.search(/NoticeBoardPortlet/);
  console.log('snippet around board:', hyHtml.slice(Math.max(0,idx-200), idx+2000).replace(/\t/g,''));
}

// 5) 동국대 학내뉴스 목록 실제 구조
const dgHtml = await tryFetch('Dongguk /article/SCHOOLNEWS/list', 'https://www.dongguk.edu/article/SCHOOLNEWS/list');
if (dgHtml) {
  const idx = dgHtml.search(/class="[^"]*board[^"]*"|class="[^"]*list[^"]*"/i);
  console.log('snippet around list:', dgHtml.slice(Math.max(0,idx-100), idx+2500).replace(/\t/g,''));
}

// 6) 중앙대 국제처 공지 실제 구조
const cauHtml = await tryFetch('CAU oia notice', 'https://oia.cau.ac.kr/cauoia/index.do');
if (cauHtml) {
  const idx = cauHtml.search(/공지/);
  console.log('snippet:', cauHtml.slice(Math.max(0,idx-200), idx+1500).replace(/\t/g,''));
}
