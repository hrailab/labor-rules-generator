const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const urls = [
  'https://www.korea.kr/news/policyNewsView.do?newsId=148970973&repCode=A00040&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972173&repCode=A00032&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972427&repCode=A00002&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972061&repCode=A00033&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972119&repCode=A00002&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148971747&repCode=A00033&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148971735&repCode=A00032&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148970725&repCode=A00040&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148971836&repCode=A00002&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972310&repCode=A00008&repCodeType=정부부처&pWiseMinistry=ministryNews',
  'https://www.korea.kr/news/policyNewsView.do?newsId=148972575',
  'https://www.skku.edu/skku/campus/skk_comm/notice01.do?mode=view&articleNo=140164',
  'https://www.skku.edu/skku/campus/skk_comm/notice01.do?mode=view&articleNo=140158',
  'https://www.newshyu.com/news/articleView.html?idxno=1026403',
  'https://www.newshyu.com/news/articleView.html?idxno=1026380',
  'https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316',
  'https://www.dongguk.edu/article/INTEXNOTICE/list',
  'https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=51079',
  'https://oias.cau.ac.kr/cauoie/under/notice.do?mode=view&articleNo=46498',
  'https://www.ewha.ac.kr/ewha/news/ewha-news.do',
];

for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const html = await res.text();
    const notFoundHint = /존재하지\s*않|삭제된\s*게시|찾을\s*수\s*없|해당\s*게시물이\s*없|페이지를?\s*찾지\s*못/.test(html);
    console.log(`${res.status} ${notFoundHint ? '[NOT-FOUND-TEXT]' : '[OK]'} ${url}`);
  } catch (e) {
    console.log(`ERROR ${e.message} ${url}`);
  }
  await new Promise(r => setTimeout(r, 250));
}
