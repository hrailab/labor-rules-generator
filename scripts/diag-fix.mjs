import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function get(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
    const text = await res.text();
    return { ok: res.ok, status: res.status, ms: Date.now() - start, len: text.length, text };
  } catch (e) {
    return { ok: false, status: 'ERR', ms: Date.now() - start, len: 0, text: '', error: e.message };
  }
}

async function getWithRetry(url, tries = 4, delayMs = 1500) {
  for (let i = 0; i < tries; i++) {
    const r = await get(url);
    if (r.ok && r.len > 1000) return r;
    console.log(`  retry ${i + 1}/${tries} failed (ok=${r.ok} len=${r.len} ${r.error || ''})`);
    await new Promise(res => setTimeout(res, delayMs));
  }
  return { ok: false, len: 0, text: '' };
}

const out = [];
const log = (s) => { console.log(s); out.push(s); };

async function main() {
  // 1) policyNewsList.do with retry, then run ITEM_RE against a confirmed-successful fetch
  log('## 1) policyNewsList.do (with retry) + ITEM_RE test\n');
  const unified = await getWithRetry('https://www.korea.kr/news/policyNewsList.do');
  log(`final: ok=${unified.ok} len=${unified.len}`);
  if (unified.len > 1000) {
    const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
    const matches = [...unified.text.matchAll(ITEM_RE)];
    log('ITEM_RE match count: ' + matches.length);
    if (matches.length) {
      log('first 3 titles: ' + matches.slice(0,3).map(m => m[2].replace(/<[^>]+>/g,'').trim().slice(0,60)).join(' | '));
    } else {
      const goDetailIdx = unified.text.indexOf('goDetailView(');
      log('goDetailView( first occurrence index: ' + goDetailIdx);
      // find ALL occurrences of the literal substring 'onclick="goDetailView('
      const idxs = [];
      let i = unified.text.indexOf('onclick="goDetailView(');
      while (i !== -1) { idxs.push(i); i = unified.text.indexOf('onclick="goDetailView(', i+1); }
      log('onclick="goDetailView( total occurrences: ' + idxs.length);
      if (idxs.length) {
        log('--- context around a real usage (not the function def) ---');
        const realIdx = idxs.find(x => unified.text.slice(Math.max(0,x-200), x).includes('<a'));
        log(unified.text.slice(Math.max(0, (realIdx ?? idxs[0]) - 300), (realIdx ?? idxs[0]) + 400));
      }
    }
  }

  // 2) 동국대 — widen search for the real list markup (location.href pattern, INTEXNOTICE/view links)
  log('\n## 2) 동국대 deep search\n');
  const dgu = await get('https://www.dongguk.edu/article/INTEXNOTICE/list');
  log(`len=${dgu.len}`);
  const patterns = ["location.href=", "INTEXNOTICE/view", "class=\"tit", "<li class=", "goDetail", "fn_", "javascript:"];
  for (const p of patterns) {
    const idxs = [];
    let i = dgu.text.indexOf(p);
    while (i !== -1 && idxs.length < 8) { idxs.push(i); i = dgu.text.indexOf(p, i+1); }
    log(`  "${p}": ${idxs.length} occurrence(s)${idxs.length ? ' @ ' + idxs.join(',') : ''}`);
  }
  // dump a slice after the 3rd occurrence of "INTEXNOTICE" (skip the share-button boilerplate near the top)
  {
    const all = [];
    let i = dgu.text.indexOf('INTEXNOTICE');
    while (i !== -1) { all.push(i); i = dgu.text.indexOf('INTEXNOTICE', i+1); }
    if (all.length > 3) {
      const at = all[3];
      log('--- slice around 4th "INTEXNOTICE" occurrence ---');
      log(dgu.text.slice(Math.max(0, at - 500), at + 1500));
    }
  }

  // 3) 이화여대 — dump context directly around "articleNo" occurrence (real content, not scripts)
  log('\n## 3) 이화여대 articleNo context\n');
  const ewha = await get('https://www.ewha.ac.kr/ewha/news/ewha-news.do');
  log(`len=${ewha.len}`);
  const anIdx = ewha.text.indexOf('articleNo');
  if (anIdx !== -1) {
    log('--- slice around first "articleNo" ---');
    log(ewha.text.slice(Math.max(0, anIdx - 800), anIdx + 1200));
  }

  // 4) 경희대 — wider tbody slice to capture one full <tr> incl. date column
  log('\n## 4) 경희대 wider tbody slice\n');
  const khu = await get('https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316');
  log(`len=${khu.len}`);
  const tbodyIdx = khu.text.indexOf('<tbody>');
  if (tbodyIdx !== -1) {
    log('--- 4000 chars from first <tbody> ---');
    log(khu.text.slice(tbodyIdx, tbodyIdx + 4000));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, '## diag-fix output\n\n```\n' + out.join('\n') + '\n```\n', { flag: 'a' });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
