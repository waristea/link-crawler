# link-crawler
Simple web crawler that uses dynamic browser (Puppeteer) which fetches all links on a page and its children.


## How to use:
1. Clone the repo and run `npm install puppeteer yargs`
2. Create a file that lists scrapped targets
3. Run `node index.js ./targets.txt ./results.txt`
