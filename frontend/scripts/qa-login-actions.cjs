const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
let sample=false, response={data:{session:null},error:null}, calls=[];
const stubs={
  'next/navigation':{redirect:path=>{throw new Error('redirect:'+path)}},
  'next/headers':{headers:async()=>new Headers({origin:'https://staycraft.example'})},
  '@/lib/supabase/config':{hasSupabaseConfig:()=>true},
  '@/lib/operator-sample':{operatorSample:()=>sample},
  '@/lib/supabase/server':{createClient:async()=>({auth:{signUp:async input=>{calls.push(input);return response;}}})},
};
const code=ts.transpileModule(fs.readFileSync('src/app/login/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module('login-actions-test');
mod.require=name=>{if(!(name in stubs))throw Error('Unexpected import '+name);return stubs[name]};
mod._compile(code,'login-actions-test.cjs');
const form=password=>{const data=new FormData();data.set('email','test@example.invalid');data.set('password',password);return data};
(async()=>{
  assert.deepEqual(await mod.exports.signUp(undefined,form('short')),{error:'password'});
  assert.equal(calls.length,0);
  assert.deepEqual(await mod.exports.signUp(undefined,form('test-password')),{sent:true});
  assert.equal(calls[0].options.emailRedirectTo,'https://staycraft.example/auth/callback');
  response={data:{session:{access_token:'mock-only'}},error:null};
  await assert.rejects(mod.exports.signUp(undefined,form('test-password')),/redirect:\/app/);
  response={data:{session:null},error:{message:'mock rejection'}};
  assert.deepEqual(await mod.exports.signUp(undefined,form('test-password')),{error:'failed'});
  sample=true;calls=[];
  assert.deepEqual(await mod.exports.signUp(undefined,form('test-password')),{error:'sample'});
  assert.equal(calls.length,0);
  console.log('PASS signup validation, confirmation/session branches, provider failure, isolated preview. Mock SDK only.');
})().catch(error=>{console.error(error);process.exitCode=1});
