export const normalizedQuestion=(value:string)=>value.normalize("NFKC").trim().replace(/\s+/g," ").replace(/[?!。！？]+$/u,"").trim().toLowerCase();

export function questionTopic(value:string){
 const question=normalizedQuestion(value);
 if(/attention|pending|处理|待办|注意/.test(question))return "attention";
 if(/vacanc|open rooms|空房|空余|空着|剩余房/.test(question))return "vacancy";
 if(/busiest|most book|预订最多|订单最多|订得最多|哪.+最忙/.test(question))return "busiest";
 if(/booked value|booking amount|已订金额|预订金额|预订均价|订单金额|订出去.*多少钱|订了.*多少钱/.test(question))return "booked_value";
 if(/revenue|profit|payment|收入|利润|收款|营业额/.test(question))return null;
 return /week|business|booking|analysis|经营|预订|分析|本周|这周/.test(question)?"week":null;
}

