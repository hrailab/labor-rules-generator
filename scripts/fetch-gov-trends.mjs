// 정부정책 동향 자동 수집 스크립트
// 대상: 대한민국 정책브리핑(korea.kr) 부처별 뉴스/보도자료 목록(5개 명시 부처)
//      + 전체 정책뉴스 통합 피드(그 외 모든 부처, '기타부처'로 태깅 — fetchUnifiedPolicyNews 참고)
// 실행: 매일 00:00 / 12:00 (KST) — .github/workflows/fetch-gov-trends.yml
//
// 자동 수집되는 항목: 부처, 제목, 요약(lead), 날짜, 링크, 신규/계속 여부(직전 실행 대비 diff)
// 우선순위 '높음'이고 아직 분석이 없는 신규 항목은 기사 본문을 읽어 주요사안 상세 5개 필드
// (배경/주요내용/시사점/본교영향/대응전략) 초안을 Claude API로 자동 생성한다(generateAnalysis 참고).
// '시사점/본교 영향/대응 전략'은 본교 고유의 내부 사정을 알지 못한 채 기사 내용만으로 추정한
// 것이므로 aiGenerated:true로 표시되며, 담당자가 반드시 검토·보완해야 한다. ANTHROPIC_API_KEY가
// 설정되지 않았거나 호출이 실패하면 조용히 건너뛰고 기존처럼 "분석 대기" 상태로 남는다.
// 소관 부처 재확인 등 그 외 사람 판단이 필요한 항목은 이 스크립트가 채우지 않음 —
// data/trends.json을 직접 열어 수동으로 보완하거나, 별도 검토 절차를 거쳐야 함.
// (PRIORITY_KEYWORDS에 해당하는 신규 항목은 우선순위 '높음'을 잠정 자동 태깅한다.)
//
// 수집 범위: 사립대학·사립대 구성원(교원·연구자·학생)에게 적용될 만한 항목만 남기도록
// RELEVANT_KEYWORDS 키워드 필터를 거친다 (isRelevant 함수 참고).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';

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
  '직업훈련', 'K-디지털트레이닝', '평생교육', '재직자', '고등직업교육',
];
function isRelevant(item) {
  const text = item.title + ' ' + item.desc;
  return RELEVANT_KEYWORDS.some(k => text.includes(k));
}

// 전략적 파급력이 큰 사업·정책일수록 우선 검토가 필요하므로, 아래 키워드가 제목에 포함된
// "신규" 항목은 우선순위를 '높음'으로 자동 태깅해 주요사안 상세에 곧바로 노출한다.
// 이미 담당자가 우선순위를 수기로 지정한 기존 항목은 절대 덮어쓰지 않는다(merge 단계에서 prev 우선).
//
// 이 페이지의 목적은 "공문 수신 이전 단계에서 정부 정책 정보를 선제적으로 확보"하는 것이다
// (index.html의 hero-sub 참고) — 즉 아직 확정되지 않은, 우리가 준비할 시간이 있는 사안을
// 조기에 포착하는 것이 핵심이다. 따라서 전략적 키워드가 맞더라도, 이미 결과가 확정·발표된
// 사안(예: 선정 결과 발표, 이미 종료된 공모의 사후 조치)은 "주요사안 상세"에 올릴 필요가 없다
// — 사립대학이 더 이상 취할 수 있는 대응이 없기 때문이다. 그래서 전략적 키워드에 더해
// ACTIONABLE_KEYWORDS(공모·접수·시행 예정 등 향후 대응 여지를 시사하는 표현)가 함께 있어야만
// 우선순위 '높음'으로 자동 태깅한다.
const PRIORITY_KEYWORDS = [
  'RISE', '라이즈', '글로컬대학', '대학혁신지원사업', 'LINC', '링크사업',
  '첨단인재', '산학협력', '무전공', '자율전공', '직업훈련', '정원 감축', '정원감축',
  '기본계획', '재정지원', '국가장학',
];
const ACTIONABLE_KEYWORDS = [
  '공모', '모집', '접수', '신청', '설명회', '공고', '입법예고', '의견수렴',
  '시행 예정', '도입 예정', '추진 예정', '확대', '추가 선정', '개편안', '검토', '계획',
];
function isActionable(item) {
  const text = item.title + ' ' + item.desc;
  return ACTIONABLE_KEYWORDS.some(k => text.includes(k));
}
function isPriorityCandidate(item) {
  return PRIORITY_KEYWORDS.some(k => item.title.includes(k)) && isActionable(item);
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
      category: '정책예고',
      title,
      desc: (lead && lead !== title) ? lead : '',
      date,
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
      owner: dept.name === '교육부' ? classifyEduOwner(title) : dept.owner,
    });
  }
  return items;
}

// 정책브리핑 전체 정책뉴스 통합 피드 — 5개 명시 부처 외에 고용노동부·여성가족부·산업통상자원부 등
// 그 외 모든 부처의 보도자료가 섞여 나온다. 목록/상세 페이지 어디에도 출처 부처명이 파싱 가능한
// 형태로 노출되지 않아(정책브리핑 자체 출처 표기만 있음) 자동으로 정확한 소관 부처를 특정할 수 없다.
// 그래서 dept를 '기타부처'로, owner를 '미배정'으로 잠정 태깅해 수집 범위를 넓히고,
// 담당자가 원문을 확인해 실제 소관 부처·담당자를 수동으로 배정하도록 한다(우선순위 등과 동일한 패턴).
async function fetchUnifiedPolicyNews(knownNewsIds) {
  const url = `https://www.korea.kr/news/policyNewsList.do`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.error(`[WARN] 기타부처(통합피드) fetch failed: HTTP ${res.status}`);
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

    const newsIdMatch = href.match(/newsId=(\d+)/);
    const newsId = newsIdMatch ? newsIdMatch[1] : href;
    if (knownNewsIds.has(newsId)) continue; // 이미 5개 명시 부처에서 수집된 항목은 중복 제외

    items.push({
      id: `etc-${newsId}`,
      dept: '기타부처',
      category: '정책예고',
      title: stripTags(titleMatch[1]),
      desc: (() => { const lead = leadMatch ? stripTags(leadMatch[1]) : ''; return lead !== stripTags(titleMatch[1]) ? lead : ''; })(),
      date: dateMatch[1],
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
      owner: '미배정',
    });
  }
  return items;
}

// 기사 상세페이지에서 본문 텍스트를 추출한다(<div class="article_body">...<div class="article_footer">).
// GitHub Actions 러너로 실제 페이지 구조를 확인해 확정한 선택자 — 사이트 구조가 바뀌면
// generateAnalysis()가 조용히 null을 반환하고 "분석 대기" 상태로 남을 뿐, 파이프라인은 계속 동작한다.
async function fetchArticleBody(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
    if (!m) return null;
    const text = m[1]
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

const ANALYSIS_MODEL = 'claude-opus-5';
let anthropicClient;
// ANTHROPIC_API_KEY가 없으면 null을 반환해 AI 분석 생성 전체를 건너뛴다(로컬 실행·키 미설정 시 안전한 기본값).
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (anthropicClient === undefined) anthropicClient = new Anthropic();
  return anthropicClient;
}

// 우선순위 '높음'이면서 아직 분석(배경 등)이 없는 항목에 한해, 기사 본문을 읽고 주요사안 상세
// 5개 필드의 초안을 생성한다. '추진 배경'/'주요 내용'은 기사 본문에 실제로 명시된 사실만 근거로
// 작성하도록 프롬프트에서 강제하고(지어내기 금지), 본교(건국대) 내부 실적·현황은 알 수 없으므로
// '시사점/본교 영향/대응 전략'은 그 사실을 바탕으로 한 사립대학 일반 관점의 추정임 —
// 반드시 담당자 검토가 필요하다(aiGenerated 플래그).
async function generateAnalysis(item) {
  const client = getAnthropicClient();
  if (!client || !item.url) return null;

  const bodyText = await fetchArticleBody(item.url);
  if (!bodyText) return null;

  const prompt = `다음은 대한민국 정부 부처의 보도자료다. 이 정책이 사립대학(건국대학교)에 미치는 영향을 분석하는
전략기획팀 보고서에 넣을 5개 항목의 초안을 작성하라. 반드시 아래 JSON 형식으로만 답하고, 다른 텍스트는 절대 포함하지 마라.

[사실 기반 필드 — bg, body]
아래 [본문]에 실제로 명시된 사실(숫자·기관명·일정·경위 등)만 근거로 작성하라. 본문에 없는 내용은
절대 추측하거나 지어내지 말고, 본문에 나온 표현·수치를 최대한 그대로 활용해 요약하라.
- "bg": 이 정책·사업이 추진된 배경·경위 (본문에 명시된 사실만, 2~3문장)
- "body": 보도자료의 핵심 내용 (본문에 명시된 사실만). 특히 아래 세 가지가 본문에 명시되어 있으면
  절대 누락하지 말고 반드시 포함하라(문장 안에 자연스럽게 녹이거나, 구체적 수치·기간을 그대로 인용):
  ① 접수기간(공고일·접수 마감일·신청 기간 등 일정), ② 지원자격(신청 대상·자격 요건·선정 방식),
  ③ 사업규모·사업비(총예산·지원금액·지원 규모·지원 기간). 본문에 해당 내용이 없으면 억지로 만들지 말고 생략하라.

[분석 필드 — implication, impact, strategy]
본교(건국대학교)의 실제 내부 실적·현황은 알 수 없으므로, 위 사실을 근거로 한 사립대학 일반
관점의 합리적 추정으로 작성하되, 본문에 없는 구체적 수치나 사실을 새로 지어내지는 마라.
- "implication": 정책적 시사점 (2~3문장)
- "impact": 사립대학 일반에 대한 예상 영향 (2~3문장, 본교 고유 현황은 알 수 없으므로 사립대 전반 관점에서 서술)
- "strategy": 사립대학이 취할 수 있는 일반적 대응 방향 (2~3문장). 단, 본문 내용이 이미 결과가
  확정·발표되어 더 이상 신청·지원 등 직접적인 대응 수단이 없는 사안(예: 특정 기관 선정 결과 발표,
  이미 마감된 공모의 사후 조치)이라면, 억지로 "준비·대응하라"는 식의 조언을 지어내지 말고
  "이 사안은 결과가 확정되어 직접 대응은 어려우며, [구체적으로 어떤 관점에서] 모니터링이 필요하다"는
  식으로 정직하게 작성하라.

{"bg": "...", "body": "...", "implication": "...", "impact": "...", "strategy": "..."}

[제목]
${item.title}

[본문]
${bodyText.slice(0, 4000)}`;

  try {
    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return null;
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.bg || !parsed.body || !parsed.implication || !parsed.impact || !parsed.strategy) return null;
    return {
      bg: parsed.bg,
      body: parsed.body,
      implication: parsed.implication,
      impact: parsed.impact,
      strategy: parsed.strategy,
    };
  } catch (e) {
    console.error(`[WARN] AI 분석 생성 실패 (${item.title}):`, e.message);
    return null;
  }
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
  const sourceSummary = []; // 소스별 성공/실패 요약 — GITHUB_STEP_SUMMARY에 기록해 유지보수 시 한눈에 확인
  for (const dept of DEPTS) {
    console.log(`Fetching ${dept.name} (${dept.repCode})...`);
    try {
      // 한 부처의 사이트 구조 변경·일시 장애로 전체 수집이 중단되지 않도록 소스별로 독립 격리한다 —
      // 여기서 실패해도 나머지 부처는 계속 수집되고, 이번 실행에선 해당 부처만 이전 결과가 유지된다.
      const items = await fetchMinistryItems(dept);
      console.log(`  -> ${items.length} items found`);
      collected.push(...items);
      sourceSummary.push(`| ${dept.name} | ✅ 성공 | ${items.length}건 |`);
    } catch (e) {
      console.error(`[WARN] ${dept.name} 수집 실패:`, e.message);
      sourceSummary.push(`| ${dept.name} | ❌ 실패 | ${e.message} |`);
    }
    await new Promise(r => setTimeout(r, 400)); // 사이트 부하 방지용 딜레이
  }

  // 5개 명시 부처 외 나머지 부처를 훑어 수집 범위를 넓히는 통합 피드 — 이미 수집된 newsId는 제외.
  console.log('Fetching 기타부처 (통합 피드)...');
  try {
    const knownNewsIds = new Set(collected.map(t => t.id.split('-').pop()));
    const etcItems = await fetchUnifiedPolicyNews(knownNewsIds);
    console.log(`  -> ${etcItems.length} items found`);
    collected.push(...etcItems);
    sourceSummary.push(`| 기타부처(통합피드) | ✅ 성공 | ${etcItems.length}건 |`);
  } catch (e) {
    console.error('[WARN] 기타부처(통합피드) 수집 실패:', e.message);
    sourceSummary.push(`| 기타부처(통합피드) | ❌ 실패 | ${e.message} |`);
  }

  const relevant = collected.filter(isRelevant);
  console.log(`\nRelevance filter: ${relevant.length}/${collected.length} items kept`);
  const windowed = relevant.filter(t => inWindow(t.date, today));

  // 직전 실행 대비 신규/계속 판정. 우선순위·마감일·주요사안 분석(배경/내용/시사점/본교영향/대응전략) 등
  // 사람 판단이 필요한 값은 자동 산출하지 않고, 기존에 담당자가 수기로 채워둔 값이 있으면 보존한다.
  // 다만 신규 항목 중 전략적 파급력이 큰 키워드(PRIORITY_KEYWORDS)가 제목에 포함된 경우에는
  // 담당자가 놓치지 않도록 우선순위를 '높음'으로 미리 태깅해 주요사안 상세에 바로 노출되게 한다
  // (담당자가 이후 수기로 값을 바꾸면 그 값이 항상 우선한다).
  const prevById = new Map(previous.map(t => [t.id, t]));
  const merged = windowed.map(t => {
    const prev = prevById.get(t.id);
    return {
      ...t,
      status: prev ? (prev.status || '계속') : '신규',
      priority: prev ? (prev.priority ?? null) : (isPriorityCandidate(t) ? '높음' : null),
      due: prev?.due ?? null,
      // 접수 마감일(YYYY-MM-DD, 정확한 날짜가 확인된 경우에만) — 프런트엔드에서 D-day 배지 계산에 사용.
      // 보도자료 원문만으로는 자동 추출이 어려워 담당자가 직접 채워 넣는 값.
      deadline: prev?.deadline ?? null,
      bg: prev?.bg ?? null,
      body: prev?.body ?? null,
      implication: prev?.implication ?? null,
      impact: prev?.impact ?? null,
      strategy: prev?.strategy ?? null,
      // AI가 생성한 초안인지 여부 — true인 동안은 프런트엔드에 "AI 초안 · 검토 필요"로 표시된다.
      // 담당자가 검토 후 내용을 수정하면 이 값도 false로 바꿔 검토 완료를 표시해야 한다.
      aiGenerated: prev?.aiGenerated ?? false,
    };
  });

  // 우선순위 '높음'이면서 아직 분석이 없는 항목에 한해 AI 초안 생성을 시도한다.
  // ANTHROPIC_API_KEY가 없으면 getAnthropicClient()가 null을 반환해 전체를 건너뛴다.
  if (getAnthropicClient()) {
    const pending = merged.filter(t => t.priority === '높음' && !t.bg);
    console.log(`\nGenerating AI draft analysis for ${pending.length} high-priority item(s) without existing analysis...`);
    for (const item of pending) {
      const analysis = await generateAnalysis(item);
      if (analysis) {
        Object.assign(item, analysis, { aiGenerated: true });
        console.log(`  -> AI 초안 생성됨: ${item.title}`);
      } else {
        console.log(`  -> AI 초안 생성 실패/스킵(분석 대기로 유지): ${item.title}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } else {
    console.log('\n[INFO] ANTHROPIC_API_KEY가 설정되지 않아 AI 분석 생성을 건너뜁니다(기존처럼 "분석 대기" 상태로 유지).');
  }

  merged.sort((a, b) => b.date.localeCompare(a.date));

  await mkdir('data', { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: today.toISOString(),
    windowDays: WINDOW_DAYS,
    items: merged,
  }, null, 2) + '\n');

  console.log(`\nWrote ${merged.length} items (within last ${WINDOW_DAYS} days) to ${OUT_PATH}`);

  // GitHub Actions 실행 요약 화면에 소스별 성공/실패를 표로 남겨, 특정 부처 수집이
  // 조용히 실패한 채로 방치되지 않도록 한다(로컬 실행 시에는 GITHUB_STEP_SUMMARY가 없어 조용히 스킵).
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## 정부정책 동향 수집 결과',
      `수집 시각: ${today.toISOString()} · 총 ${merged.length}건 (최근 ${WINDOW_DAYS}일)`,
      '',
      '| 부처 | 상태 | 결과 |',
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
