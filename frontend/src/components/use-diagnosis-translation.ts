"use client";
import {useEffect,useState} from 'react';
import type {DecisionAgentRun} from '@/lib/decision-agent-types';
import {applyTranslation,diagnosisLanguage,diagnosisTexts,type DiagnosisTranslation} from '@/lib/diagnosis-translation';
import {useOperation} from './operation-status';
import {startOperation,updateOperation,readOperation} from '@/lib/operation-state';
import {promotionRequest} from '@/lib/promotion-request';

const translations=new Map<string,Promise<DiagnosisTranslation>>();
export function useDiagnosisTranslation(source:DecisionAgentRun|null,scope:string,zh:boolean){
 const operation=useOperation('translation',scope);
 const language=zh?'zh':'en';
 const needed=!!source&&diagnosisLanguage(source)!==language;
 const key=source?JSON.stringify([scope,source.id,language,diagnosisTexts(source)]):'';
 const [state,setState]=useState<{key:string;translation?:DiagnosisTranslation;error?:boolean}>({key:''});
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!source||!needed)return;
  let active=true;
  let pending=translations.get(key);
  if(!pending){
   const previous=readOperation(scope,'translation');
   const id=startOperation(scope,'translation',{phase:'running',stage:'正在翻译已保存报告',stageEn:'Translating saved report',detail:'原文保留，不重新诊断或搜索。',detailEn:'Original text remains. No new diagnosis or search.',reference:JSON.stringify([source.id,language])});
   pending=(async()=>{
    let body;
    if(previous&&revision===0&&previous.reference===JSON.stringify([source.id,language])){
     body=await promotionRequest('/api/workspace/agent/translation?'+new URLSearchParams({runId:source.id,language}),{cache:'no-store'});
     if(body.state!=='complete')throw Error('translation_unconfirmed');
    }else body=await promotionRequest('/api/workspace/agent/translation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:source.id,language,retry:revision>0})},85000);
    if(body.runId!==source.id||body.language!==language)throw Error('translation_invalid');const result={texts:body.texts};applyTranslation(source,result);
    updateOperation(scope,'translation',id,{phase:'complete',stage:'翻译已完成',stageEn:'Translation complete',detail:'使用同一份报告，译文已缓存。',detailEn:'The same report is shown; translation is cached.'});return result;
   })().catch(error=>{updateOperation(scope,'translation',id,{phase:['promotion_timeout','translation_unconfirmed','Failed to fetch'].includes(error.message)?'uncertain':'failed',stage:'翻译结果待核对',stageEn:'Check translation result',detail:'原报告完整保留，先核对缓存结果，避免重复付费调用。',detailEn:'Original report is preserved. Check the cached result before another paid call.'});throw error});
   if(translations.size>=100)translations.delete(translations.keys().next().value!);
   translations.set(key,pending);
   // Keep failed attempts too: remounting must not silently pay for another try.
  }
  void pending.then(translation=>{if(active)setState({key,translation})}).catch(()=>{if(active)setState({key,error:true})});
  return()=>{active=false};
 },[key,language,needed,source,revision,scope]);
 const current=state.key===key?state:null;
 return {run:source&&needed&&current?.translation?applyTranslation(source,current.translation):source,
  status:!needed?'ready':current?.translation?'ready':current?.error?'error':'loading',
  operation:operation.state,
  retry:async()=>{
   if(!source)return;
   try{const receipt=await promotionRequest('/api/workspace/agent/translation?'+new URLSearchParams({runId:source.id,language}),{cache:'no-store'});
    if(receipt.state==='complete'){const translation={texts:receipt.texts};applyTranslation(source,translation);translations.set(key,Promise.resolve(translation));setState({key,translation});if(operation.state)updateOperation(scope,'translation',operation.state.id,{phase:'complete',stage:'已恢复缓存译文',stageEn:'Cached translation restored',detail:'没有再次调用翻译模型。',detailEn:'No additional model call.'});return;}
    if(receipt.state==='running'){if(operation.state)updateOperation(scope,'translation',operation.state.id,{phase:'uncertain',stage:'翻译仍在处理中',stageEn:'Translation is still running',detail:'原文保留，稍后再核对即可，无需重复调用。',detailEn:'Original text is kept. Check again later without another call.'});return;}
    if(receipt.state==='unknown'&&!window.confirm(zh?'上次翻译结果无法确认，确定发起新的付费翻译吗？':'The previous result is unconfirmed. Start a new paid translation?'))return;
    if(operation.state)updateOperation(scope,'translation',operation.state.id,{phase:'failed'});
    translations.delete(key);setState({key:''});setRevision(value=>value+1);
   }catch{setState({key,error:true})}
  }};
}
