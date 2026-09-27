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

const out = [];
const log = (s) => { console.log(s); out.push(s); };

function allIndicesOf(text, marker) {
  const idxs = [];
  let i = text.indexOf(marker);
  while (i !== -1 && idxs.length < 5) {
    idxs.push(i);
    i = text.indexOf(marker, i + 1);
  }
  return idxs;
}

async function main() {
  // 1) policyNewsList.do — count real ITEM_RE matches (same regex as fetchMinistryItems)
  log('## 1) policyNewsList.do ITEM_RE match test\n');
  const unified = await get('https://www.korea.kr/news/policyNewsList.do');
  const ITEM_RE = /<a\s+href="([^"]+)"\s+onclick="goDetailView\([^)]*\);return false;"\s*>([\s\S]*?)<\/a>\s*<\/li>/g;
  const matches = [...unified.text.matchAll(ITEM_RE)];
  log('ITEM_RE match count: ' + matches.length);
  if (matches.length) {
    log('first match href: ' + matches[0][1]);
    log('first match inner (first 300 chars): ' + matches[0][2].slice(0, 300));
  } else {
    // find where goDetailView is actually USED (not the function def) by looking for '(url,' style calls
    const usageIdxs = allIndicesOf(unified.text, 'onclick="goDetailView(');
    log('onclick="goDetailView( occurrences: ' + usageIdxs.length);
    if (usageIdxs.length) {
      const i = usageIdxs[0];
      log('--- context around first real usage ---');
      log(unified.text.slice(Math.max(0, i - 300), i + 500));
    } else {
      // maybe the news items are rendered via a totally different pattern; look for repeated "newsId=" occurrences
      const newsIdIdxs = allIndicesOf(unified.text, 'newsId=');
      log('newsId= occurrences: ' + newsIdIdxs.length);
      if (newsIdIdxs.length) {
        const i = newsIdIdxs[0];
        log('--- context around first newsId= ---');
        log(unified.text.slice(Math.max(0, i - 500), i + 300));
      }
    }
  }

  // 2) pageIndex pagination re-check with delay + verify item ids differ from page 1
  log('\n## 2) pageIndex re-check\n');
  const p1 = await get('https://www.korea.kr/news/policyNewsList.do');
  await new Promise(r => setTimeout(r, 800));
  const p2 = await get('https://www.korea.kr/news/policyNewsList.do?pageIndex=2');
  log(`page1 len=${p1.len} ok=${p1.ok}`);
  log(`page2 len=${p2.len} ok=${p2.ok}`);
  const ids1 = [...p1.text.matchAll(/newsId=(\d+)/g)].map(m => m[1]).slice(0, 5);
  const ids2 = [...p2.text.matchAll(/newsId=(\d+)/g)].map(m => m[1]).slice(0, 5);
  log('page1 first 5 newsIds: ' + ids1.join(','));
  log('page2 first 5 newsIds: ' + ids2.join(','));

  // 3) University board structures — search for board-specific markers deep in the page
  log('\n## 3) University board structure search\n');
  const targets = [
    ['경희대', 'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316', ['BMSR00040', 'list_', 'board_', '게시판', 'articleNo', 'boardList', 'tbody']],
    ['동국대', 'https://www.dongguk.edu/article/INTEXNOTICE/list', ['INTEXNOTICE', 'article', 'list-item', 'boardList', '<table', 'goto']],
    ['이화여대', 'https://www.ewha.ac.kr/ewha/news/ewha-news.do', ['ewha-news', 'articleNo', 'newsList', 'board', '<table', 'jwxe']],
  ];
  for (const [name, url, markers] of targets) {
    const r = await get(url);
    log(`\n--- ${name} (len=${r.len}) ---`);
    for (const mk of markers) {
      const idxs = allIndicesOf(r.text, mk);
      log(`  marker "${mk}": ${idxs.length} occurrence(s)${idxs.length ? ' @ ' + idxs.slice(0,3).join(',') : ''}`);
    }
    // dump context around the first occurrence of the most-specific marker with matches, prioritizing later markers
    let shown = false;
    for (const mk of markers.slice().reverse()) {
      const i = r.text.indexOf(mk);
      if (i !== -1 && !shown) {
        log(`  --- context around "${mk}" ---`);
        log('  ' + r.text.slice(Math.max(0, i - 200), i + 1500).replace(/\n/g, '\n  '));
        shown = true;
      }
    }
    await new Promise(res => setTimeout(res, 500));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, '## diag-fix output\n\n```\n' + out.join('\n') + '\n```\n', { flag: 'a' });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
