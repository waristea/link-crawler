'use strict';

const url = require('url');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Read targets from a file
async function readTargets(filePath){
  if (!filePath) return ['https://www.youtube.com'];

  var targets =  fs.readFileSync(filePath).toString().split("\n");
  targets = await targets.filter(Boolean);
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

// Get base url
function formatURL(href, base) {
  try {
    return url.format(new URL(href), { fragment: false });
  } catch (e) {
    return url.format(new URL(href, base), { fragment: false });
  }
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

readTargets(targetPath).then((targets,resultPath)=>{
  console.log(targets);
  scrap(targets).then(urls => {
    writeResults(new Set(urls), resultPath, true)
  });
});
