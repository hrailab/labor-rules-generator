const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function checkRepCode(code) {
  const url = `https://www.korea.kr/news/ministryNewsList.do?repCode=${code}&pWiseMinistry=ministryNews`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/);
  const activeM = html.match(/<a[^>]*class="[^"]*on[^"]*"[^>]*>([\s\S]{1,30}?)<\/a>/);
  const breadM = html.match(/<div class="loc"[^>]*>([\s\S]{1,300}?)<\/div>/);
  console.log(`repCode=${code}`);
  console.log('  <title>:', titleM ? titleM[1].trim() : 'N/A');
  console.log('  active tab guess:', activeM ? activeM[1].trim() : 'N/A');
  console.log('  breadcrumb guess:', breadM ? breadM[1].replace(/<[^>]+>/g,'|').trim() : 'N/A');
  console.log();
}

for (const code of ['A00012', 'A00002', 'A00040']) {
  await checkRepCode(code);
  await new Promise(r => setTimeout(r, 300));
}
