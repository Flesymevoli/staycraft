import {validBrief,validPromotion,type PromotionBrief,type PromotionDraft} from './promotion';
import {validPromotionPlan,type PromotionPlan} from './promotion-plan';
export type LocalPromotion={brief:PromotionBrief;draft:PromotionDraft|null;dirty:boolean;mode:'template'|'live'|'library';versions:Partial<Record<'template'|'live'|'library',{draft:PromotionDraft;dirty:boolean}>>;savedPlan:PromotionPlan|null;planEvidence:string;userContext:{diagnosis?:PromotionPlan['diagnosis']}|null};
const key=(scope:string)=>'staycraft-local-promotion:v1:'+scope;
const validDraft=(value:PromotionDraft|null)=>value===null||!!value&&typeof value.content==='string'&&validPromotion({sources:[],drafts:[{...value,content:value.content.trim()?value.content:'Empty local draft'}]});
export function readLocalPromotion(scope:string):LocalPromotion|undefined{
 if(typeof window==='undefined'||scope==='isolated')return;
 try{const raw=localStorage.getItem(key(scope));if(!raw||raw.length>250000)return;const saved=JSON.parse(raw),v=saved.value;
 if(saved.version!==1||saved.scope!==scope||!v||!validBrief(v.brief)||!validDraft(v.draft)||typeof v.dirty!=='boolean'||!['template','live','library'].includes(v.mode)||!v.versions||Object.entries(v.versions).some(([k,d])=>!['template','live','library'].includes(k)||!d||typeof d!=='object'||!validDraft((d as {draft:PromotionDraft}).draft))||v.savedPlan!==null&&!validPromotionPlan(v.savedPlan)||typeof v.planEvidence!=='string')return;
 return v as LocalPromotion;
 }catch{return}
}
export function saveLocalPromotion(scope:string,value:LocalPromotion):boolean{
 if(typeof window==='undefined'||scope==='isolated')return false;
 try{localStorage.setItem(key(scope),JSON.stringify({version:1,scope,value}));return true}catch{return false}
}
