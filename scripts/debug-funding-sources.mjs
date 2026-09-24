const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function dump(label, url) {
  console.log('='.repeat(20), label, '='.repeat(20));
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
    console.log('status:', res.status);
    const html = await res.text();
    console.log('length:', html.length);
    console.log(html.slice(0, 4000));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  console.log();
}

await dump('NRF list', 'https://www.nrf.re.kr/biz/notice/list?menu_no=362&biz_not_gubn=guide');
await dump('IRIS list', 'https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituListView.do');
