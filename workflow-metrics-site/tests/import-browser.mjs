// Real-browser regression. Requires Playwright and a static server serving dist/.
// All GitHub API requests are intercepted; this test never publishes to a repository.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||process.env.WORKFLOW_BROWSER_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.WORKFLOW_BROWSER_CHANNEL||'chrome'});
const context=await browser.newContext({acceptDownloads:true});
const page=await context.newPage(),errors=[],puts=[];let denyWrite=false;
page.on('pageerror',e=>errors.push(e.message));
const baseURL=process.argv[3]||process.env.WORKFLOW_BROWSER_URL||'http://localhost:4173/';
const raw=(id='浏览器回归运行')=>({schema_version:2,run_id:id,updated_at_utc:'2026-10-12T02:00:00Z',started_at_utc:'2026-10-12T01:00:00Z',execution_context:{agent:'browser-test',model:'fixture-model',token:'never-store-this'},phases:{1:{name:'设计',last_verdict:'PASS',opened_at_utc:'2026-10-12T01:00:00Z',closed_at_utc:'2026-10-12T01:30:00Z',elapsed_seconds:1800,human_wait_excluded_seconds:0,effective_elapsed_seconds:1800,gate_attempts:2,fail_attempts:1,pass_attempts:1,attempt_history:[{id:'test-fail',verdict:'FAIL',gate:'gate_design.py',reason:'缺少 BUILD.gn 字段；https://oauth:fictional-private@gitcode.com/a；172.20.0.2 /home/alice/code；<img src=x onerror="window.importXss=true">',fixes:[{root_cause:'字段遗漏',action:'补充配置',verification_verdict:'PASS'}]}]}},timing:{history_complete:true,initialization_count:1}});
const file=d=>({name:'workflow_metrics.json',mimeType:'application/json',buffer:Buffer.from(typeof d==='string'?d:JSON.stringify(d))});
try{
 await page.goto(baseURL);await page.waitForFunction(()=>document.querySelector('#source-info').textContent.includes('已发布'));
 const base=await page.evaluate(async()=>await (await fetch('./data.json')).json());const n=base.runs.length;
 await page.getByRole('button',{name:'导入 JSON / 管理员发布'}).click();
 await page.locator('#import-files').setInputFiles([file(raw()),{...file('{bad-json fictional-private'),name:'broken.json'}]);
 await page.waitForFunction(()=>!document.querySelector('#save-import').disabled);
 assert.match(await page.locator('#import-errors').textContent(),/broken.json/);
 const preview=await page.locator('#import-preview-rows').textContent();assert.match(preview,/BUILD.gn/);assert.match(preview,/补充配置/);assert.ok(!preview.includes('fictional-private'));assert.ok(!preview.includes('172.20.0.2'));assert.ok(!preview.includes('/home/alice'));
 assert.equal(await page.evaluate(()=>window.importXss),undefined);
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});
 await page.locator('#save-import').click();assert.match(await page.locator('#import-errors').textContent(),/未应用/);assert.equal(await page.locator('#run-count').textContent(),String(n));
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
 await page.locator('#save-import').click();assert.equal(await page.locator('#run-count').textContent(),String(n+1));assert.ok(await page.locator('#import-errors').isHidden());
 await page.locator('#close-import').click();await page.reload();await page.waitForFunction(n=>document.querySelector('#run-count').textContent===String(n+1),n);
 await page.getByRole('button',{name:'导入 JSON / 管理员发布'}).click();assert.match(await page.locator('#import-preview-rows').textContent(),/浏览器回归运行/);
 const downloading=page.waitForEvent('download');await page.locator('#export-import').click();const download=await downloading;assert.equal(download.suggestedFilename(),'workflow-metrics-imports.json');
 await page.locator('#admin-panel summary').click();await page.locator('#admin-token').fill('fictional-publish-token');
 await page.route('https://api.github.com/**',async route=>{
  const req=route.request(),url=req.url();let body;
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,PUT,OPTIONS'}});return;}
  if(req.method()==='PUT'){body=denyWrite?{message:'Resource not accessible by personal access token fictional-private'}:{commit:{sha:'test-commit'}};puts.push(JSON.parse(req.postData()));}
  else if(url.endsWith('/user'))body={login:'test-admin'};
  else if(url.endsWith('/repos/mgces/AI-AR-workflow'))body={permissions:{push:true}};
  else body={sha:'base-sha',encoding:'base64',content:Buffer.from(JSON.stringify(base),'utf8').toString('base64')};
  await route.fulfill({status:req.method()==='PUT'&&denyWrite?403:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'x-github-request-id','x-github-request-id':'ABCD:1234:5678:9ABC'},body:JSON.stringify(body)});
 });
 await page.locator('#prepare-publish').click();await page.waitForFunction(()=>!document.querySelector('#confirm-publish').disabled);
 assert.equal(puts.length,0);assert.match(await page.locator('#publish-review').textContent(),/1 条新增或更新/);
 await page.locator('#confirm-publish').click();await page.waitForFunction(()=>document.querySelector('#publish-result').textContent.includes('已提交'));
 assert.equal(puts.length,1);const shared=JSON.parse(Buffer.from(puts[0].content,'base64').toString('utf8'));assert.equal(shared.runs.length,n+1);assert.ok(!JSON.stringify(shared).includes('fictional-'));assert.equal(await page.locator('#admin-token').inputValue(),'');
 const cache=await page.evaluate(()=>JSON.stringify(localStorage));assert.ok(!cache.includes('fictional-'));assert.ok(!cache.includes('never-store-this'));
 denyWrite=true;await page.locator('#admin-token').fill('read-only-token');await page.locator('#prepare-publish').click();await page.waitForFunction(()=>!document.querySelector('#confirm-publish').disabled);
 assert.match(await page.locator('#publish-review').textContent(),/实际提交时验证/);
 await page.locator('#confirm-publish').click();await page.waitForFunction(()=>document.querySelector('#publish-result').textContent.includes('HTTP 403'));
 assert.match(await page.locator('#publish-result').textContent(),/Contents.*Read and write/);assert.ok(!(await page.locator('#publish-result').textContent()).includes('fictional-private'));assert.equal(await page.locator('#admin-token').inputValue(),'');
 // Permission failure never offers final publication and clears the credential field.
 await page.unroute('https://api.github.com/**');await page.route('https://api.github.com/**',route=>route.fulfill({status:401,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"message":"fictional-private"}'}));
 await page.locator('#admin-token').fill('expired-token');await page.locator('#prepare-publish').click();await page.waitForFunction(()=>document.querySelector('#admin-token').value==='');assert.ok(await page.locator('#confirm-publish').isDisabled());assert.ok(!(await page.locator('#publish-review').textContent()).includes('fictional-private'));
 await page.locator('#close-import').click();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'导入 JSON / 管理员发布'}).click();assert.ok(await page.locator('#import-files').isVisible());
 page.once('dialog',d=>d.accept());await page.locator('#clear-import').click();assert.equal(await page.locator('#run-count').textContent(),String(n));
 await page.locator('#close-import').click();await page.goto(baseURL+'optimization.html');await page.getByRole('link',{name:'导入运行 JSON'}).click();await page.waitForFunction(()=>document.querySelector('#import-dialog').open);
 assert.deepEqual(errors,[]);console.log('Browser regression passed: import, redaction, cache, refresh, backup, admin review/publish, permission denial, clear and mobile navigation.');
}finally{await context.close();await browser.close();}
