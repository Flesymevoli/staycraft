const fs=require('fs');
const update=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));
update('prototype/workspace.js',s=>s.replace('${tx(item.sub)}','${escapeHtml(tx(item.sub))}').replace('${3+(workState.analysisReady?1:0)}','${baseActivity.length+(workState.analysisReady?1:0)}'));
update('prototype/property.js',s=>s.replace('propertyState.saved=id;propertyEdit=null;render();',"propertyState.saved=id;propertyEdit=null;history.replaceState(null,'','#profile');render();"));
