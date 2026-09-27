const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
    const text = await res.text();
    return { ok: res.ok, status: res.status, len: text.length, text };
  } catch (e) {
    return { ok: false, status: 'ERR', len: 0, text: '', error: e.message };
  }
}

async function main() {
  console.log('## 동국대 detail URL (GET) verification\n');
  const r = await get('https://www.dongguk.edu/article/INTEXNOTICE/detail/26766294');
  console.log(`status=${r.status} len=${r.len}`);
  console.log('contains "Language Exchange": ' + r.text.includes('Language Exchange'));
  console.log('contains error markers (존재하지|잘못된|오류): ' + /존재하지|잘못된|오류가 발생/.test(r.text));
}

main().catch(e => { console.error(e); process.exit(1); });
