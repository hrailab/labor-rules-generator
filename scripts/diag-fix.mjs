import { writeFile } from 'node:fs/promises';

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
  console.log('## 동국대 real item markup (offset 60700-63200)\n');
  const dgu = await get('https://www.dongguk.edu/article/INTEXNOTICE/list');
  console.log(`len=${dgu.len}`);
  console.log(dgu.text.slice(60700, 63200));
}

main().catch(e => { console.error(e); process.exit(1); });
