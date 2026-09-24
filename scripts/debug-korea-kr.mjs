const url = 'https://www.korea.kr/news/ministryNewsHome.do';
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }
});
console.log('STATUS', res.status);
const html = await res.text();
console.log('LENGTH', html.length);
console.log('---HEAD SNIPPET (0-2500)---');
console.log(html.slice(0, 2500));
console.log('---SAMPLE <a> TAGS CONTAINING /news/ OR /briefing/---');
const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]*(?:news|briefing|dept)[^"]*)"[^>]*>([\s\S]{0,120}?)<\/a>/gi)].slice(0, 40);
linkMatches.forEach(m => console.log(JSON.stringify(m[1]), '|', m[2].replace(/\s+/g,' ').trim().slice(0,80)));
console.log('---LOOK FOR RSS/API HINTS---');
const rssMatches = [...html.matchAll(/(rss|openapi|api)[^"'\s>]*/gi)].slice(0, 20).map(m=>m[0]);
console.log(JSON.stringify([...new Set(rssMatches)]));
console.log('---LOOK FOR LIST CONTAINER CLASS NAMES (ministry/news like)---');
const classMatches = [...html.matchAll(/class="([^"]*(?:news|list|dept|ministry|card|item)[^"]*)"/gi)].slice(0, 40).map(m=>m[1]);
console.log(JSON.stringify([...new Set(classMatches)]));
