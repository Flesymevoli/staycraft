const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {marketAnchors}=load(path.join(root,'src/lib/signals/market-anchors.ts'));
const {marketScopeLocation,marketScopeNote}=load(path.join(root,'src/lib/market/snapshot-scope.ts'));
const quote={id:'saved-1',source:'platform',sourceName:'Sample Stay',capturedAt:'2026-11-11T00:00:00Z',stayDate:'2026-11-19',nights:1,adults:2,priceType:'calendar',priceCny:520,status:'available'};
const input={quotes:[quote],capturedAt:quote.capturedAt,location:'苏州 地址',capturedLocation:marketScopeLocation(marketScopeNote('苏州 地址')),window:{start:'2026-11-18',end:'2026-11-20'}};
assert.equal(marketAnchors(input).anchors[0].amountCny,520);
assert.equal(marketAnchors(input).anchors[0].sourceType,'platform');
assert.equal(marketAnchors({...input,location:'杭州地址'}).anchors.length,0);
assert.equal(marketAnchors({...input,capturedLocation:null}).source.coverage.kind,'none');
assert.equal(marketAnchors({...input,window:{start:'2026-11-21',end:'2026-11-22'}}).anchors.length,0);
for(const overrides of [{status:'stale'},{priceType:'display'},{nights:2},{adults:1}])assert.equal(marketAnchors({...input,quotes:[{...quote,...overrides}]}).anchors.length,0);
assert.equal(marketAnchors({...input,quotes:[{...quote,priceCny:600}]}).anchors[0].amountCny,600);
assert.equal(marketAnchors({...input,fictional:true}).source.authority,'manual');
assert.equal(marketScopeLocation('legacy free text'),null);
assert.equal(marketAnchors({...input,location:' 苏州地址 '}).anchors.length,1);
assert.match(marketAnchors({...input,capturedLocation:null}).source.note,/位置尚未核实/);
console.log('PASS saved market signals: location/date/conditions, changed address, legacy note, live and fictional paths, input-dependent prices');
