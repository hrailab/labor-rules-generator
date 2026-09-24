// 경쟁대학 동향 자동 수집 스크립트
// 대상: 성균관대·한양대·경희대·동국대·중앙대·이화여대 6개교
// 실행: 매일 00:00 / 12:00 (KST) — .github/workflows/fetch-competitor-trends.yml
//
// 수집 범위: 재정지원사업, 산학협력, 국제, 대외협력 분야 관련 항목만.
// 국제처/국제교류 전용 게시판(중앙대·동국대)은 그 자체로 범위에 맞으므로 그대로 수집하고,
// 일반 공지·뉴스 게시판(성균관대·한양대·경희대·이화여대)은 COMPETITOR_KEYWORDS로 걸러낸다.
//
// 각 대학이 서로 다른 웹사이트 CMS를 쓰고 있어 학교별로 별도 파서가 필요하다.
// 이 세션은 egress 정책상 각 대학 사이트에 직접 접근할 수 없어, GitHub Actions 러너로
// 실제 HTML 구조를 확인한 뒤 아래 파서를 작성했다.
//
// [알려진 이슈] 경희대·동국대·이화여대 파서를 GitHub Actions 러너로 재검증한 결과 현재 0건을
// 반환한다(목록 페이지 구조가 변경되었거나, 최초 작성 시점 이후 사이트가 개편된 것으로 추정).
// 성균관대·한양대·중앙대는 정상 동작을 재확인했다. 0건이 계속되는 세 학교는 목록 페이지 구조를
// GitHub Actions 러너로 다시 확인해 파서를 갱신해야 한다.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const WINDOW_DAYS = 14;
const OUT_PATH = 'data/competitors.json';

// 분야 분류 — 순서대로 검사해 먼저 걸리는 분야로 태깅한다.
// 프런트엔드(index.html의 compCatClass)와 분야명 문자열이 정확히 일치해야 한다.
const CATEGORY_RULES = [
  { name: '재정지원', keywords: ['재정지원', '지원사업'] },
  { name: '산학협력', keywords: ['산학협력', '산학연', '기술이전', '창업', '창업보육'] },
  { name: '국제', keywords: ['국제', '글로벌', '해외', '유학생', '외국인', '교환학생', '협정대학', 'MOU', '자매결연', '교류'] },
  { name: '대외협력', keywords: ['대외협력', '발전기금', '동문', '기부', '협약'] },
];
function categorize(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => title.includes(k))) return rule.name;
  }
  return null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function normDate(s) {
  return s.replace(/\./g, '-');
}
function todayStr(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// 성균관대: 공지사항 (전체) — 학사/입학/취업/채용모집/장학/행사세미나/일반 카테고리 중
// 재정지원·산학협력·국제·대외협력 관련 키워드로 필터링
async function parseSKKU(fetchedAt) {
  const url = 'https://www.skku.edu/skku/campus/skk_comm/notice01.do';
  const html = await fetchHtml(url);
  const blockRe = /<dl class="board-list-content-wrap[^"]*">([\s\S]*?)<\/dl>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[1];
    const m = block.match(/<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
    const dateM = block.match(/<li>(\d{4}-\d{2}-\d{2})<\/li>/);
    if (!m || !dateM) continue;
    const title = stripTags(m[3]);
    const category = categorize(title);
    if (!category) continue;
    items.push({
      id: `skku-${m[2]}`, school: '성균관대', title, category,
      url: `https://www.skku.edu/skku/campus/skk_comm/notice01.do${m[1].replace(/&amp;/g, '&')}`,
      date: dateM[1],
    });
  }
  return items;
}

// 중앙대 국제처(국제교육지원팀) 공지 — 그 자체로 국제 카테고리 전용이라 키워드 필터 없이 전체 수집
async function parseCAU(fetchedAt) {
  const url = 'https://oias.cau.ac.kr/cauoie/under/notice.do';
  const html = await fetchHtml(url);
  const blockRe = /<tr class="[^"]*">([\s\S]*?)<\/tr>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[1];
    const noM = block.match(/articleNo=(\d+)/);
    const titleM = block.match(/<span class="b-title">\s*([\s\S]*?)\s*<\/span>/);
    const dateM = block.match(/<p class="b-date"><span>([\d.]+)<\/span><\/p>/);
    if (!noM || !titleM || !dateM) continue;
    const title = stripTags(titleM[1]);
    items.push({
      id: `cau-${noM[1]}`, school: '중앙대', title, category: categorize(title) || '국제',
      url: `https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=${noM[1]}`,
      date: normDate(dateM[1]),
    });
  }
  return items;
}

// 동국대 교류공지(INTEXNOTICE) — 국제교류 전용 게시판이라 키워드 필터 없이 전체 수집
// 목록 화면에 날짜가 노출되지 않아 수집 시각을 등록일로 사용한다(참고용, 근사치).
async function parseDongguk(fetchedAt) {
  const url = 'https://www.dongguk.edu/article/INTEXNOTICE/list';
  const html = await fetchHtml(url);
  const blockRe = /<li>\s*<a href="#none" onclick="javascript:location\.href='([^']+)'">([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const href = b[1];
    const block = b[2];
    const idM = href.match(/\/(\d+)$/);
    const titleM = block.match(/<p class="tit">\s*([\s\S]*?)\s*<\/p>/);
    if (!idM || !titleM) continue;
    const title = stripTags(titleM[1]);
    items.push({
      id: `dgu-${idM[1]}`, school: '동국대', title, category: categorize(title) || '국제',
      url: `https://www.dongguk.edu${href}`,
      date: todayStr(fetchedAt),
    });
  }
  return items;
}

// 한양대: 통합 공지 포털이 Liferay 기반 AJAX라 서버 렌더링 HTML만으로는 파싱이 안 되어,
// 대신 한양대 자체 언론사 포털(한양뉴스포털)의 최신기사 피드를 사용.
// 목록에 날짜가 없어 수집 시각을 등록일로 사용한다(참고용, 근사치).
async function parseHanyang(fetchedAt) {
  const url = 'https://www.newshyu.com/';
  const html = await fetchHtml(url);
  const blockRe = /<a href="(\/news\/articleView\.html\?idxno=(\d+))"[^>]*>([\s\S]*?)<\/a>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const block = b[3];
    const titleM = block.match(/<strong class="auto-titles[^"]*">\s*([\s\S]*?)\s*<\/strong>/);
    if (!titleM) continue;
    const title = stripTags(titleM[1]);
    const category = categorize(title);
    if (!category) continue;
    items.push({
      id: `hyu-${b[2]}`, school: '한양대', title, category,
      url: `https://www.newshyu.com${b[1]}`,
      date: todayStr(fetchedAt),
    });
  }
  return items;
}

// 경희대: 공지사항 게시판. 목록 페이지의 게시글 상세 링크 패턴을 아직 확인하지 못했다 —
// 우선 다른 학교와 동일한 'mode=view&articleNo=' 패턴으로 시도하고, 0건이면 구조 재확인 필요.
async function parseKHU(fetchedAt) {
  const url = 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316';
  const html = await fetchHtml(url);
  const re = /<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]{2,150}?)\s*<\/a>/g;
  const items = [];
  for (const m of html.matchAll(re)) {
    const title = stripTags(m[3]);
    const category = categorize(title);
    if (!category) continue;
    const tail = html.slice(m.index, m.index + 400);
    const dateM = tail.match(/(\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2})/);
    items.push({
      id: `khu-${m[2]}`, school: '경희대', title, category,
      url: `https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do${m[1].replace(/&amp;/g, '&')}`,
      date: dateM ? normDate(dateM[1]) : todayStr(fetchedAt),
    });
  }
  if (items.length === 0) {
    console.warn('[WARN] 경희대: 0건 수집됨 — 목록 페이지 구조가 바뀌었거나 파서가 맞지 않을 수 있음. 재확인 필요.');
  }
  return items;
}

// 이화여대: 이화뉴스. 성균관대와 같은 계열 CMS로 추정되나 정확한 블록 구조는 미확인 —
// 'mode=view&articleNo=' 패턴을 전역 검색하고 주변에서 날짜를 찾는 방식으로 시도.
async function parseEwha(fetchedAt) {
  const url = 'https://www.ewha.ac.kr/ewha/news/ewha-news.do';
  const html = await fetchHtml(url);
  const re = /<a href="(\?mode=view&amp;articleNo=(\d+)[^"]*)"[^>]*>\s*([\s\S]{2,150}?)\s*<\/a>/g;
  const items = [];
  const seen = new Set();
  for (const m of html.matchAll(re)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    const title = stripTags(m[3]);
    if (!title) continue;
    const category = categorize(title);
    if (!category) continue;
    const tail = html.slice(m.index, m.index + 400);
    const dateM = tail.match(/(\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2})/);
    items.push({
      id: `ewha-${m[2]}`, school: '이화여대', title, category,
      url: `https://www.ewha.ac.kr/ewha/news/ewha-news.do${m[1].replace(/&amp;/g, '&')}`,
      date: dateM ? normDate(dateM[1]) : todayStr(fetchedAt),
    });
  }
  return items;
}

const SCHOOLS = [
  { name: '성균관대', owner: '서원석', parse: parseSKKU },
  { name: '한양대', owner: '서원석', parse: parseHanyang },
  { name: '경희대', owner: '이수연', parse: parseKHU },
  { name: '동국대', owner: '이수연', parse: parseDongguk },
  { name: '중앙대', owner: '정주원', parse: parseCAU },
  { name: '이화여대', owner: '정주원', parse: parseEwha },
];

function inWindow(dateStr, today) {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const diffDays = Math.floor((today - d) / 86400000);
  return diffDays >= -1 && diffDays < WINDOW_DAYS; // 시간대 근사 오차 보정으로 -1일 허용
}

async function loadPrevious() {
  try {
    const raw = await readFile(OUT_PATH, 'utf-8');
    return JSON.parse(raw).items ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const today = new Date();
  const previous = await loadPrevious();

  const collected = [];
  const sourceSummary = []; // 학교별 성공/실패 요약 — GITHUB_STEP_SUMMARY에 기록해 유지보수 시 한눈에 확인
  for (const school of SCHOOLS) {
    console.log(`Fetching ${school.name}...`);
    try {
      const items = await school.parse(today);
      console.log(`  -> ${items.length} relevant items found`);
      collected.push(...items.map(it => ({ ...it, owner: school.owner })));
      sourceSummary.push(`| ${school.name} | ✅ 성공 | ${items.length}건 |`);
    } catch (e) {
      console.error(`[WARN] ${school.name} fetch failed:`, e.message);
      sourceSummary.push(`| ${school.name} | ❌ 실패 | ${e.message} |`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const windowed = collected.filter(t => inWindow(t.date, today));

  const prevById = new Map(previous.map(t => [t.id, t]));
  const merged = windowed.map(t => {
    const prev = prevById.get(t.id);
    return { ...t, status: prev ? (prev.status || '계속') : '신규' };
  });

  merged.sort((a, b) => b.date.localeCompare(a.date));

  await mkdir('data', { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: today.toISOString(),
    windowDays: WINDOW_DAYS,
    items: merged,
  }, null, 2) + '\n');

  console.log(`\nWrote ${merged.length} items (within last ${WINDOW_DAYS} days) to ${OUT_PATH}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## 경쟁대학 동향 수집 결과',
      `수집 시각: ${today.toISOString()} · 총 ${merged.length}건 (최근 ${WINDOW_DAYS}일)`,
      '',
      '| 학교 | 상태 | 결과 |',
      '|---|---|---|',
      ...sourceSummary,
    ].join('\n') + '\n';
    await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
