// 경쟁대학 동향 자동 수집 스크립트
// 대상: 성균관대·한양대·경희대·동국대·중앙대·이화여대 6개교
// 실행: 매일 00:00 / 12:00 (KST) — .github/workflows/fetch-competitor-trends.yml
//
// 수집 범위: 재정지원사업, 산학협력, 국제, 대외협력 분야 관련 항목만.
// 국제처/국제교류 전용 게시판(중앙대·동국대)은 그 자체로 범위에 맞으므로 그대로 수집하고,
// 일반 공지·뉴스 게시판(성균관대·한양대·경희대·이화여대)은 CATEGORY_RULES 키워드로 걸러낸다.
// 채용·아르바이트·행사 도우미 등 구인 공고는 학교를 가리지 않고 RECRUITMENT_KEYWORDS로 별도
// 제외한다(isRecruitment 함수 참고) — 국제교류 전용 게시판도 구인 공고를 올릴 수 있어 카테고리
// 필터와 별개로 항상 적용한다.
//
// 각 대학이 서로 다른 웹사이트 CMS를 쓰고 있어 학교별로 별도 파서가 필요하다.
// 이 세션은 egress 정책상 각 대학 사이트에 직접 접근할 수 없어, GitHub Actions 러너로
// 실제 HTML 구조를 확인한 뒤 아래 파서를 작성했다.
//
// 경희대·동국대·이화여대 파서가 한동안 0건을 반환했던 문제를 GitHub Actions 러너로 각
// 목록 페이지의 실제 HTML을 다시 확인해 해결했다 — 경희대는 상세 링크가 href가 아닌
// onclick="javascript:view(...)"라 title 텍스트를 배지 span 뒤에서 추출해야 했고, 동국대는
// <li> 목록이 onclick="goDetail(seq)" 기반이라 별도 GET 가능한 상세 URL(/detail/{seq})을
// 확인해 사용했으며, 이화여대는 href의 "&"가 HTML 엔티티로 인코딩되지 않아 기존 정규식이
// 매칭에 실패했던 것으로 확인되어 title 속성에서 직접 제목을 추출하도록 수정했다.

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

// "경쟁대학 동향"의 목적은 재정지원사업·산학협력·국제·대외협력 실적/활동을 파악하는 것이지,
// 그 학교의 채용·아르바이트·행사 도우미 등 구인 공고까지 담을 필요는 없다(전략적으로 참고할
// 가치가 없는 노이즈). '채용'은 거의 예외 없이 고용 관련 공고에만 쓰이므로 단독으로도 안전하게
// 걸러낼 수 있지만, '모집'만으로는 예비창업자 모집·교환학생 모집처럼 구인이 아닌 정상 프로그램
// 공지까지 걸러낼 위험이 있어 구인 성격이 뚜렷한 조합 키워드만 매칭한다.
const RECRUITMENT_KEYWORDS = [
  '채용', '도우미 모집', '서포터즈 모집', '참가자 모집', '봉사자 모집',
  '인턴 모집', '근로학생 모집', '근로장학생 모집', '아르바이트',
];
function isRecruitment(title) {
  return RECRUITMENT_KEYWORDS.some(k => title.includes(k));
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

// 각 대학 사이트가 간헐적으로 빈 응답/타임아웃을 반환하는 경우가 있어(일시적 네트워크 장애로
// 확인됨 — 같은 URL을 잠시 후 다시 요청하면 정상 응답함), 최대 3회까지 짧은 대기 후 재시도한다.
async function fetchHtml(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length < 500) throw new Error('empty/short response');
      return text;
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
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

// 동국대 교류공지(INTEXNOTICE) — 국제교류 전용 게시판이라 키워드 필터 없이 전체 수집.
// 목록은 <li><a href="#none" onclick="goDetail(SEQ);"> 형태(실제 링크는 JS로 폼을 구성해
// POST 제출)이며, 제목은 <p class="tit"> 안에 "공지" 배지 span 뒤에 텍스트로 온다.
// 상세페이지 자체는 /article/INTEXNOTICE/detail/{SEQ}를 GET으로 직접 열어도 정상 동작함을
// GitHub Actions 러너로 확인해, 목록의 JS 폼 제출 대신 이 직접 URL을 사용한다.
async function parseDongguk(fetchedAt) {
  const url = 'https://www.dongguk.edu/article/INTEXNOTICE/list';
  const html = await fetchHtml(url);
  const blockRe = /<li>\s*<a href="#none" onclick="goDetail\((\d+)\);">([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  for (const b of html.matchAll(blockRe)) {
    const id = b[1];
    const block = b[2];
    const titM = block.match(/<p class="tit">([\s\S]*?)<\/p>/);
    if (!titM) continue;
    // <p class="tit"> 안에 "공지" 배지 <span class="mobile">가 먼저 오고 실제 제목은 그 뒤에
    // 텍스트로 이어진다 — </span>로 나눈 조각 중 가장 긴 텍스트를 제목으로 취해 배지 문구가
    // 제목에 섞이지 않게 한다(parseKHU와 동일한 패턴).
    const title = titM[1].split(/<\/span>/).map(stripTags).reduce((a, b) => b.length > a.length ? b : a, '');
    if (!title) continue;
    const dateM = block.match(/<span>(\d{4}\.\d{2}\.\d{2})\.?<\/span>/);
    items.push({
      id: `dgu-${id}`, school: '동국대', title, category: categorize(title) || '국제',
      url: `https://www.dongguk.edu/article/INTEXNOTICE/detail/${id}`,
      date: dateM ? normDate(dateM[1]) : todayStr(fetchedAt),
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

// 경희대: 공지사항 게시판. 목록은 <table><tbody><tr> 행 구조이며, 상세 링크는 실제 href가
// 아니라 onclick="javascript:view('SEQ','');"로 JS 네비게이션한다. 제목은 분류 배지 span들
// 뒤에 텍스트로 이어지고, 부서명·등록일·조회수가 각각 <td>로 뒤따른다. 목록의 JS 대신 이
// list.do 자체의 ?mode=view&articleNo=SEQ 쿼리로 직접 접근해도 동일한 게시글이 열림을
// GitHub Actions 러너로 확인했다(같은 게시판 URL 규칙을 그대로 재사용).
async function parseKHU(fetchedAt) {
  const url = 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316';
  const html = await fetchHtml(url);
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  const items = [];
  for (const m of html.matchAll(rowRe)) {
    const row = m[1];
    const idM = row.match(/javascript:view\('(\d+)'/);
    if (!idM) continue;
    const aM = row.match(/<a href="javascript:view\('\d+','[^']*'\);">([\s\S]*?)<\/a>/);
    if (!aM) continue;
    // 분류 배지(공지/공통/국제 등) span이 제목 앞에, 첨부파일 아이콘 span이 제목 뒤에 붙는 등
    // 위치가 일정하지 않아 "마지막 span 뒤"로는 제목을 특정할 수 없다 — </span>로 나눈 조각
    // 중 가장 긴 텍스트가 실제 제목이라는 점을 이용한다(배지·아이콘은 항상 짧은 라벨이거나 빈 텍스트).
    const title = aM[1].split(/<\/span>/).map(stripTags).reduce((a, b) => b.length > a.length ? b : a, '');
    if (!title) continue;
    const category = categorize(title);
    if (!category) continue;
    const dateM = row.match(/<td>(\d{4}-\d{2}-\d{2})<\/td>/);
    items.push({
      id: `khu-${idM[1]}`, school: '경희대', title, category,
      url: `https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?mode=view&articleNo=${idM[1]}&menuNo=200316`,
      date: dateM ? dateM[1] : todayStr(fetchedAt),
    });
  }
  if (items.length === 0) {
    console.warn('[WARN] 경희대: 0건 수집됨 — 목록 페이지 구조가 바뀌었거나 파서가 맞지 않을 수 있음. 재확인 필요.');
  }
  return items;
}

// 이화여대: 이화뉴스. 목록은 카드형으로, 이미지 영역과 텍스트 영역에 동일한 게시글이 두 번
// 나오며(article.offset·articleLimit이 붙은 <a href="?mode=view&articleNo=SEQ&...">), 이
// href의 "&"가 HTML 엔티티(&amp;)로 인코딩되어 있지 않고 원문 그대로 있어(다른 학교들과의
// 차이점) 기존 정규식(&amp; 고정)이 매칭에 실패했다. 다행히 각 링크의 title 속성에
// "제목 자세히 보기" 형태로 깨끗한 제목 텍스트가 그대로 들어 있어 이를 그대로 사용한다.
// 목록에서 날짜를 확인하지 못해 수집 시각을 등록일로 사용한다(참고용, 근사치).
async function parseEwha(fetchedAt) {
  const url = 'https://www.ewha.ac.kr/ewha/news/ewha-news.do';
  const html = await fetchHtml(url);
  const re = /<a href="(\?mode=view&articleNo=(\d+)[^"]*)" title="([^"]+?)\s*자세히 보기"/g;
  const items = [];
  const seen = new Set();
  for (const m of html.matchAll(re)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    const title = m[3].trim();
    if (!title) continue;
    const category = categorize(title);
    if (!category) continue;
    items.push({
      id: `ewha-${m[2]}`, school: '이화여대', title, category,
      url: `https://www.ewha.ac.kr/ewha/news/ewha-news.do${m[1]}`,
      date: todayStr(fetchedAt),
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
  let successCount = 0;
  for (const school of SCHOOLS) {
    console.log(`Fetching ${school.name}...`);
    try {
      const items = await school.parse(today);
      console.log(`  -> ${items.length} relevant items found`);
      collected.push(...items.map(it => ({ ...it, owner: school.owner })));
      successCount++;
      sourceSummary.push(`| ${school.name} | ✅ 성공 | ${items.length}건 |`);
    } catch (e) {
      console.error(`[WARN] ${school.name} fetch failed:`, e.message);
      sourceSummary.push(`| ${school.name} | ❌ 실패 | ${e.message} |`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // 6개 학교가 전부 실패하면(예: 일시적 네트워크 장애) 0건짜리 결과로 기존 data/competitors.json을
  // 덮어쓰지 않고 중단한다 — fetch-gov-trends.mjs와 동일한 방어 패턴.
  if (successCount === 0) {
    console.error('[ERROR] 모든 학교 수집이 실패했습니다 — 기존 data/competitors.json을 덮어쓰지 않고 종료합니다. (일시적 네트워크 장애일 가능성이 높으니 다음 실행에서 재시도됨)');
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = [
        '## 경쟁대학 동향 수집 결과 — 전체 실패',
        `수집 시각: ${today.toISOString()} · 모든 학교 수집 실패로 data/competitors.json을 갱신하지 않음`,
        '',
        '| 학교 | 상태 | 결과 |',
        '|---|---|---|',
        ...sourceSummary,
      ].join('\n') + '\n';
      await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
    }
    process.exitCode = 1;
    return;
  }

  const inWindowItems = collected.filter(t => inWindow(t.date, today));
  const recruitmentItems = inWindowItems.filter(t => isRecruitment(t.title));
  const windowed = inWindowItems.filter(t => !isRecruitment(t.title));
  if (recruitmentItems.length) {
    console.log(`Recruitment filter: ${recruitmentItems.length}건 제외(채용·모집 등 구인 공고 — "경쟁대학 동향"에서 다룰 실익 없음):`);
    recruitmentItems.forEach(t => console.log(`  - [${t.school}] ${t.title}`));
  }

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
