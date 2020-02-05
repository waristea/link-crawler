'use strict';

const url = require('url');
const fs = require('fs');
const puppeteer = require('puppeteer');

function formatURL(href, base) {
  try {
    return url.format(new URL(href), { fragment: false });
  } catch (e) {
    return url.format(new URL(href, base), { fragment: false });
  }
}

async function scrap(){
  const browser = await puppeteer.launch({ dumpio: true });
  const page = await browser.newPage();
  await page.exposeFunction('formatURL', formatURL);

  const response = await page.goto('http://test.com');
  await page.waitFor(5000);
  const pageUrl = page.url();

  var urls = [];
  urls = await page.evaluate(async (pageUrl, urls) => {
    const anchors = Array.from(document.querySelectorAll('a'));

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      const hrefUrl = await formatURL(href, pageUrl);
      urls.push(hrefUrl);
      //console.log(hrefUrl); // isnt used because puppeteer overrides log output
    }
    return urls;
  }, pageUrl, urls);

  await page.close();
  await browser.close();
  //console.log(urls);
  return urls;
}

const urls = scrap().then(urls => {
  console.log(urls);
  console.log("file is written to /tmp/test.txt");
  fs.writeFileSync('/tmp/test.txt', urls);
  return urls;
});
