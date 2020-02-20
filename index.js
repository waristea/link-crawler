'use strict';

const url = require('url');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Read targets from a file
async function readTargets(filePath, default){
  if (!filePath) return ['https://www.youtube.com'];

  var targets =  fs.readFileSync(filePath).toString().split("\n");
  targets = await targets.filter(Boolean); // Filter for empty string
  return await targets
}

// Write results to a file
function writeResults(urls_set, resultPath, is_printed){
  resultPath = resultPath ? resultPath : './results.txt';

  fs.writeFileSync(resultPath, "");
  urls_set.forEach((item) => {
    fs.appendFileSync(resultPath, item+"\n");
  });

  if (is_printed) console.log(urls_set);

  console.log("file is written to "+resultPath);
}

// Get combine with base url if not
function formatURL(href, base) {
  try {
    return url.format(new URL(href), { fragment: false });
  } catch (e) {
    return url.format(new URL(href, base), { fragment: false });
  }
}

// Get base url
function getBase(url){
  var normalizedUrl = urlNormalize(url);

  return normalizedUrl.split("/").slice(0,3).join("/") // i.e. http://www.google.com/search?q=1337
}

// Normalize url
function urlNormalize(url){
  url = url.split("/");
  try{
    if (url.length == 0) return "http://"+url[0] // i.e. www.google.com
  } catch (e){
    console.log("Irregular URL Format")
  }
  return url.join("/")
}

// Filter for blacklist (result will still be recorded, but wont be crawled)
function blacklistFilter(urls, blacklistPath){ // hard match
  return readTargets(blacklistPath).then(b => {
    return urls.filter((u) => {
      return !b.includes(u);
    });
  });
}

// Scrap
async function scrap(targets){
  const browser = await puppeteer.launch({ dumpio: true });

  var urls = []; // not a set just in case number of occurence needs to be counted

  for (const target of targets){
    const page = await browser.newPage(); // create new page
    await page.exposeFunction('formatURL', formatURL);
    const response = await page.goto(target); // access target
    await page.waitFor(5000);
    const pageUrl = page.url();

    var curr_page_urls = []

    curr_page_urls = await page.evaluate(async (pageUrl, curr_page_urls) => {
      const anchors = Array.from(document.querySelectorAll('a')); // get <a> tag

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href'); // get href attr
        const hrefUrl = await formatURL(href, pageUrl); // get base url
        curr_page_urls.push(hrefUrl);
      }
      return curr_page_urls;
    }, pageUrl, curr_page_urls);

    await page.close();

    urls = urls.concat(curr_page_urls);
    console.log("["+target+"]"+" is scrapped");
  }

  await browser.close();
  //console.log(urls);
  return urls;
}

// Main
const args = process.argv.slice(2);
const targetPath = args[0] ? args[0].toString() : undefined;
const resultPath = args[1] ? args[1].toString() : undefined;
const blacklistPath = args[2] ? args[2].toString() : undefined;
const depth = args[3] ? args[3].toString() : undefined;

readTargets(targetPath).then((targets,resultPath)=>{
  console.log(targets);
  scrap(targets).then(urls => {
    var urlSet = new Set(urls);
    writeResults(urlSet, resultPath, true);

    var baseUrls = new Set();
    urlSet.forEach(url => baseUrls.add(getBase(url))); // get base only
    console.log("Base urls:");
    console.log(Array.from(baseUrls));

    console.log("Filtered:");
    blacklistFilter(Array.from(baseUrls), "./blacklist.txt").then(u => console.log(u));
  });
});
