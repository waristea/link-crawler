'use strict';

const url = require('url');
const fs = require('fs');
const puppeteer = require('puppeteer');
var yargs = require('yargs');
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color

function printVerbose(text, verboseLevel=verbose){
  if (verboseLevel==1){
    console.log(text);
  }
}

// Read targets from a file
async function readTargets(targetInput){
  if (!targetInput) return ['https://www.youtube.com'];

  if (fs.existsSync(targetInput)) {
    var targets =  fs.readFileSync(targetInput).toString().split("\n");
    return await targets.filter(Boolean); // Filter for empty string
  } else{
      throw new Error("File does not exists: "+targetInput);
  }
}

// Write results to a file
function writeResults(urls_set, resultPath){
  resultPath = resultPath ? resultPath : './results.txt';

  fs.writeFileSync(resultPath, "");
  urls_set.forEach((item) => {
    fs.appendFileSync(resultPath, item+"\n");
  });

  printVerbose(urls_set);
  printVerbose("Output is written to "+resultPath);
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
    printVerbose("Irregular URL Format");
  }
  return url.join("/");
}

// Filter for blacklist (result will still be recorded, but wont be crawled)
function blacklistFilter(urls, blacklistPath){ // hard match
  return readTargets(blacklistPath).then(blacklisted => { // for every blacklist entry
    return urls.filter(url => { // filter urls for those entries
      return !blacklisted.includes(url);
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
    printVerbose("-".repeat(100));
    printVerbose("["+target+"]"+" scrapped");
  }

  await browser.close();
  return urls;
}

// arg: [alias, nargs, isrequired, defaultValue]
const argsMap = {
  't':['targets', 'Input file path', true, './targets.txt'],
  'u':['url', 'Targets array list', false, ['https://www.twitter.com']], // unhandled
  'r':['results', 'Output file path', false, './results.txt'],
  'd':['depth', 'Crawling depth', false, 1], // unhandled
  'b':['blacklist', 'Blacklist file path', false, './blacklist.txt'],
  'v':['verbose', 'Verbose logging', false, true]
}

function cliHandler(yargs, argsMap){
  const targetOptKW = 't';
  const resultOptKW = 'r';
  // https://github.com/yargs/yargs/blob/master/docs/examples.md
  // generate aliases and descriptions
  for (const [key, value] of Object.entries(argsMap)){
    yargs.alias(key,value[0]);
    yargs.describe(key,value[1]);
  }

  yargs.usage('Usage: node $0 -'+targetOptKW+' ./targets.txt -'+resultOptKW+' ./results.txt [options]');
  yargs.help('h');
  yargs.alias('h','help')
  yargs.demandOption([targetOptKW]);
  yargs.boolean(['v']);
  yargs.epilog('-GoMerchants InfoSec 2020-');


  return yargs;
}

// Main
async function main(targetPath, resultPath, blacklistPath, depth, verbose){
  try { // see if target file exists
    var targets = await readTargets(targetPath);
  } catch(err) {
    console.log(err.message);
    return;
  }

  // loop from here
  var currDepth = 1;
  // while(currDepth<(depth+1) && targets.length>0){
  printVerbose("Depth "+currDepth+" commenced");
  printVerbose("-".repeat(100));

  var results = await scrap(targets);
  var resultSet = new Set(results);
  var resultBase = new Set(Array.from(resultSet).map(url => getBase(url)));
  var resultFiltered = await blacklistFilter(Array.from(resultBase), blacklistPath);

  writeResults(resultSet, resultPath);
  printVerbose("-".repeat(100));
  printVerbose("Depth : "+currDepth);
  printVerbose("Base Url Set :");
  printVerbose(await Array.from(resultBase));
  printVerbose("Filtered Url Set : ");
  printVerbose(resultFiltered);
  printVerbose("=".repeat(100));

  currDepth++;
  // targets = resultFiltered;}
}

// Execution
yargs = cliHandler(yargs, argsMap);

const args = yargs.argv;
const targetPath = args.t ? args.t.toString() : undefined;
const resultPath = args.o ? args.o.toString() : undefined;
const blacklistPath = args.b ? args.b.toString() : undefined;
const depth = args.d ? args.d.toString() : 1;
const verbose = args.v ? args.v.toString() : 1; // accessed globally by printVerbose

main(targetPath, resultPath, blacklistPath, depth);
