const HOME = 'https://www.korea.kr/news/ministryNewsHome.do';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const homeRes = await fetch(HOME, { headers: { 'User-Agent': UA } });
const homeHtml = await homeRes.text();
console.log('HOME STATUS', homeRes.status, 'LENGTH', homeHtml.length);

console.log('---ALL repCode MAPPINGS (dept name near repCode)---');
const repMatches = [...homeHtml.matchAll(/repCode=([A-Z0-9]+)[^"]*"[^>]*>\s*<span class="sr-only">([^<]+)<\/span>/g)];
repMatches.forEach(m => console.log(m[1], '=>', m[2]));
console.log('count:', repMatches.length);

console.log('---RAW SNIPPET around first "ministry_lst" occurrence---');
const idx = homeHtml.indexOf('ministry_lst');
console.log(homeHtml.slice(Math.max(0, idx - 200), idx + 3000));

// target ministries repCodes we still need to confirm
const TARGETS = ['기획재정부', '교육부', '과학기술정보통신부', '중소벤처기업부', '농림축산식품부'];
console.log('---TARGET MINISTRY repCode LOOKUP---');
TARGETS.forEach(name => {
  const re = new RegExp('repCode=([A-Z0-9]+)[^"]*"[^>]*>\\s*<span class="sr-only">' + name + '\\s*뉴스<\\/span>');
  const m = homeHtml.match(re);
  console.log(name, '=>', m ? m[1] : 'NOT FOUND');
});
