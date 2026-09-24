const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function check(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  console.log('status:', res.status, 'length:', html.length, 'url:', url);
  const re = /존재하지\s*않|삭제된\s*게시|찾을\s*수\s*없|해당\s*게시물이\s*없|페이지를?\s*찾지\s*못/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    console.log('  MATCH:', JSON.stringify(html.slice(Math.max(0, m.index - 80), m.index + 80)));
  }
  const titleM = html.match(/<span class="b-title">\s*([\s\S]*?)\s*<\/span>/) || html.match(/<title>([\s\S]*?)<\/title>/);
  console.log('  title-ish:', titleM ? titleM[1].replace(/<[^>]+>/g,'').trim() : 'N/A');
  console.log();
}

await check('https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=51079');
await check('https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=46498');
