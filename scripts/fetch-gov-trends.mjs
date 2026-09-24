// 정부정책 동향 자동 수집 스크립트
// 대상: 대한민국 정책브리핑(korea.kr) 부처별 뉴스/보도자료 목록
// 실행: 매일 00:00 / 12:00 (KST) — .github/workflows/fetch-gov-trends.yml
//
// 자동 수집되는 항목: 부처, 제목, 요약(lead), 날짜, 링크, 신규/계속 여부(직전 실행 대비 diff)
// 사람 판단이 필요한 항목(우선순위, 대응전략, 본교 영향 등)은 이 스크립트가 채우지 않음 —
// data/trends.json을 직접 열어 수동으로 보완하거나, 별도 검토 절차를 거쳐야 함.
//
// 수집 범위: 사립대학·사립대 구성원(교원·연구자·학생)에게 적용될 만한 항목만 남기도록
// RELEVANT_KEYWORDS 키워드 필터를 거친다 (isRelevant 함수 참고).

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const WINDOW_DAYS = 14;
const OUT_PATH = 'data/trends.json';

// 담당자 소관 매핑 (전략기획팀 정부정책 동향 리포트 담당 매트릭스 기준)
const DEPTS = [
  { name: '기획예산처', repCode: 'A00040', owner: '백승엽' },
  { name: '교육부', repCode: 'A00002', owner: '서원석' }, // 세부 owner는 아래 classifyEduOwner()로 보정
  { name: '과기정통부', repCode: 'A00033', owner: '이수연' },
  { name: '중기부', repCode: 'A00032', owner: '정주원' },
  { name: '농식품부', repCode: 'A00008', owner: '서원석' },
];

// 교육부는 담당자가 백승엽(정책·법령·기본계획) / 서원석(재정지원사업)으로 나뉘어 있어
// 제목의 키워드로 1차 분류. 애매한 건은 서원석(재정지원사업) 기본값.
function classifyEduOwner(title) {
  const policyKeywords = ['법령', '시행령', '시행규칙', '개정', '기본계획', '국무회의', '고시', '훈령'];
  return policyKeywords.some(k => title.includes(k)) ? '백승엽' : '서원석';
}

// 사립대학·사립대 구성원(교원·연구자·학생)에게 적용될 만한 항목만 남기기 위한 키워드 필터.
// 제목·요약에 아래 키워드가 하나도 없으면 (일반 국정·산업·농정 뉴스 등으로 판단해) 제외한다.
// 완벽한 의미 분류는 아니며, 1차 스크리닝 목적 — 애매하게 걸러진 항목은 담당자가 원문 링크로 확인.
const RELEVANT_KEYWORDS = [
  '대학', '대학교', '사립대', '국공립대', '전문대', '대학원', '캠퍼스',
  '교원', '교수', '강사', '겸임', '연구자', '연구원', '연구교수',
  '학생', '재학생', '대학생', '대학원생', '유학생', '조교',
  '등록금', '장학금', '학자금', '국가장학',
  '산학협력', '산학연', '창업', '창업지원', '창업보육',
  '연구개발', 'R&D', '연구비', '연구지원', '학술연구', '기초연구', '국책연구',
  'BK21', '라이즈', 'RISE', '글로컬대학', '지역혁신',
  '입시', '대입', '수시모집', '정시모집', '학생부',
  '정원', '학사구조', '대학평가', '대학기본역량진단', '등록금심의',
];
function isRelevant(item) {
  const text = item.title + ' ' + item.desc;
  return RELEVANT_KEYWORDS.some(k => text.includes(k));
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchMinistryItems(dept) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${dept.repCode}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.error(`[WARN] ${dept.name} (${dept.repCode}) fetch failed: HTTP ${res.status}`);
    return [];
  }
  const html = await res.text();

  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  const items = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const inner = m[2];

    const titleMatch = inner.match(/<strong>([\s\S]*?)<\/strong>/);
    const leadMatch = inner.match(/<span class="lead">([\s\S]*?)<\/span>/);
    const dateMatch = inner.match(/<span class="source">\s*<span>(\d{4}-\d{2}-\d{2})<\/span>/);
    if (!titleMatch || !dateMatch) continue;

    const title = stripTags(titleMatch[1]);
    const lead = leadMatch ? stripTags(leadMatch[1]) : '';
    const date = dateMatch[1];
    const newsIdMatch = href.match(/newsId=(\d+)/);
    const newsId = newsIdMatch ? newsIdMatch[1] : href;

    items.push({
      id: `${dept.repCode}-${newsId}`,
      dept: dept.name,
      title,
      desc: (lead && lead !== title) ? lead : '',
      date,
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
      owner: dept.name === '교육부' ? classifyEduOwner(title) : dept.owner,
    });
  }
  return items;
}

function inWindow(dateStr, today) {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const diffDays = Math.floor((today - d) / 86400000);
  return diffDays >= 0 && diffDays < WINDOW_DAYS;
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
  for (const dept of DEPTS) {
    console.log(`Fetching ${dept.name} (${dept.repCode})...`);
    const items = await fetchMinistryItems(dept);
    console.log(`  -> ${items.length} items found`);
    collected.push(...items);
    await new Promise(r => setTimeout(r, 400)); // 사이트 부하 방지용 딜레이
  }

  const relevant = collected.filter(isRelevant);
  console.log(`\nRelevance filter: ${relevant.length}/${collected.length} items kept`);
  const windowed = relevant.filter(t => inWindow(t.date, today));

  // 직전 실행 대비 신규/계속 판정. 우선순위·마감일 등 사람 판단이 필요한 값은 자동 산출하지 않고,
  // 기존에 담당자가 수기로 채워둔 값이 있으면 보존한다.
  const prevById = new Map(previous.map(t => [t.id, t]));
  const merged = windowed.map(t => {
    const prev = prevById.get(t.id);
    return {
      ...t,
      status: prev ? (prev.status || '계속') : '신규',
      priority: prev?.priority ?? null,
      due: prev?.due ?? null,
    };
  });

  merged.sort((a, b) => b.date.localeCompare(a.date));

  await mkdir('data', { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: today.toISOString(),
    windowDays: WINDOW_DAYS,
    items: merged,
  }, null, 2) + '\n');

  console.log(`\nWrote ${merged.length} items (within last ${WINDOW_DAYS} days) to ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
