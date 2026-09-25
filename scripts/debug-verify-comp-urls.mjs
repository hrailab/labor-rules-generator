const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const targets = [
  { school: '성균관대', title: '교육부 재정지원사업 3건 동시 신청 준비 중인 것으로 파악', url: 'https://www.skku.edu/skku/campus/skk_comm/notice01.do?mode=view&articleNo=140164' },
  { school: '성균관대', title: '산학협력단 인력 충원, 기업연계 프로그램 확대', url: 'https://www.skku.edu/skku/campus/skk_comm/notice01.do?mode=view&articleNo=140158' },
  { school: '한양대', title: '중기부 창업 인프라 연계 예산 확대 편성 논의', url: 'https://www.newshyu.com/news/articleView.html?idxno=1026403' },
  { school: '한양대', title: 'AI반도체 국책사업 수주로 국제 공동연구 확대', url: 'https://www.newshyu.com/news/articleView.html?idxno=1026380' },
  { school: '중앙대', title: '2027학년도 순수외국인전형 원서접수 안내', url: 'https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=51079' },
  { school: '중앙대', title: '창업중심대학 후속 지원 대응 TF 구성', url: 'https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=46498' },
];

for (const t of targets) {
  console.log('\n========================================');
  console.log(`[${t.school}] mock title: ${t.title}`);
  console.log(`URL: ${t.url}`);
  try {
    const res = await fetch(t.url, { headers: { 'User-Agent': UA } });
    console.log('status:', res.status);
    if (!res.ok) continue;
    const html = await res.text();
    console.log('length:', html.length);

    // Try to find <title> tag
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    console.log('page <title>:', titleMatch ? titleMatch[1].trim() : '(not found)');

    // Try common article-title class patterns
    const patterns = [
      /class="subject"[^>]*>([^<]+)</i,
      /class="tit"[^>]*>([^<]+)</i,
      /class="view_tit"[^>]*>([^<]+)</i,
      /class="board_view_tit"[^>]*>([^<]+)</i,
      /class="art_tit"[^>]*>([^<]+)</i,
      /class="heading"[^>]*>([^<]+)</i,
      /<h[1-3][^>]*>([^<]{5,100})<\/h[1-3]>/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) console.log('matched pattern', p, '->', m[1].trim());
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
