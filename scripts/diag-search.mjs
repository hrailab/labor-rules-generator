// TEMP diagnostic script — tries korea.kr search endpoint for remaining unmatched MOCK_TRENDS topics.
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// korea.kr policy news search — try common query param patterns.
const CANDIDATE_SEARCH_URLS = [
  (q) => `https://www.korea.kr/search/total.do?srchWord=${encodeURIComponent(q)}`,
  (q) => `https://www.korea.kr/news/policyNewsList.do?srchWord=${encodeURIComponent(q)}`,
];

async function tryUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    return { status: res.status, len: html.length, snippet: html.slice(0, 500) };
  } catch (e) {
    return { error: e.message };
  }
}

const queries = ['창업중심대학', '대학혁신지원사업', '글로컬대학', '경력창업지원사업', '채용형 인턴제', '수의과대학 실습기자재', '대학 시설 안전관리'];

const results = {};
for (const q of queries) {
  console.log(`\n### query: ${q}`);
  for (const build of CANDIDATE_SEARCH_URLS) {
    const url = build(q);
    const r = await tryUrl(url);
    console.log(`  ${url}`);
    console.log(`  -> status=${r.status || 'ERR'} len=${r.len || 0} ${r.error || ''}`);
    if (r.snippet) console.log(`  snippet: ${r.snippet.replace(/\s+/g,' ').slice(0,200)}`);
    await new Promise(r => setTimeout(r, 300));
  }
}

console.log('\nDone.');
