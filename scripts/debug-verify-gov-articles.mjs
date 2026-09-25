const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const targets = [
  { label: '서울대 10개 만들기(기존 검증됨)', newsId: '148971065' },
  { label: '창업중심대학 지원사업', newsId: '148972173' },
  { label: '대학혁신지원사업 3주기 기본계획', newsId: '148972427' },
  { label: '대학 ICT 연구인프라 고도화 사업', newsId: '148972061' },
  { label: '글로컬대학 후속 재정지원사업', newsId: '148972119' },
  { label: '이공계 대학원생 연구생활장려금 확대', newsId: '148971747' },
];

for (const t of targets) {
  const url = `https://www.korea.kr/news/policyNewsView.do?newsId=${t.newsId}`;
  console.log('\n========================================');
  console.log(`[mock label] ${t.label}`);
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
      console.log(text.slice(0, 1200));
    } else {
      console.log('article_body not found');
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
