/* Isolated concept layer. The original prototype remains unchanged. */
let neutralScheduleOpen=false;
const neutralOriginalMount=mountHomeAssistant;
mountHomeAssistant=function(){
 neutralOriginalMount();
 const cal=document.getElementById('calendar'),sheet=document.getElementById('schedule-sheet');
 cal.after(sheet);
 document.querySelector('.swipe-hint')?.remove();
 function showSchedule(){updateSchedule();sheet.classList.toggle('expanded',neutralScheduleOpen);sheet.setAttribute('aria-hidden',String(!neutralScheduleOpen));cal.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(neutralScheduleOpen&&Number(b.dataset.date)===selected)));}
 cal.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-controls','schedule-sheet');b.onclick=()=>{const date=Number(b.dataset.date);neutralScheduleOpen=date===selected?!neutralScheduleOpen:true;selected=date;cal.querySelectorAll('button').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});showSchedule();};});
 showSchedule();
};
const neutralNavOriginal=navWork;
const solidNavigation={home:'<path d="M2 10 12 2l10 8v12h-7v-8H9v8H2Z"/>',work:'<path fill-rule="evenodd" d="M8 2h8v3h4v17H4V5h4Zm2 2v3h4V4ZM7 11v2h10v-2Zm0 5v2h7v-2Z"/>',insight:'<path d="M3 3h2v17h17v2H3Z M7 17V12h4v5Zm6 0V8h4v9Zm6 0V3h4v14Z"/>',explore:'<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm5 6-3 7-7 3 3-7Zm-5 4-1 2 2-1Z"/>',profile:'<circle cx="12" cy="7" r="5"/><path d="M3 23v-3a9 9 0 0 1 18 0v3Z"/>'};
navWork=function(){neutralNavOriginal();document.querySelectorAll('#dock .tab').forEach(b=>{const label=document.createElement('span');label.className='nav-label';label.textContent=b.dataset.open==='profile'?tr('Mine','我的'):b.getAttribute('aria-label');b.append(label);if(b.classList.contains('active'))b.querySelector('.navicon').innerHTML=`<svg class="solid-nav" viewBox="0 0 24 24" aria-hidden="true">${solidNavigation[b.dataset.open]}</svg>`;});};
const neutralPaintAssistant=paintHomeAssistant;
paintHomeAssistant=function(animate=true,focusTarget){neutralPaintAssistant(animate,focusTarget);if(!homeAssistant.open){const host=document.getElementById('home-assistant');if(!host)return;host.innerHTML=`<div class="greeting-static"><h1 class="greeting-title">${tr('Hi, Alex.','你好，Alex。')}</h1><p class="greeting-sub">${tr('A little clarity for your day.','让经营的每一天，更清晰。')}</p><button class="static-ai" id="greeting-trigger" aria-expanded="false"><span aria-hidden="true">✦</span>${tr('Ask AI','问问 AI')}</button></div>`;host.querySelector('button').onclick=()=>{homeAssistant.open=true;paintHomeAssistant(true,'assistant-question')};if(focusTarget==='greeting-trigger')host.querySelector('button').focus({preventScroll:true});}};
const neutralRenderAnalysis=renderAnalysis;
renderAnalysis=function(){
 neutralRenderAnalysis();
 function disclosure(buttonId,panelId,content,after){const button=document.getElementById(buttonId),panel=document.createElement('div');panel.id=panelId;panel.className='neutral-disclosure';panel.hidden=true;panel.innerHTML=content;after.after(panel);button.setAttribute('aria-controls',panelId);button.setAttribute('aria-expanded','false');const mark=document.createElement('span');mark.className='disclosure-mark';mark.setAttribute('aria-hidden','true');mark.textContent='+';button.querySelector('svg')?.replaceWith(mark);button.onclick=()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));panel.hidden=!open;mark.textContent=open?'−':'+';};return panel;}
 const offer=disclosure('analysis-action','inline-offer',`<h3>${tr('Try a weekday stay offer.','试试工作日住宿推广。')}</h3><p>${tr('Speak to guests who can travel Monday–Thursday. Lead with a quieter stay and flexible dates. Check your availability before deciding on an offer.','面向周一至周四可出行的客人，突出安静住宿与灵活日期。决定推广方案前，请先核对可订情况。')}</p><p class="analysis-source">${tr('Based on sample bookings. You review the draft; nothing is published automatically.','依据示例预订。草稿由你审核，不会自动发布。')}</p><button class="confirm-task" id="inline-promotion">${tr('Create promotion →','创建推广文案 →')}</button>`,document.getElementById('analysis-evidence'));
 offer.querySelector('button').onclick=()=>{location.hash='work/promotion'};
 disclosure('explore-rooms','inline-rooms',`<p class="analysis-source">${tr('Sep 14–20 · Sample booked / available room nights','9 月 14–20 日 · 示例已订 / 可售间夜')}</p><table class="room-table"><thead><tr><th>${tr('Room type','房型')}</th><th>${tr('Nights','间夜')}</th><th>${tr('Occupancy','入住率')}</th></tr></thead><tbody>${[['Garden','花园房',18,21],['Courtyard','庭院房',15,21],['Standard','标准房',16,28]].map(([en,zh,n,a])=>`<tr><td>${tr(en,zh)}</td><td>${n} / ${a}</td><td>${Math.round(n/a*100)}%</td></tr>`).join('')}</tbody></table><p class="analysis-source">${tr('Total: 49 / 70 room nights = 70%. Rates are rounded.','总计：49 / 70 间夜 = 70%。比例已取整。')}</p>`,document.getElementById('explore-rooms'));
};
Object.assign(ANALYSIS_COLORS,{BG:'#faf7f3',TXT:'#202124',MUT:'#61656d',GRID:'#e2dad5',DATA:'#ba9476',HERO:'#73594e'});
const neutralDrawAnalysis=drawAnalysisChart;
drawAnalysisChart=function(...args){neutralDrawAnalysis(...args);const chart=document.getElementById('occupancy-chart');const defs=aSvg('defs',{});defs.innerHTML='<linearGradient id="analysis-spectrum" x1="0%" y1="0%" x2="100%" y2="0%"><stop stop-color="#d28a86"/><stop offset=".5" stop-color="#d6b65e"/><stop offset="1" stop-color="#7cad72"/></linearGradient>';chart.prepend(defs);chart.querySelector('#analysis-line')?.setAttribute('stroke','url(#analysis-spectrum)');};
const neutralDrawComparison=drawComparison;
drawComparison=function(){neutralDrawComparison();document.querySelectorAll('#day-comparison-chart .comparison-tick').forEach(t=>t.setAttribute('stroke',Number(t.getAttribute('y1'))<100?'#d5ad64':'#90be85'));};
const neutralSetExploreDay=setExploreDay;
setExploreDay=function(day){
 neutralSetExploreDay(day);
 const chart=document.getElementById('pulse-svg');if(!chart)return;
 chart.querySelector('defs').innerHTML=`<linearGradient id="pulse-color" x1="0%" y1="0%" x2="100%" y2="0%"><stop stop-color="#d28a86"/><stop offset=".5" stop-color="#d6b65e"/><stop offset="1" stop-color="#7cad72"/></linearGradient><linearGradient id="pulse-fill" x1="0%" y1="0%" x2="100%" y2="0%"><stop stop-color="#f9dedb"/><stop offset=".5" stop-color="#ffefc4"/><stop offset="1" stop-color="#e2f2dd"/></linearGradient><linearGradient id="pulse-fade" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="white" stop-opacity=".85"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="pulse-mask"><rect width="360" height="190" fill="url(#pulse-fade)"/></mask>`;
 chart.querySelector('path').setAttribute('mask','url(#pulse-mask)');
 chart.querySelector('.pulse-line').setAttribute('stroke','url(#pulse-color)');
 chart.querySelector('line').setAttribute('stroke','#9a8f86');
 chart.querySelector('circle:last-child').setAttribute('stroke','#8c8177');
};
const neutralRenderProperty=renderProperty;
renderProperty=function(...args){
 neutralRenderProperty(...args);
 document.getElementById('property-ask')?.remove();
};
render();
