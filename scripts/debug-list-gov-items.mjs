// scripts/fetch-gov-trends.mjs의 fetchMinistryItems/isRelevant 로직을 그대로 재사용해
// 실제 최신 목록을 출력한다. 목적: MOCK_TRENDS를 "예정/진행중" 성격의 진짜 기사로 재구성하기 위해
// 후보군을 확보한다(제목만으로 액션 가능성을 1차 판단, 본문은 선정 후 별도 확인).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const DEPTS = [
  { name: '기획예산처', repCode: 'A00040' },
  { name: '교육부', repCode: 'A00002' },
  { name: '과기정통부', repCode: 'A00033' },
  { name: '중기부', repCode: 'A00032' },
  { name: '농식품부', repCode: 'A00008' },
];

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
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchMinistryItems(dept) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${dept.repCode}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error(`[WARN] ${dept.name} fetch failed: HTTP ${res.status}`); return []; }
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
    const newsIdMatch = href.match(/newsId=(\d+)/);
    const newsId = newsIdMatch ? newsIdMatch[1] : href;
    items.push({
      dept: dept.name, title, desc: (lead && lead !== title) ? lead : '',
      date: dateMatch[1], newsId,
      url: href.startsWith('http') ? href : `https://www.korea.kr${href}`,
    });
  }
  return items;
}

for (const dept of DEPTS) {
  const items = await fetchMinistryItems(dept);
  const relevant = items.filter(isRelevant);
  console.log(`\n===== ${dept.name}: ${items.length}건 중 ${relevant.length}건 관련 =====`);
  relevant.forEach(it => {
    console.log(`[${it.date}] (newsId=${it.newsId}) ${it.title}`);
    if (it.desc) console.log(`   lead: ${it.desc}`);
  });
  await new Promise(r => setTimeout(r, 300));
}
