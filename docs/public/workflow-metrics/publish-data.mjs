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
  if(response.status===409)throw Error('远端已更新，请重新检查共享差异后再发布；本次没有覆盖远端修改');
  if(response.status===401)throw Error('GitHub 授权无效或已过期');
  if(response.status===403||response.status===404)throw Error('无法访问共享仓库，请检查仓库授权、Contents 写入权限及 API 限额');
  if(response.status===422)throw Error('GitHub 拒绝提交，请检查 main 分支保护或重新检查共享差异');
  throw Error(`GitHub 请求失败（HTTP ${response.status}），请稍后重试`);
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
 return {sha:file.sha,account:typeof user.login==='string'?user.login:'管理员',changes:previewChanges(base.runs,incoming),snapshot};
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
