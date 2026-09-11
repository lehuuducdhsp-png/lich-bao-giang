'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('recovery/google-sheets/google-sheets-owner-v6.ts','utf8').replace(/^import .*\n/,'');
let handler,sent,owner=true,authenticated=true,calls=0;
const env={SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test-publishable',SUPABASE_SERVICE_ROLE_KEY:'test-service',GOOGLE_SHEETS_WEB_APP_URL:'https://example.test/apps-script',GOOGLE_SHEETS_ACCESS_KEY:'test-access'};
const ctx={console,Request,Response,URLSearchParams,crypto,Date,Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn}},
 createClient:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'test-owner'}:null},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:owner?'owner':'teacher',is_active:true,expires_at:null}})})})})}),
 fetch:async(url,options)=>{calls++;assert.equal(url,env.GOOGLE_SHEETS_WEB_APP_URL);const form=new URLSearchParams(options.body);sent=JSON.parse(form.get('payload'));assert.equal(form.get('accessKey'),'test-access');return new Response('LBG_SAVED',{status:200})}};
vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(source),ctx);
const body={requestId:'fixture-p',total:16,mainPeriods:15,plusPeriods:1,assistPeriods:2,entries:[{day:6,session:'Chiều',period:1,className:'1/1 (P)',isAssist:true,assignmentType:'assist',payEligible:false},{day:6,session:'Chiều',period:3,className:'1/3 (P)',isAssist:true,assignmentType:'assist',payEligible:false}]};
const request=()=>new Request('https://example.test/edge',{method:'POST',headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},body:JSON.stringify(body)});
(async()=>{
 assert.equal((await handler(request())).status,200);assert.deepEqual(sent,body,'deployed v6 source must forward P and pay totals unchanged');
 owner=false;assert.equal((await handler(request())).status,403);assert.equal(calls,1,'non-owner must not reach Apps Script');
 authenticated=false;assert.equal((await handler(request())).status,401);assert.equal(calls,1);
 console.log('PASS retrieved Edge v6: P payload preserved, owner-only checks preserved (mock upstream; no live Sheet writes).');
})().catch(e=>{console.error(e);process.exitCode=1});
