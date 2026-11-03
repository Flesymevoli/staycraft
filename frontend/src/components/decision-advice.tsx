export function DecisionAdvice({content,zh,label}:{content:string;zh:boolean;label?:string}){
 const items=content.split('\n\n').filter(p=>p.includes('\n')).map(part=>part.split('\n').filter(Boolean));
 return <div className="decision-advice" role="region" aria-label={label||(zh?'经营与调价建议':'Operating and pricing suggestions')}>
 {items.length?items.map((lines,i)=>lines.length===5&&['建议调价','Suggested pricing'].includes(lines[0])?<article className="decision-price" key={i}>
  <h3>{lines[0]}</h3><p className="decision-price-value">{lines[1]}</p><p className="decision-price-change">{lines[2]}</p><p className="decision-price-current">{lines[3]}</p>
  <details><summary>{zh?'判断依据与适用范围':'Decision basis and scope'}</summary><p>{lines[4]}</p><p>{zh?'仅基于已记录订单，渠道可能不完整；不是市场需求预测，不会自动改价。':'Based on recorded bookings with potentially incomplete channel coverage; not a demand forecast or an automatic price update.'}</p></details>
 </article>:<article className="decision-advice-item" key={i}><h3>{lines[0]}</h3><p>{lines.at(-1)}</p>{lines.length>2&&<details><summary>{zh?'判断依据':'Why this suggestion'}</summary><p>{lines.slice(1,-1).join('\n')}</p></details>}</article>):<p>{content}</p>}
 </div>;
}
