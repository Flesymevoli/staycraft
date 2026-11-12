import type {PromotionBrief, PromotionSource} from './promotion';
import type {PromotionPlan} from './promotion-plan';

export type PromotionWritingOptions={source?:PromotionSource;plan?:PromotionPlan;diagnosisReason?:string};
export type PromotionWritingContext={
 property:{name:string;location:string;rooms:{name:string;capacity?:number}[];features:string[]};
 selectedSource:(PromotionSource&{kind:'weather'|'event'})|null;
 stayWindow:{start:string;end:string};
 creativeDirection:{audience:string;angle:string;preferredFactIds:string[]};
 internalDiagnosisReason:string|null;
};

const unlabel=(value:string)=>value.replace(/^(?:民宿名称|位置|房型|民宿说明|客人须知|Property name|Location|Room type|Property notes|Guest information)[:：]\s*/i,'').trim();
// Notes mix descriptive facts, house rules and private operating context. Keep
// the positive descriptions as material; scene selection need not use them all.
// This excludes instructions and conditional/negative claims rather than
// restricting every property to a fixed catalogue of approved facilities.
const internalOrInstruction=/测试|演练|虚构|模拟|账号|采集|报价|房价|价格|经营|入住率|空房|订单|后台|数据|诊断|推广|文案|提示词|忽略|指令|必须|请|禁止|不|未|没有|无|暂停|关闭|维修|装修中|仅限|需提前|须提前|入住前|办理入住|退房|押金|退款|预约|收费|免费|赠送|折扣|优惠|附近|周边|隔壁|对面|院外|证件|身份证|密码|门禁|钥匙|电话|联系|微信|须知|遵守|保持|输出|生成|回复|返回|你是|角色|建议|推荐|如需|若需|将来|未来|计划|筹备|拟设|待开放|我住过|亲测|谁懂|挖到宝|藏不住|家人们|绝美|天花板|氛围感拉满|必打卡|闭眼冲|[¥￥!！]|\d+\s*元|test account|fictional|demo data|internal|occupancy|booking data|prompt|ignore|instruction|\bmust\b|please|prohibit|\bno\s|\bnot\s|n't|without|unavailable|closed|temporarily|nearby|next door|opposite|\bfee\b|\bfree\b|discount|complimentary|passport|password|contact|check.?out|check.?in|planned|future|under construction|staff only|https?:\/\/|www\./i;
const decorations= /#[^\s#]+|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu;

function featureFacts(facts:{id:string;text:string}[]){
 const descriptions=facts.filter(f=>f.id==='notes'||/^feature_/.test(f.id)).flatMap(f=>unlabel(f.text).split(/[。！？!?；;\n]+|\.\s+(?=[A-Z])/));
 const breakfast=facts.find(f=>f.id==='breakfast');
 if(breakfast&&/\d{2}:\d{2}\s*[–—-]\s*\d{2}:\d{2}/.test(breakfast.text))descriptions.push(breakfast.text);
 return [...new Set(descriptions.map(value=>value.replace(decorations,'').trim().replace(/[.]+$/,'')).filter(value=>
  value.length>=3&&value.length<=180&&!internalOrInstruction.test(value)
 ))].slice(0,6);
}

export function buildPromotionWritingContext(facts:{id:string;text:string}[],brief:PromotionBrief,name:string,options:PromotionWritingOptions={}):PromotionWritingContext{
 const preferred=options.plan?.factIds||[];
 const roomFacts=facts.filter(f=>/^room_\d+$/.test(f.id));
 roomFacts.sort((a,b)=>Number(preferred.includes(b.id))-Number(preferred.includes(a.id)));
 const rooms=roomFacts.map(f=>{
  const text=unlabel(f.text),capacity=text.match(/(?:最多入住\s*(\d+)\s*人|for up to\s*(\d+)\s*guests?)/i);
  const roomName=text.replace(/[，,]?\s*(?:最多入住\s*\d+\s*人|for up to\s*\d+\s*guests?)[。.]?$/i,'').replace(/[。.]$/,'').trim();
  return {name:roomName,...(capacity?{capacity:Number(capacity[1]||capacity[2])}:{})};
 }).filter(room=>room.name);
 return {
  property:{name,location:unlabel(facts.find(f=>f.id==='location')?.text||''),rooms,features:featureFacts(facts)},
  selectedSource:options.source?{...options.source,kind:/天气预报|weather forecast/i.test(options.source.title)?'weather':'event'}:null,
  stayWindow:{start:brief.start,end:brief.end},
  creativeDirection:{audience:options.plan?.audience||'',angle:options.plan?.angle||'',preferredFactIds:[...preferred]},
  internalDiagnosisReason:options.diagnosisReason||null,
 };
}
