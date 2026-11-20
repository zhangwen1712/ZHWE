import {chromium,devices} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {appendFile,mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const context=await browser.newContext({...devices['iPhone 13'],permissions:[]});
await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const pages=['/zh/','/zh/2025/06/01/端午假期/','/zh/search/','/zh/links/','/zh/建站日志/','/zh/map/'];
const lines=['## Mobile accessibility (advisory)','This is an automated scan; manual review is still needed.'];
for(const path of pages){
 const page=await context.newPage();try{
  await page.goto('http://127.0.0.1:4177'+path,{waitUntil:'domcontentloaded'});
  const results=await new AxeBuilder({page}).analyze();
  lines.push(`- ${path}: ${results.violations.length} rules flagged (${results.violations.reduce((n,v)=>n+v.nodes.length,0)} elements)`);
  for(const item of results.violations)lines.push(`  - ${item.impact||'unknown'}: ${item.id} — ${item.help}`);
 }catch(error){lines.push(`- ${path}: scan failed: ${error.message}`)}finally{await page.close()}
}
await browser.close();const report=lines.join('\n')+'\n';console.log(report);await mkdir('reports',{recursive:true});await writeFile('reports/accessibility.md',report);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
