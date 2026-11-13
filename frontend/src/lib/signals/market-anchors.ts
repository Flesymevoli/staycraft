import {countableQuote,isDatedListQuote} from '../market/quote-identity';
import {normalizeMarketLocation} from '../market/snapshot-scope';
import type {Quote} from '../market/types';
import type {CompetitorAnchor,SourceRef} from './types';

export function marketAnchors(input:{quotes:Quote[];capturedAt:string|null;location:string;capturedLocation:string|null;window:{start:string;end:string};fictional?:boolean}) {
 const location=normalizeMarketLocation(input.location);
 const locationMatches=!!location&&!!input.capturedLocation&&location===normalizeMarketLocation(input.capturedLocation);
 const quotes=locationMatches?input.quotes.filter(quote=>countableQuote(quote)&&quote.nights===1&&(quote.adults===2||isDatedListQuote(quote))&&quote.stayDate>=input.window.start&&quote.stayDate<=input.window.end):[];
 const note=!locationMatches
  ?input.capturedLocation?'民宿地址已变更，旧报价仍可在市场调研查看；请按当前地址重新采集。':'旧报价未记录采集时的民宿地址，位置尚未核实；记录仍可在市场调研查看。'
  :`${input.fictional?'虚构样本':'已保存报价'}与当前民宿地址及入住日期匹配；该地址是采集上下文，不代表住宿距离或房型条件已匹配。`;
 const source:SourceRef={id:'competitor',authority:input.fictional||quotes.every(quote=>quote.source==='manual')?'manual':'public',observedAt:input.capturedAt||new Date().toISOString(),coverage:{from:input.window.start,to:input.window.end,kind:quotes.length?'partial':'none'},confidence:quotes.length?'medium':'low',note};
 const anchors:CompetitorAnchor[]=quotes.map(quote=>({id:quote.id,name:quote.sourceName,kind:'comparable_stay',stayDate:quote.stayDate,amountCny:quote.priceCny,
  roomType:quote.roomType,meal:quote.breakfast===undefined?undefined:quote.breakfast?'含早餐':'不含早餐',
  cancellation:quote.refundable===undefined?undefined:quote.refundable?'可退款':'不可退款',sourceType:quote.source==='manual'?'manual':'platform',sourceUrl:quote.sourceUrl,
  capturedAt:quote.capturedAt,status:'observed',source:{...source,note:source.note+` ${quote.adults} 位成人、${quote.nights} 晚。`+(isDatedListQuote(quote)?'指定入住日的列表起价，仅作价格参考；房型、早餐和退改未核对，不是成交价。':''),coverage:{from:quote.stayDate,to:quote.stayDate,kind:'partial'}}}));
 return {quotes,anchors,source};
}
