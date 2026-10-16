import {validateSnapshot,mergeSnapshot,previewChanges,MAX_FILE_BYTES} from './import-data.mjs';

export const REPOSITORY='mgces/AI-AR-workflow';
export const BRANCH='main';
const repoURL=`https://api.github.com/repos/${REPOSITORY}`;
const fileURL=`${repoURL}/contents/docs/public/workflow-metrics/data.json`;
const encode=text=>{let binary='';const bytes=new TextEncoder().encode(text);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
const decode=text=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));

// Every authenticated request goes to a fixed GitHub API URL; redirects are refused.
async function request(token,url,fetcher,options={}){
 if(typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))throw Error('请填写本次发布的 GitHub 授权');
 let response;
 try{response=await fetcher(url,{...options,redirect:'error',cache:'no-store',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token.trim()}`,'X-GitHub-Api-Version':'2026-03-10',...(options.method==='PUT'?{'Content-Type':'application/json'}:{}),...options.headers}});}catch{throw Error('无法连接 GitHub，请检查网络后重试');}
 if(!response.ok){
  // Classify GitHub's response, but never echo arbitrary response text or credentials.
  let body;try{body=await response.json();}catch{body={};}
  const detail=typeof body?.message==='string'?body.message.toLowerCase():'';
  const header=name=>response.headers?.get?.(name)||'';
  const rawId=header('x-github-request-id');
  const requestId=/^[a-f0-9:]{8,100}$/i.test(rawId)?rawId.toUpperCase():'';
  const writing=options.method==='PUT';
  let reason;
  if(response.status===401)reason='GitHub 授权无效或已过期，请重新填写有效 Token';
  else if(response.status===429||response.status===403&&(header('x-ratelimit-remaining')==='0'||/rate limit|abuse detection/.test(detail)))reason='GitHub API 请求被限流或额度耗尽，请稍后重新检查共享差异再发布';
  else if([403,409,422].includes(response.status)&&/protected branch|repository rule|pull request|gh006|gh013|push declined/.test(detail))reason='main 分支规则拒绝直接写入，请按仓库要求通过 PR 提交，不会绕过分支限制';
  else if(response.status===409)reason='远端已更新，请重新检查共享差异后再发布；本次没有覆盖远端修改';
  else if(response.status===403&&writing&&/resource not accessible|permission|write access|not authorized/.test(detail))reason='GitHub 拒绝这枚 Token 的写入授权：请编辑 fine-grained Token，Resource owner 选 mgces，仓库选 AI-AR-workflow，并将 Contents 设为 Read and write。账号可写不代表 Token 可写';
  else if(response.status===404&&writing)reason='写入目标 mgces/AI-AR-workflow 不可访问：请检查 Token 的仓库授权范围及 Contents: Read and write；此前能读取公开快照不能证明可写';
  else if(response.status===403&&writing)reason='GitHub 拒绝写入共享快照。请先检查 Token 是否授权 mgces/AI-AR-workflow 的 Contents: Read and write；若权限正确，再检查仓库规则及组织策略';
  else if(response.status===403||response.status===404)reason='无法读取共享仓库，请检查 Token 的仓库授权范围和访问策略';
  else if(response.status===422)reason='GitHub 拒绝提交，请检查 main 分支规则或重新检查共享差异';
  else reason='GitHub 请求失败，请稍后重新检查共享差异';
  const error=Error(`${reason}（HTTP ${response.status}${requestId?'；请求编号 '+requestId:''}）`);
  error.status=response.status;error.requestId=requestId;throw error;
 }

 return response;
}
export async function preparePublish(token,imports,fetcher=fetch){
 const incoming=validateSnapshot({schema_version:1,runs:imports}).runs;
 if(!incoming.length)throw Error('请先选择或保存要发布的 JSON');
 const user=await (await request(token,'https://api.github.com/user',fetcher)).json();
 const repo=await (await request(token,repoURL,fetcher)).json();
 if(!repo.permissions?.push)throw Error('当前账号没有该仓库的写入权限');
 const file=await (await request(token,fileURL+'?ref=main',fetcher)).json();
 if(typeof file.sha!=='string'||!file.sha||file.size>MAX_FILE_BYTES)throw Error('共享文件无法读取或超过 10 MB，请联系管理员');
 let text;
 try{
  if(file.encoding==='base64')text=decode(file.content);
  else if(file.encoding==='none')text=await (await request(token,fileURL+'?ref=main',fetcher,{headers:{Accept:'application/vnd.github.raw+json'}})).text();
  else throw Error();
  if(new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error();
 }catch{throw Error('共享快照格式无法读取，请联系管理员');}
 let base;try{base=validateSnapshot(JSON.parse(text));}catch{throw Error('共享快照格式不兼容，尚未上传任何数据');}
 const snapshot=mergeSnapshot(base,incoming);
 snapshot.generated_at=new Date().toISOString();snapshot.source_label='共享运行指标';snapshot.source_count=snapshot.runs.length;
 return {tokenWriteVerified:false,sha:file.sha,account:typeof user.login==='string'?user.login:'管理员',changes:previewChanges(base.runs,incoming),snapshot};
}
export async function commitPublish(token,draft,fetcher=fetch){
 if(!draft?.sha||typeof draft.sha!=='string'||!draft.changes?.some(c=>c.action==='新增'||c.action==='更新'))throw Error('没有新增或更新的运行，请先重新检查共享差异');
 const snapshot=validateSnapshot(draft.snapshot),text=JSON.stringify(snapshot,null,2)+'\n';
 if(new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error('共享快照超过 10 MB，请联系管理员归档历史记录');
 const response=await request(token,fileURL,fetcher,{method:'PUT',body:JSON.stringify({message:'更新 Workflow 运行指标（网页导入）',branch:BRANCH,sha:draft.sha,content:encode(text)})});
 const result=await response.json();
 if(typeof result.commit?.sha!=='string')throw Error('GitHub 已接收请求，但未返回提交编号；请检查仓库后再重试');
 return {sha:result.commit.sha,url:`https://github.com/${REPOSITORY}/commit/${encodeURIComponent(result.commit.sha)}`};
}
