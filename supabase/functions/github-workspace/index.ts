import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const reply = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const enc = (s:string|Uint8Array) => { const b=typeof s==="string"?new TextEncoder().encode(s):s; let x=""; for(const n of b)x+=String.fromCharCode(n); return btoa(x).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); };
function derLength(n:number){if(n<128)return [n];if(n<256)return [0x81,n];return [0x82,(n>>8)&255,n&255];}
function pem(s:string){
 const isPkcs1=s.includes("BEGIN RSA PRIVATE KEY");
 const body=s.replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----|-----END (?:RSA )?PRIVATE KEY-----|\\s/g,"");
 const raw=Uint8Array.from(atob(body),c=>c.charCodeAt(0));
 if(!isPkcs1)return raw;
 const oid=[0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00];
 const octet=[0x04,...derLength(raw.length),...raw];
 const inner=[0x02,0x01,0x00,...oid,...octet];
 return new Uint8Array([0x30,...derLength(inner.length),...inner]);
}
async function jwt(){
 const id=Deno.env.get("GITHUB_APP_ID"), raw=Deno.env.get("GITHUB_APP_PRIVATE_KEY")?.replace(/\\n/g,"\n");
 if(!id||!raw) throw new Error("GitHub App is not configured. Add GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to Supabase Edge Function secrets.");
 const now=Math.floor(Date.now()/1000), unsigned=enc(JSON.stringify({alg:"RS256",typ:"JWT"}))+"."+enc(JSON.stringify({iat:now-30,exp:now+480,iss:id}));
 const key=await crypto.subtle.importKey("pkcs8",pem(raw),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
 return unsigned+"."+enc(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned))));
}
async function gh(path:string,token:string,init:RequestInit={}){
 const r=await fetch("https://api.github.com"+path,{...init,headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28",...(init.headers||{})}});
 const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"GitHub API error "+r.status); return d;
}
async function tokenFor(id:number){return (await gh("/app/installations/"+id+"/access_tokens",await jwt(),{method:"POST"})).token as string;}
const decode=(s:string)=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
const encode=(s:string)=>{const b=new TextEncoder().encode(s);let x="";for(const n of b)x+=String.fromCharCode(n);return btoa(x);};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors}); if(req.method!=="POST")return reply({error:"Use POST."},405);
 try{
  const auth=req.headers.get("Authorization");if(!auth)return reply({error:"Sign in first."},401);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userDb=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authErr}=await userDb.auth.getUser();
  if(authErr||!user)return reply({error:"Your Forma session is invalid."},401);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),b=await req.json(),action=String(b.action||""),teamId=String(b.teamId||"");
  if(!teamId)return reply({error:"Choose a Forma team."},400);
  const [{data:team},{data:member}]=await Promise.all([db.from("teams").select("id,created_by").eq("id",teamId).maybeSingle(),db.from("team_members").select("role").eq("team_id",teamId).eq("user_id",user.id).maybeSingle()]);
  if(!team||(team.created_by!==user.id&&!member))return reply({error:"You are not a member of this team."},403);
  const manager=team.created_by===user.id||["owner","admin"].includes(member?.role);
  if(action==="complete_installation"){
   if(!manager)return reply({error:"Only team owners and admins can connect GitHub."},403);
   const installId=Number(b.installationId);if(!Number.isSafeInteger(installId)||installId<1)return reply({error:"Invalid installation."},400);
   const installation=await gh("/app/installations/"+installId,await jwt());if(installation.suspended_at)return reply({error:"This installation is suspended."},403);
   const account=installation.account||{}, {error}=await db.from("team_github_installations").upsert({team_id:teamId,installation_id:installId,account_login:account.login||"GitHub account",account_type:account.type||"User",connected_by:user.id,updated_at:new Date().toISOString()},{onConflict:"team_id"});
   if(error)throw error;return reply({connected:true,account:account.login||"GitHub account"});
  }
  const {data:connection,error:connErr}=await db.from("team_github_installations").select("installation_id").eq("team_id",teamId).maybeSingle();if(connErr)throw connErr;if(!connection)return reply({error:"Connect GitHub to this team first."},400);
  const ghToken=await tokenFor(Number(connection.installation_id));
  if(action==="list_repositories"){const d=await gh("/installation/repositories?per_page=100",ghToken);return reply({repositories:(d.repositories||[]).map((r:any)=>({id:r.id,full_name:r.full_name,private:r.private,description:r.description||"",default_branch:r.default_branch||"main",html_url:r.html_url}))});}
  const repositoryId=Number(b.repositoryId);if(!Number.isSafeInteger(repositoryId)||repositoryId<1)return reply({error:"Choose a repository."},400);
  const {data:repo,error:repoErr}=await db.from("team_github_repositories").select("*").eq("team_id",teamId).eq("repository_id",repositoryId).maybeSingle();
  if(action==="add_repository"){
   if(!manager)return reply({error:"Only owners and admins can share repositories."},403);
   const d=await gh("/installation/repositories?per_page=100",ghToken),r=(d.repositories||[]).find((x:any)=>Number(x.id)===repositoryId);if(!r)return reply({error:"Repository is not available to this installation."},404);
   const {error}=await db.from("team_github_repositories").upsert({team_id:teamId,installation_id:Number(connection.installation_id),repository_id:r.id,full_name:r.full_name,description:r.description||"",private:r.private,default_branch:r.default_branch||"main",html_url:r.html_url,added_by:user.id},{onConflict:"team_id,repository_id"});if(error)throw error;return reply({added:true});
  }
  if(!repo||repoErr)return reply({error:"This repository is not shared with this team."},404);
  if(action==="remove_repository"){if(!manager)return reply({error:"Only owners and admins can remove repositories."},403);const {error}=await db.from("team_github_repositories").delete().eq("id",repo.id);if(error)throw error;return reply({removed:true});}
  const full=repo.full_name;
  if(action==="list_issues"){const d=await gh("/repos/"+full+"/issues?state=all&per_page=50",ghToken);return reply({issues:d.filter((x:any)=>!x.pull_request).map((x:any)=>({number:x.number,title:x.title,state:x.state,body:x.body||"",user:x.user?.login,comments:x.comments,html_url:x.html_url,created_at:x.created_at}))});}
  if(action==="create_issue"){const d=await gh("/repos/"+full+"/issues",ghToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:String(b.title||"").slice(0,250),body:String(b.body||"")})});return reply({issue:{number:d.number,title:d.title,html_url:d.html_url,state:d.state}});}
  if(action==="list_pull_requests"){const d=await gh("/repos/"+full+"/pulls?state=all&per_page=50",ghToken);return reply({pullRequests:d.map((x:any)=>({number:x.number,title:x.title,state:x.state,body:x.body||"",user:x.user?.login,head:x.head?.ref,base:x.base?.ref,html_url:x.html_url,created_at:x.created_at}))});}
  if(action==="create_pull_request"){const d=await gh("/repos/"+full+"/pulls",ghToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:String(b.title||"").slice(0,250),body:String(b.body||""),head:String(b.head||""),base:String(b.base||repo.default_branch)})});return reply({pullRequest:{number:d.number,title:d.title,html_url:d.html_url,state:d.state}});}
  if(action==="list_comments"){const number=Number(b.number);if(!Number.isSafeInteger(number)||number<1)return reply({error:"Invalid issue or pull request number."},400);const [issueComments,reviewComments]=await Promise.all([gh("/repos/"+full+"/issues/"+number+"/comments?per_page=100",ghToken),gh("/repos/"+full+"/pulls/"+number+"/comments?per_page=100",ghToken).catch(()=>[])]);return reply({comments:[...issueComments.map((x:any)=>({id:x.id,body:x.body,user:x.user?.login,created_at:x.created_at,kind:"conversation"})),...reviewComments.map((x:any)=>({id:x.id,body:x.body,user:x.user?.login,created_at:x.created_at,kind:"review",path:x.path,line:x.line}))]});}
  if(action==="add_comment"){const number=Number(b.number);const body=String(b.body||"").trim();if(!Number.isSafeInteger(number)||number<1||!body)return reply({error:"A comment is required."},400);const d=await gh("/repos/"+full+"/issues/"+number+"/comments",ghToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});return reply({comment:{id:d.id,body:d.body,user:d.user?.login,created_at:d.created_at}});}
  if(action==="list_branches"){const d=await gh("/repos/"+full+"/branches?per_page=100",ghToken);return reply({branches:d.map((x:any)=>({name:x.name,sha:x.commit?.sha}))});}
  if(action==="list_tree"){const d=await gh("/repos/"+full+"/git/trees/"+encodeURIComponent(repo.default_branch)+"?recursive=1",ghToken);return reply({tree:(d.tree||[]).filter((x:any)=>x.type==="blob").map((x:any)=>({path:x.path,type:x.type,sha:x.sha})),truncated:!!d.truncated});}
  if(action==="read_file"){const p=String(b.path||"");if(!p||p.split("/").includes(".."))return reply({error:"Invalid file path."},400);const f=await gh("/repos/"+full+"/contents/"+p.split("/").map(encodeURIComponent).join("/")+"?ref="+encodeURIComponent(repo.default_branch),ghToken);if(Array.isArray(f)||f.type!=="file")return reply({error:"Choose a file."},400);return reply({content:decode(f.content||""),sha:f.sha,size:f.size});}
  if(action==="write_file"){
   const p=String(b.path||"");if(!p||p.startsWith("/")||p.split("/").includes(".."))return reply({error:"Invalid file path."},400);
   const content=String(b.content??"");if(new TextEncoder().encode(content).length>90000)return reply({error:"Text files are limited to 90 KB."},413);
   const path=p.split("/").map(encodeURIComponent).join("/");let sha:string|undefined;
   try{const old=await gh("/repos/"+full+"/contents/"+path+"?ref="+encodeURIComponent(repo.default_branch),ghToken);if(old.type==="file")sha=old.sha;}catch(e){if(!String((e as Error).message).includes("Not Found"))throw e;}
   const result=await gh("/repos/"+full+"/contents/"+path,ghToken,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:String(b.message||"Update "+p).slice(0,200),content:encode(content),branch:repo.default_branch,...(sha?{sha}:{})})});
   return reply({committed:true,sha:result.content?.sha,commit:result.commit?.sha,html_url:result.content?.html_url});
  }
  return reply({error:"Unknown action."},400);
 }catch(e){console.error(e);return reply({error:(e as Error)?.message||"GitHub request failed."},500);}
});