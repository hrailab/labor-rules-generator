const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

const url = 'https://www.korea.kr/news/policyNewsView.do?newsId=148972533';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('status:', res.status, 'length:', html.length);

const patterns = [
  /담당\s*부처[^<]*<[^>]*>([\s\S]{1,30}?)</,
  /발표\s*기관[^<]*<[^>]*>([\s\S]{1,30}?)</,
  /class="[^"]*dept[^"]*"[^>]*>([\s\S]{1,40}?)</gi,
  /class="[^"]*source[^"]*"[^>]*>([\s\S]{1,80}?)<\/(?:span|div|p)>/gi,
  /class="[^"]*write[^"]*"[^>]*>([\s\S]{1,120}?)<\/(?:span|div|p)>/gi,
];
for (const p of patterns) {
  const matches = [...html.matchAll(new RegExp(p, p.flags.includes('g') ? p.flags : p.flags + 'g'))];
  console.log('pattern', p.source.slice(0,30), '-> ', matches.length, 'matches');
  matches.slice(0,3).forEach(mm => console.log('   ', stripTags(mm[1])));
}

const metaMatches = [...html.matchAll(/<meta[^>]+(?:section|department|author)[^>]+>/gi)];
console.log('\nmeta candidates:');
metaMatches.forEach(mm => console.log('  ', mm[0]));
