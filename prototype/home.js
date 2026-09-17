let scheduleExpanded=false;
const sampleEvents=d=>[16,17,18,21].includes(d)?[{time:'11:00',en:'Guest check-out',zh:'客人退房',room:'201'},{time:'14:00',en:'Guest check-in',zh:'客人入住',room:'102'}]:[];
render=function(){
 document.documentElement.lang=lang==='en'?'en':'zh-CN';
 document.getElementById('app').innerHTML=`<div class="hero"><div class="intro"><div><h1>${tr('Hi, Alex.','你好，Alex。')}</h1><p class="sub">${tr('A little clarity for your day.','让经营的每一天，更清晰。')}</p></div><div class="header-actions"><button id="language" aria-label="Switch language">${tr('中文','EN')}</button><button class="avatar" data-open="profile" aria-label="Profile">A</button></div></div><div class="heading"><h2 class="month">${tr('September 2026','2026 年 9 月')}</h2><span class="mini">${tr('Demo data','示例数据')}</span></div><div class="calendar" id="calendar" aria-label="Select a date"></div></div><section class="schedule-sheet" id="schedule-sheet"><button class="sheet-toggle" id="sheet-toggle" aria-controls="agenda-detail"><span class="grab"></span><span class="sheet-row"><span class="sheet-date" id="sheet-date"></span><span class="sheet-meta" id="sheet-meta"></span></span></button><div class="agenda-detail" id="agenda-detail" hidden></div></section><div class="body-content"><div class="section-title"><h2>${tr('Your stay at a glance','经营一览')}</h2><small>${tr('This week · Sample','本周 · 示例')}</small></div><div class="widgets"><button class="widget" data-open="insight" aria-label="${tr('View occupancy insights','查看入住率分析')}"><span class="widget-top">${tr('Occupancy','入住率')}${svg('arrow')}</span><span class="big-value">70<span>%</span></span><span class="metric-sub">${tr('49 of 70 room nights','49 / 70 可售间夜')}</span><span class="spark" role="img" aria-label="${tr('Mon to Sun occupancy: 50, 60, 60, 70, 80, 100, 70 percent','周一至周日入住率：50、60、60、70、80、100、70%')}">${[50,60,60,70,80,100,70].map(v=>`<i style="height:${v}%"></i>`).join('')}</span><span class="week-labels">${tr('MTWTFSS','一二三四五六日').split('').map(s=>`<span>${s}</span>`).join('')}</span></button><button class="widget suggestion" data-open="insight"><span class="widget-top">${tr('AI insight','经营建议')}<span aria-hidden="true">✧</span></span><span class="eyebrow">${tr('WEEKDAY OPPORTUNITY','工作日机会')}</span><h3>${tr('Fill your weekdays.','抓住工作日机会。')}</h3><p>${tr('More weekday availability. Try a midweek stay offer.','工作日空房较多，可尝试住宿推广。')}</p><span class="widget-link">${tr('View suggestion','查看建议')}${svg('arrow')}</span></button></div><div class="section-title"><h2>${tr('Ready when you are','待你处理')}</h2><small>${tr('2 items','2 项')}</small></div><article class="work-card"><div class="cardtop"><span class="icon">${svg('reply')}</span><div><h3>${tr('An early arrival request','一条提前入住咨询')}</h3><p class="sub">${tr('Room 102 · Your guest is waiting for a reply.','102 房 · 客人正在等待回复。')}</p></div></div><button class="action" data-open="reply">${tr('Draft a reply','起草回复')}${svg('arrow')}</button></article><article class="work-card"><div class="cardtop"><span class="icon">${svg('content')}</span><div><h3>${tr('Your weekday stay story','工作日住宿推广')}</h3><p class="sub">${tr('A saved listing draft, ready for your finishing touch.','已保存的房源草稿，等待你继续完善。')}</p></div></div><button class="action" data-open="content">${tr('Continue draft','继续编辑')}${svg('arrow')}</button></article><p class="footer">${tr('CONCEPT PREVIEW · SAMPLE DATA · BRAND TBD','概念预览 · 示例数据 · 品牌待定')}</p></div>`;
 document.getElementById('dock').innerHTML=['home','reply','insight','content','profile'].map((k,i)=>`<button class="tab ${i===0?'active':''}" aria-label="${tr(['Home','Replies','Insights','Content','Profile'][i],['首页','回复','分析','推广','我的'][i])}" ${i===0?'aria-current="page"':''} data-open="${k}"><span class="navicon">${svg(k)}</span></button>`).join('');
 const cal=document.getElementById('calendar');
 cal.innerHTML=Array.from({length:21},(_,i)=>{let d=i+14,date=new Date(2026,8,d);return `<div class="date-cell"><small>${tr(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()],['日','一','二','三','四','五','六'][date.getDay()])}</small><button class="day ${d===selected?'selected':''}" data-date="${d}" aria-pressed="${d===selected}" aria-label="${date.toLocaleDateString(lang==='en'?'en-US':'zh-CN')}"><strong>${date.getDate()}</strong></button><span class="date-dot ${sampleEvents(d).length?'has-event':''}"></span></div>`}).join('');
 cal.querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.date);cal.querySelectorAll('button').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});updateSchedule()});
 document.getElementById('language').onclick=()=>{const pos=cal.scrollLeft;lang=lang==='en'?'zh':'en';render();document.getElementById('calendar').scrollLeft=pos};
 const hero=document.querySelector('.hero'),sheet=document.getElementById('schedule-sheet');
 hero.insertBefore(sheet,hero.querySelector('.heading'));
 hero.querySelector('.heading').insertAdjacentHTML('afterend',`<button class="swipe-hint" aria-label="${tr('Hold and swipe up to peek at schedule','按住向上滑动查看日程')}" aria-controls="schedule-sheet"><svg viewBox="0 0 24 12" aria-hidden="true"><path d="m5 9 7-6 7 6"/></svg></button>`);
 const hint=hero.querySelector('.swipe-hint');
 const oldToggle=document.getElementById('sheet-toggle');
 const header=document.createElement('div');header.className='sheet-toggle';header.innerHTML=oldToggle.innerHTML;oldToggle.replaceWith(header);
 bind();updateSchedule();
 let drag=null,amount=0,suppressClick=false;
 const area=document.getElementById('app');
 function paint(value){amount=Math.max(0,Math.min(sheet.scrollHeight,value));sheet.style.transition='none';sheet.style.height=amount+'px';sheet.style.opacity=String(Math.min(1,amount/100));sheet.style.visibility=amount?'visible':'hidden';sheet.style.marginBottom=Math.min(14,amount/8)+'px';sheet.setAttribute('aria-hidden',String(!amount));}
 function begin(x,y,target){const onHint=target.closest('.swipe-hint');if(!onHint&&!target.closest('.body-content'))return;if(!onHint&&window.scrollY>2)return;drag={x,y,sign:onHint?-1:1,moved:false};suppressClick=false;paint(0);}
 function move(x,y,event){if(!drag)return;const dy=(y-drag.y)*drag.sign,dx=x-drag.x;if(!drag.moved&&(dy<5||Math.abs(dx)>Math.abs(y-drag.y)))return;event.preventDefault();drag.moved=true;suppressClick=true;paint(dy);}
 function release(){if(!drag)return;drag=null;sheet.style.transition=matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'height 260ms ease, opacity 220ms ease, margin-bottom 260ms ease';sheet.style.height='0px';sheet.style.opacity='0';sheet.style.marginBottom='0';sheet.setAttribute('aria-hidden','true');amount=0;}
 sheet.addEventListener('transitionend',()=>{if(!drag&&amount===0)sheet.style.visibility='hidden'});
 area.addEventListener('touchstart',e=>{if(e.touches.length===1)begin(e.touches[0].clientX,e.touches[0].clientY,e.target)},{passive:true});
 area.addEventListener('touchmove',e=>{if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY,e)},{passive:false});
 area.addEventListener('touchend',release,{passive:true});area.addEventListener('touchcancel',release,{passive:true});
 area.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){begin(e.clientX,e.clientY,e.target);if(drag)area.setPointerCapture(e.pointerId)}});
 area.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')move(e.clientX,e.clientY,e)});
 area.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')release()});area.addEventListener('pointercancel',release);
 area.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}},true);
 hint.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();drag={moved:true};paint(sheet.scrollHeight)}};
 hint.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release()}};
 hint.onblur=release;
 revealObserver?.disconnect();
 revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target)}}),{threshold:.08});
 document.querySelectorAll('.widget,.work-card').forEach(card=>{card.classList.add('reveal-card');revealObserver.observe(card)});
};
function updateSchedule(){
 const events=sampleEvents(selected),date=new Date(2026,8,selected),sheet=document.getElementById('schedule-sheet');
 document.getElementById('sheet-date').textContent=date.toLocaleDateString(lang==='en'?'en-US':'zh-CN',{month:'short',day:'numeric',weekday:'short'});
 document.getElementById('sheet-meta').textContent=events.length?tr('2 events','2 项日程'):tr('No events','无日程');
 const detail=document.getElementById('agenda-detail');detail.hidden=false;
 detail.innerHTML=events.length?events.map(e=>`<div class="event"><span class="time">${e.time}</span><div class="eventbody"><strong>${tr(e.en,e.zh)}</strong><small>${tr('Room '+e.room,e.room+' 房')} · ${tr('Sample reservation','示例预订')}</small></div></div>`).join(''):`<p class="empty">${tr('No events','无日程')}</p>`;
 sheet.setAttribute('aria-hidden','true');
}
let revealObserver;
render();
