export function DecisionAdvice({content,zh,label}:{content:string;zh:boolean;label?:string}){
 const blocks=content.split('\n\n').map(part=>part.split('\n').filter(Boolean)).filter(lines=>lines.length&&!['建议调价','Suggested pricing'].includes(lines[0]));
 if(!blocks.length)return null;
 return <div className="decision-advice" role="region" aria-label={label||(zh?'经营建议':'Operating suggestions')}>
 {blocks.map((lines,i)=><article className="decision-advice-item" key={i}><h3>{lines[0]}</h3>{lines.slice(1).map((line,j)=><p key={j}>{line}</p>)}</article>)}
 </div>;
}
