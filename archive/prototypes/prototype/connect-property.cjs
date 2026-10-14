const fs=require('fs');
const change=(path,fn)=>fs.writeFileSync(path,fn(fs.readFileSync(path,'utf8')));
change('prototype/workspace.js',s=>s
 .replaceAll("location.hash.startsWith('#explore')?'explore':'home'","location.hash.startsWith('#explore')?'explore':location.hash.startsWith('#profile')?'profile':'home'")
 .replace("document.documentElement.lang=lang==='en'", "document.getElementById('app').classList.toggle('is-profile',page==='profile');document.documentElement.lang=lang==='en'")
 .replace("else if(page==='explore'&&typeof renderExplore==='function')renderExplore();", "else if(page==='explore'&&typeof renderExplore==='function')renderExplore();else if(page==='profile'&&typeof renderProperty==='function')renderProperty();")
 .replace("k==='insight'||k==='explore'", "k==='insight'||k==='explore'||k==='profile'")
 .replace("document.title='Homestay AI · '+(", "document.querySelectorAll('#app [data-open=profile]').forEach(b=>b.onclick=()=>goPage('profile'));document.title='Homestay AI · '+(page==='profile'?'My Homestay':")
 .replace('[...completedItems(),...baseActivity]',"[...(typeof propertyActivities==='function'?propertyActivities():[]),...completedItems(),...baseActivity]")
 // Keep the original historical example explicitly historical, not the current knowledge base.
 .replace("Breakfast time · 07:00 → 07:30","Archived sample · Breakfast time")
 .replace("早餐时间 · 07:00 → 07:30","历史示例 · 早餐时间")
 .replace("if(page==='home'){homePageRender()", "if(page==='home'){homePageRender()")
);
change('prototype/index.html',s=>s.replace('</body>','<link rel="stylesheet" href="property.css"><script src="property.js"></script></body>'));
change('export-preview.ps1',s=>s.replace("'explore','assistant'","'explore','assistant','property'").replace("$license=Get-Content", "$propertyPhoto=[Convert]::ToBase64String([IO.File]::ReadAllBytes(\"$PSScriptRoot/prototype/property-photo.png\"))\n$source=$source.Replace('src=\"property-photo.png\"','src=\"data:image/png;base64,'+$propertyPhoto+'\"')\n$license=Get-Content"));
change('prototype/property.js',s=>s.replace('src="property-photo.jpg"','src="property-photo.png"'));
