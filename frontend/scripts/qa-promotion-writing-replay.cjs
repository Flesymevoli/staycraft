// Offline inspection of a previously captured fictional acceptance run. No provider calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map(),root=path.resolve(__dirname,'..');
function load(file){
 const filename=path.resolve(root,'src/lib',file+'.ts');
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,id=>id.startsWith('.')?load(path.relative(path.resolve(root,'src/lib'),path.resolve(path.dirname(filename),id))):require(id));
 return mod.exports;
}
assert(process.argv[2],'Pass the saved fictional live-run JSON report. This script never calls a model.');
const report=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'));
assert.equal(report.fictionalInputs,true);assert.equal(report.totalRequests,3);
assert.equal(report.scenarios.length,3);assert.equal(report.results.length,3);
const {buildPromotionWritingContext}=load('promotion-writing-context');
const {validatePromotionCopy}=load('promotion-copy-validation');
const expected={'local-event':'unsupported_room_size',weather:'unsupported_window_view','sparse-property':'unsupported_availability_claim'};
const checked=report.scenarios.map((sample,index)=>{
 const raw=JSON.parse(report.results[index].generated).content;
 const context=buildPromotionWritingContext(sample.facts,sample.brief,sample.name,{source:sample.source});
 assert.throws(()=>validatePromotionCopy(raw,sample.brief,context),/missing_property_name/);
 // Fix labels only for diagnosis. Never repair and publish a rejected model draft.
 let labeled=raw.replaceAll(sample.name.replace('（虚构演练）',''),sample.name);
 if(sample.source)labeled=sample.source.title+' · '+sample.source.start+'\n\n'+labeled;
 assert.throws(()=>validatePromotionCopy(labeled,sample.brief,context),error=>error.message===expected[sample.id]);
 return {scenario:sample.id,original:'missing_property_name',labelsRestored:expected[sample.id]};
});
console.log(JSON.stringify({passed:true,additionalModelCalls:0,results:checked}));
