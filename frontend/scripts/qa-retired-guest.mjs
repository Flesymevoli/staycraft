import assert from 'node:assert/strict';
import {retiredGuestPath,retiredGuestResponse} from '../src/lib/retired-guest.ts';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
for(const path of ['/guest','/guest/book','/guest/orders','/guest/contact','/api/guest','/api/guest/photo','/api/workspace/automation','/app/messages/123'])assert.equal(retiredGuestPath(path),true,path);
for(const path of ['/app','/app/work','/app/bookings/history','/api/workspace/bookings','/api/workspace/inventory','/api/workspace/assistant','/api/guesthouse','/guesthouse'])assert.equal(retiredGuestPath(path),false,path);
for(const [path,methods] of [['guest',['GET','POST']],['guest/photo',['GET']],['workspace/automation',['GET','POST']],['workspace/conversations',['GET','POST']],['workspace/conversations/draft',['POST']]]){
 const source=readFileSync(new URL(`../src/app/api/${path}/route.ts`,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 const require=(name)=>{assert.equal(name,'@/lib/retired-guest','Retired endpoints must not load database or model clients');return {retiredGuestResponse}};
 new Function('exports','require',code)(exports,require);
 for(const method of methods){const response=await exports[method]();assert.equal(response.status,410);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(await response.text(),'');}
}
console.log('Retired guest route boundaries, direct API handlers and retained owner paths passed. Database migration not applied by this test.');
