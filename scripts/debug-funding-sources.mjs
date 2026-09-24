const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function inspect(label, url, markers) {
  console.log('='.repeat(20), label, '='.repeat(20));
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
    console.log('status:', res.status);
    const html = await res.text();
    console.log('length:', html.length);
    for (const marker of markers) {
      const idx = html.indexOf(marker);
      console.log(`marker "${marker}":`, idx === -1 ? 'NOT FOUND' : `found at ${idx}`);
      if (idx !== -1) {
        console.log(html.slice(Math.max(0, idx - 200), idx + 1200));
        console.log('---');
      }
    }
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  console.log();
}

await inspect('NRF list', 'https://www.nrf.re.kr/biz/notice/list?menu_no=362&biz_not_gubn=guide', ['nts_no', 'biz_no', '<tbody', '<table', 'class="tit']);
await inspect('IRIS list', 'https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituListView.do', ['ancmId', '<tbody', '<table', 'class="tit', 'ancmNm']);
