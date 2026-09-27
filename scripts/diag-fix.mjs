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

const out = [];
const log = (s) => { console.log(s); out.push(s); };

async function main() {
  // 1) Verify KHU's constructed direct-view URL actually resolves to the real article
  log('## 1) KHU constructed mode=view URL verification\n');
  const khuDirect = await get('https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?mode=view&articleNo=322928&menuNo=200316');
  log(`status=${khuDirect.status} len=${khuDirect.len}`);
  log('contains title text "한국어 도우미": ' + khuDirect.text.includes('한국어 도우미'));
  log('contains "존재하지" or "잘못된" (error page marker): ' + /존재하지|잘못된|오류가 발생/.test(khuDirect.text));

  // 2) 동국대 — exact item block around the goDetail offsets found last time (~58800-59300)
  log('\n## 2) 동국대 exact item block\n');
  const dgu = await get('https://www.dongguk.edu/article/INTEXNOTICE/list');
  log(`len=${dgu.len}`);
  log(dgu.text.slice(58600, 59500));

  // 3) 이화여대 — confirm the exact <a> tag attributes (title format) and look for a date near the item
  log('\n## 3) 이화여대 exact <a> tag + surrounding date search\n');
  const ewha = await get('https://www.ewha.ac.kr/ewha/news/ewha-news.do');
  log(`len=${ewha.len}`);
  const aIdx = ewha.text.indexOf('mode=view&articleNo=367050');
  if (aIdx !== -1) {
    log(ewha.text.slice(Math.max(0, aIdx - 100), aIdx + 2500));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, '## diag-fix output\n\n```\n' + out.join('\n') + '\n```\n', { flag: 'a' });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
