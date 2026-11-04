const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const mod=new Module('amap-address-test');mod._compile(ts.transpileModule(fs.readFileSync('src/lib/amap-nearby.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'amap-address-test.cjs');
(async()=>{const prior=process.env.AMAP_MAPS_API_KEY;process.env.AMAP_MAPS_API_KEY='mock-only';try{
 let requested;
 const address=await mod.exports.amapAddress({latitude:31.566,longitude:121.068},undefined,async url=>{requested=url;return Response.json({status:'1',regeocode:{formatted_address:'江苏省苏州市太仓市沙溪镇中市街65号'}})});
 assert.equal(address,'江苏省苏州市太仓市沙溪镇中市街65号');assert.equal(requested.hostname,'restapi.amap.com');assert.equal(requested.searchParams.get('location'),mod.exports.amapCoordinates(31.566,121.068));
 await assert.rejects(mod.exports.amapAddress({latitude:31.566,longitude:121.068},undefined,async()=>Response.json({status:'0'})),/amap_location_unknown/);
 console.log('PASS GPS conversion, street address result and no district fallback on provider error. Mock HTTP only.');
}finally{if(prior===undefined)delete process.env.AMAP_MAPS_API_KEY;else process.env.AMAP_MAPS_API_KEY=prior;}})().catch(e=>{console.error(e);process.exitCode=1});
