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

function snippetAround(text, marker, before = 200, after = 800) {
  const i = text.indexOf(marker);
  if (i === -1) return '(marker not found)';
  return text.slice(Math.max(0, i - before), i + after);
}

const out = [];
const log = (s) => { console.log(s); out.push(s); };

async function main() {
  // 1) Retry the 5 named ministries + policyNewsList.do to see if yesterday's "fetch failed" was transient
  const RETRY_TARGETS = [
    ['기획예산처', 'https://www.korea.kr/news/ministryNewsList.do?repCode=A00040&pWiseMinistry=ministryNews'],
    ['교육부', 'https://www.korea.kr/news/ministryNewsList.do?repCode=A00002&pWiseMinistry=ministryNews'],
    ['정책뉴스 통합피드', 'https://www.korea.kr/news/policyNewsList.do'],
  ];
  log('## 1) korea.kr retry test\n');
  for (const [name, url] of RETRY_TARGETS) {
    const r = await get(url);
    log(`${name}: ok=${r.ok} status=${r.status} ms=${r.ms} len=${r.len} ${r.error ? 'error=' + r.error : ''}`);
    await new Promise(res => setTimeout(res, 500));
  }

  // 2) policyNewsList.do structure — find how items are marked up (may differ from ministryNewsList.do)
  log('\n## 2) policyNewsList.do structure\n');
  const unified = await get('https://www.korea.kr/news/policyNewsList.do');
  log(`status=${unified.status} len=${unified.text.length}`);
  await writeFile('policyNewsList.html', unified.text);
  log('saved full HTML to policyNewsList.html (artifact)');
  log('--- snippet around "goDetailView" ---');
  log(snippetAround(unified.text, 'goDetailView', 100, 900));
  log('--- snippet around "class=\\"lst' + '"' + ' (possible list container) ---');
  log(snippetAround(unified.text, 'class="lst', 50, 600));
  log('--- count of <li> tags ---');
  log('li count: ' + (unified.text.match(/<li/g) || []).length);
  log('--- count of "onclick=" occurrences ---');
  log('onclick count: ' + (unified.text.match(/onclick=/g) || []).length);

  // 3) korea.kr pagination probe (cautious — test one param at a time with delay)
  log('\n## 3) korea.kr pagination probe\n');
  const pageParams = ['pageIndex=2', 'page=2', 'currentPage=2', 'pageNo=2'];
  for (const p of pageParams) {
    const url = `https://www.korea.kr/news/policyNewsList.do?${p}`;
    const r = await get(url);
    log(`?${p}: ok=${r.ok} status=${r.status} ms=${r.ms} len=${r.len} ${r.error ? 'error=' + r.error : ''}`);
    await new Promise(res => setTimeout(res, 800));
  }

  // 4) 경희대/동국대/이화여대 raw structure
  log('\n## 4) 경희대/동국대/이화여대 structure\n');
  const schools = [
    ['경희대', 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316'],
    ['동국대', 'https://www.dongguk.edu/article/INTEXNOTICE/list'],
    ['이화여대', 'https://www.ewha.ac.kr/ewha/news/ewha-news.do'],
  ];
  for (const [name, url] of schools) {
    const r = await get(url);
    log(`\n--- ${name}: ok=${r.ok} status=${r.status} len=${r.len} ---`);
    await writeFile(`${name === '경희대' ? 'khu' : name === '동국대' ? 'dgu' : 'ewha'}.html`, r.text);
    log(`saved full HTML (artifact)`);
    // dump a broad slice of body to find list markup
    const bodyIdx = r.text.indexOf('<body');
    log('--- body slice (first 3000 chars from <body) ---');
    log(r.text.slice(bodyIdx, bodyIdx + 3000));
    await new Promise(res => setTimeout(res, 500));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, '## diag-fix output\n\n```\n' + out.join('\n') + '\n```\n', { flag: 'a' });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
