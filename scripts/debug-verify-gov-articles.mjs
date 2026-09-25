const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const targets = [
  { label: '이공계 연구생활장려금 대학 5곳 추가', newsId: '148971156' },
  { label: '지역 주도 자율 R&D 본격 시작', newsId: '148971676' },
  { label: '산업계 대학교육 혁신포럼 개최', newsId: '156782569' },
  { label: '폐교 활용 지원사업 7건 선정', newsId: '148971836' },
  { label: '지방 사립대 지역인재장학금 지원 설명자료', newsId: '148971440' },
  { label: '대입 원서접수시스템 장애 설명자료', newsId: '148971775' },
];

for (const t of targets) {
  const url = `https://www.korea.kr/news/policyNewsView.do?newsId=${t.newsId}`;
  console.log('\n========================================');
  console.log(`[label] ${t.label}`);
  console.log(`URL: ${url}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    console.log('status:', res.status);
    if (!res.ok) continue;
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    console.log('page <title>:', titleMatch ? titleMatch[1].trim() : '(not found)');
    const m = html.match(/<div class="article_body"[^>]*>([\s\S]*?)<div class="article_footer"/);
    if (m) {
      const text = m[1].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/\n{2,}/g, '\n').trim();
      console.log('LENGTH:', text.length);
      console.log(text.slice(0, 1800));
    } else {
      console.log('article_body not found');
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
