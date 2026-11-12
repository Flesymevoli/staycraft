import type {PromotionBrief} from './promotion';
import type {buildPromotionWritingContext} from './promotion-writing-context';

type WritingContext = ReturnType<typeof buildPromotionWritingContext>;
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const hype = /谁懂啊|挖到宝|藏不住了|家人们|绝美|天花板|氛围感拉满|必打卡|闭眼冲|不踩雷|全网最佳|顶级|最便宜|最好|第一名|百元住出千元|治愈所有|must[- ]visit|hidden gem|best in town|top-rated/i;
// Protect concrete claims, not ordinary literary words such as light, stillness,
// warmth or the wish to slow down. Aliases let grounded details be paraphrased.
const facilities = [
 ['泳池','游泳池','swimming pool'], ['浴缸','bathtub'], ['投影仪','投影','projector'],
 ['庭院','院子','小院','courtyard'], ['露台','terrace'], ['阳台','balcony'],
 ['落地窗','floor-to-ceiling window'], ['木窗','wooden window'],
 ['湖景','湖边','lake view','lakeside'], ['海景','海边','sea view','seaside'],
 ['河景','临河','临水','river view','riverside'], ['山景','mountain view'],
 ['花园','garden'], ['茶席','tea table'], ['白茶','white tea'], ['围炉','火炉','fireplace'],
 ['厨房','kitchen'], ['洗衣机','washing machine'], ['冰箱','refrigerator'],
 ['空调','air conditioning'], ['独立卫浴','private bathroom'], ['WiFi','wireless internet'],
 ['停车','parking'], ['接送','shuttle'], ['早餐','breakfast'], ['阅读角','书角','reading corner'],
 ['隔音','soundproof'], ['消毒','disinfected'], ['一客一换'], ['24小时','24-hour'],
];
const offers = ['免费','赠送','赠品','礼遇','折扣','打折','特价','优惠','含早','含早餐','下午茶','free breakfast','complimentary','discount','special offer'];
// Concrete surroundings are facts too. A riverside name or address does not
// establish trees, paving, nearby shops, animals, a bridge or a particular view.
const surroundings = [
 ['梧桐','plane tree'], ['银杏','ginkgo'], ['柳树','willow'], ['竹林','bamboo grove'],
 ['青石板','石板路','cobblestone'], ['屋顶','rooftop'], ['鸽子','pigeon'], ['猫','cat'],
 ['桥头','桥的影子','桥影','bridge'], ['路灯','streetlight'], ['栗子','chestnut'],
 ['芦苇','reeds'], ['晒布','竹竿上的布'], ['旧版诗集'],
];
const quantities = /[¥￥$]\s*\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*(?:°[CF]|℃|摄氏度|元|块|折|%|公里|千米|km|分钟|minutes|平方米|平米|㎡|米)|[一二三四五六七八九十百]+(?:折|元|公里|分钟)|(?:免费|赠送|含)\s*\d+\s*(?:份|晚|次)/gi;
const contains = (value:string,word:string) => value.toLowerCase().includes(word.toLowerCase());
const normalized = (value:string) => value.replace(/℃|摄氏度/g,'°C').replace(/平方米|平米|㎡/g,'㎡').replace(/\s+/g,'').toLowerCase();
const numberWords:Record<string,number>={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};

function dateForms(date:string){
 const [year,month,day]=date.split('-').map(Number);
 return [date,`${year}年${month}月${day}日`,`${month}月${day}日`,`${month}月${day}号`];
}

function assertedAvailability(value:string){
 const patterns=[
  /(?:有|还有|尚有|留有|剩下|剩余)\s*(?:\d+|[一二两三四五六七八九十]+)\s*(?:间|套)[^。！？\n]{0,24}(?:空着|可订|可预订)/g,
  /(?:房间|客房|套房|大床房|双床房|房型)[^。！？\n]{0,12}(?:空着|可订|可预订|能预订)/g,
  /(?:there (?:is|are)|we have)\s+(?:an?|\d+|one|two|some)\s+[^.!?\n]{0,30}(?:rooms?|suites?)[^.!?\n]{0,12}(?:available|vacant)/gi,
 ];
 return patterns.some(pattern=>[...value.matchAll(pattern)].some(match=>{
  const clause=(value.slice(0,match.index!+match[0].length).split(/[，,。！？；;\n]|(?<=[a-z])[.!?](?:\s|$)/i).at(-1)||'').trim();
  const question=/是否|有无|有没有|能否|可否|\bwhether\b/i.test(clause);
  const conditional=/^(?:如果|若)\s*(?:(?:这间|该|所选|目标|当天|当日|明天|届时|到时|周末)\s*)?(?:客房|房间|房型|套房|(?:还)?有(?:\d+|[一二两三四五六七八九十]+)间)|^if\s+(?:(?:the|this|your)\s+)?(?:guest room|room|suite|there (?:is|are))/i.test(clause);
  return !question&&!conditional;
 }));
}

export function validatePromotionCopy(content:string,brief:PromotionBrief,context:WritingContext){
 if(content.length<40||content.length>(brief.channel==='xiaohongshu'?1000:4000))throw Error('invalid_copy_length');
 if(/https?:\/\/|www\.|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(content))throw Error('unsafe_copy');
 if(!content.includes(context.property.name))throw Error('missing_property_name');
 // The registered name and exact source title may contain punctuation or a
 // facility word; neither proves the property supplies that facility.
 const source=context.selectedSource;
 let prose=content.replaceAll(context.property.name,'');
 if(source)prose=prose.replaceAll(source.title,'');
 const claims=context.property.rooms.reduce((text,room)=>text.replaceAll(room.name,brief.language==='zh'?'客房':'guest room'),prose);
 if(hype.test(prose)||/[!！#]/.test(prose)||emoji.test(prose))throw Error('unsupported_copy_style');
 if(/亲测|我住过|我住的|住过一次|这次订的是|入住后发现|多次入住|无限回购|\bI (?:stayed|booked)|my stay|we stayed/i.test(prose))throw Error('invented_personal_experience');
 if(/仅剩|售罄|满房|余房|保证有房|保证入住|一定有房|确保有房|guaranteed availability|rooms left|sold out/i.test(prose))throw Error('unsupported_availability_claim');
 if(assertedAvailability(claims))throw Error('unsupported_availability_claim');
 if(/(?:恰好|刚好|正好)(?:还)?(?:空着|可订|有房)/.test(claims))throw Error('unsupported_availability_claim');
 if(/入住率|待填充|空房缺口|经营诊断|转化率|测试账号|虚构演练|QA_LIVE|occupancy rate|booking gap|test account/i.test(prose))throw Error('internal_planning_in_copy');
 if(/(?:仅设|仅有|只有).{0,20}(?:一间|1间|一套|1套)/.test(prose))throw Error('unsupported_room_count');

 const propertyEvidence=context.property.features.join('\n');
 const settingEvidence=propertyEvidence+'\n'+(source?.summary||'');
 for(const aliases of surroundings){
  const mentioned=aliases.some(term=>/^[a-z ]+$/i.test(term)?new RegExp('\\b'+term+'s?\\b','i').test(prose):contains(prose,term));
  if(mentioned&&!aliases.some(term=>contains(settingEvidence,term)))throw Error('unsupported_surroundings');
 }
 for(const claim of prose.match(/(?:水位|河水)[^。！？\n]{0,12}(?:涨到|升到|漫过)[^。！？\n]{0,15}|夜里只有水声|没有标准化的服务/g)||[])
  if(!propertyEvidence.includes(claim))throw Error('unsupported_environment_claim');
 const sizeClaims=[...claims.matchAll(/(?:房间|客房|大床房|双床房|套房|卧室|屋子|\broom\b|\bbedroom\b)[^。！？\n.!?]{0,8}(?:不大|不小|很大|很小|小巧|狭小|宽敞|面积\s*(?:约|为|是|有)?\s*\d+|\bspacious\b|\bsmall\b|\blarge\b)/gi)];
 if(sizeClaims.some(match=>!/是否|能否|有多|\bwhether\b|\bhow\b/i.test(match[0]))
  &&!/面积|平米|平方米|㎡|宽敞|狭小|小巧|\bsquare (?:metres?|meters?|feet)\b|\bspacious\b|\bsmall\b|\blarge\b/i.test(propertyEvidence))throw Error('unsupported_room_size');
 if(/(?:房间|客房|民宿内|住处|屋里|房内|回来)[^。！？\n]{0,40}(?:做[^。！？\n]{0,4}饭|做菜|下厨|烹饪)|(?:in (?:the|your) room|back at [^.!?\n]{0,20})[^.!?\n]{0,40}\bcook/i.test(claims)
  &&!/厨房|厨具|灶具|电磁炉|做饭|做菜|下厨|烹饪|\bkitchen\b|\bkitchenette\b|\bstove\b/i.test(propertyEvidence))throw Error('unsupported_cooking');
 if(/(?:窗外(?:是|有|正对|能看到|能看见|可见|映着)|窗边(?:看见|看到|望见|望向)|推开?窗(?:就|便)?(?:能)?(?:看见|看到|望见)|从窗[^，,。！？\n]{0,4}(?:看见|看到|望见))[^，,。！？\n]{0,20}(?:老街|街道|街巷|巷子)|(?:window (?:looks|faces|overlooks)|view (?:of|onto|over))[^,.!?\n]{0,20}(?:old street|alley|street view)/i.test(claims)
  &&!/街景|老街|街道|街巷|巷子|street view|old street|alley/i.test(propertyEvidence))throw Error('unsupported_window_view');
 // Exact room names are safe to use in an invitation. Describing access to the
 // courtyard merely because a room is named after it is not supported.
 const featureProse=context.property.rooms.reduce((text,room)=>text.replaceAll(room.name,''),prose);
 for(const aliases of facilities){
  if(aliases.some(term=>contains(featureProse,term))&&!aliases.some(term=>contains(propertyEvidence,term)))throw Error('unsupported_property_feature');
 }
 for(const term of offers)if(contains(prose,term)&&!contains(propertyEvidence,term))throw Error('unsupported_offer');
 const commercialAmounts=prose.match(quantities)||[];
 const sourceEvidence=source?`${source.summary}\n${source.title}`:'';
 const knownAmounts=new Set(((propertyEvidence+'\n'+sourceEvidence).match(quantities)||[]).map(normalized));
 for(const amount of commercialAmounts)if(!knownAmounts.has(normalized(amount)))throw Error('unsupported_quantity');
 for(const match of prose.matchAll(/(?:最多入住|可入住|可住|可容纳|容纳|for up to|accommodates|sleeps)\s*(\d+|[一二两三四五六七八九十]|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:位|人|guests?|people)?/gi)){
  const count=numberWords[match[1].toLowerCase()]??Number(match[1]);
  const before=prose.slice(Math.max(0,match.index!-80),match.index).split(/[。\n]/).at(-1)||'';
  const named=context.property.rooms.filter(room=>before.includes(room.name)).sort((a,b)=>before.lastIndexOf(b.name)-before.lastIndexOf(a.name))[0];
  if(named?named.capacity!==count:!context.property.rooms.some(room=>room.capacity===count))throw Error('unsupported_room_capacity');
 }
 if(/步行|walking distance|walk away/i.test(prose)&&!/步行|walking distance|walk away/i.test(propertyEvidence+'\n'+(source?.summary||'')))throw Error('unsupported_travel_claim');
 if(/保证|必定|一定能|每天都能|guarantee|always sunny/i.test(prose))throw Error('guaranteed_experience');

 const validDates=new Set([brief.start,brief.end,source?.start,source?.end].filter((date):date is string=>!!date));
 // A stay window is inclusive; intermediate dates are valid too.
 for(let date=brief.start;date<=brief.end;date=new Date(Date.parse(date)+86400000).toISOString().slice(0,10))validDates.add(date);
 const sourceText=source?`${source.title}\n${source.summary}`:'';
 for(const date of content.match(/\d{4}-\d{2}-\d{2}/g)||[])if(!validDates.has(date)&&!sourceText.includes(date))throw Error('unsupported_date');
 const allowedForms=[...validDates].flatMap(dateForms);
 for(const date of prose.match(/(?:\d{4}年)?\d{1,2}月\d{1,2}[日号]/g)||[])if(!allowedForms.includes(date)&&!sourceText.includes(date))throw Error('unsupported_date');
 if(source){
  if(!content.includes(source.title))throw Error('missing_selected_source');
  if(![...dateForms(source.start),...dateForms(source.end)].some(date=>content.includes(date)))throw Error('missing_source_date');
  if(source.kind==='weather'&&!/预报|预计|可能|forecast|expected|may change/i.test(content))throw Error('weather_not_qualified');
 }
 return content;
}
