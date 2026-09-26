// TEMP diagnostic script — fetch FULL (untruncated) article bodies for our 6 verified
// MOCK_TRENDS sources and search for any 접수기간(application period)/deadline mentions
// that might have been missed by earlier truncated (2500-char) fetches.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const REP_CODE = { '기획예산처':'A00040', '교육부':'A00002', '과기정통부':'A00033', '중기부':'A00032', '농식품부':'A00008' };
function url(dept, newsId) {
  return `https://www.korea.kr/news/policyNewsView.do?newsId=${newsId}&repCode=${REP_CODE[dept]}&repCodeType=정부부처&pWiseMinistry=ministryNews`;
}

const items = [
  { dept: '중기부', newsId: '148970979', label: '창업중심대학/경력창업지원사업 (2027 예산안)' },
  { dept: '과기정통부', newsId: '148971010', label: 'AI중심대학 사업 확대 (2027 예산안)' },
  { dept: '과기정통부', newsId: '148971156', label: '이공계 연구생활장려금 확대' },
  { dept: '기획예산처', newsId: '148970426', label: '미래대응기금 신설' },
  { dept: '중기부', newsId: '148971274', label: '제5차 중소기업 인력지원 기본계획' },
];

async function fetchFullBody(u) {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const html = await res.text();
  const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
  if (!m) return { error: 'no article_body match' };
  const text = m[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return { text };
}

const KEYWORDS = ['접수', '신청기간', '신청 기간', '마감', '공모기간', '공모 기간', '까지 신청', '기간 동안', '~부터', '모집기간', '모집 기간', '접수처', '제출기한'];

for (const it of items) {
  const u = url(it.dept, it.newsId);
  console.log(`\n=== [${it.dept}] ${it.label} (newsId=${it.newsId}) ===`);
  try {
    const r = await fetchFullBody(u);
    if (r.error) { console.log(`  ERROR: ${r.error}`); continue; }
    console.log(`  Full length: ${r.text.length} chars`);
    const lines = r.text.split('\n');
    let found = false;
    lines.forEach((line, i) => {
      if (KEYWORDS.some(k => line.includes(k))) {
        found = true;
        console.log(`  [line ${i}] ${line}`);
      }
    });
    if (!found) console.log('  (no 접수/신청/마감 관련 키워드 매치 없음)');
  } catch (e) {
    console.log(`  fetch failed: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
console.log('\nDone.');
