import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import {appendFile,mkdir,writeFile} from 'node:fs/promises';
const chrome=await chromeLauncher.launch({chromePath:process.env.CHROME_PATH||undefined,chromeFlags:['--headless','--no-sandbox','--disable-gpu']});
try{
 const output=await lighthouse('http://127.0.0.1:4177/zh/',{port:chrome.port,output:'html',onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});
 await mkdir('reports',{recursive:true});await writeFile('reports/lighthouse.html',output.report);
 const lines=['## Mobile Lighthouse (advisory)','Lab scores vary across runs and do not replace real-user metrics.'];
 for(const [name,item] of Object.entries(output.lhr.categories))lines.push(`- ${name}: ${Math.round(item.score*100)}/100`);
 const report=lines.join('\n')+'\n';console.log(report);await writeFile('reports/lighthouse.md',report);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
}finally{await chrome.kill()}
