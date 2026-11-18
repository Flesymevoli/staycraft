"use client";

import {useEffect, useState, type ComponentPropsWithoutRef} from 'react';
import {usePathname} from 'next/navigation';
import {useOperatorLanguage} from './operator-language';
import {englishDisplay} from '@/lib/english-display';
import {hasChinese, translateDisplayText} from '@/lib/local-translation';

export function useEnglishDraft(source:string, zh:boolean) {
  const [view,setView]=useState({source:'',text:''});
  const known=zh?source:englishDisplay(source);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{const retry=()=>setAttempt(n=>n+1);window.addEventListener('staycraft-translation-retry',retry);return ()=>window.removeEventListener('staycraft-translation-retry',retry)},[]);
  useEffect(()=>{
    if (zh || !hasChinese(known)) return;
    let active=true;
    void translateDisplayText(source).then(text=>{if(active)setView({source,text})})
      .catch(()=>{if(active)window.dispatchEvent(new Event('staycraft-translation-failed'))});
    return ()=>{active=false};
  },[known,source,zh,attempt]);
  return !zh && view.source===source?view.text:known;
}

// The editor continues to own the original value. Focusing the field exposes the
// exact source for editing; translation alone never marks the form as changed.
export function LocalizedInput({zh,value,...props}:ComponentPropsWithoutRef<'input'> & {zh:boolean;value:string}) {
  const [focused,setFocused]=useState(false);
  const text=useEnglishDraft(value,zh||focused);
  return <input {...props} value={text} onFocus={e=>{setFocused(true);props.onFocus?.(e)}} onBlur={e=>{setFocused(false);props.onBlur?.(e)}}/>;
}
export function LocalizedTextarea({zh,value,...props}:ComponentPropsWithoutRef<'textarea'> & {zh:boolean;value:string}) {
  const [focused,setFocused]=useState(false);
  const text=useEnglishDraft(value,zh||focused);
  return <textarea {...props} value={text} onFocus={e=>{setFocused(true);props.onFocus?.(e)}} onBlur={e=>{setFocused(false);props.onBlur?.(e)}}/>;
}

// Business records are shared by tables, reports, menus and drawers. Translate their
// presentation in place, keeping React's existing nodes and the underlying records.
const attributes=['title','aria-label','placeholder','alt'];
const excluded='script,style,noscript,textarea,[contenteditable]:not([contenteditable="false"]),[translate="no"],option:not([value])';
type View={source:string;shown:string};

export function WorkspaceEnglishDisplay(){
  const {language}=useOperatorLanguage();
  const path=usePathname();
  const enabled=language==='en' && /^\/(app|login|register|signup)(\/|$)/.test(path);
  const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    const states=new WeakMap<Node,Map<string,View>>();
    const fail=()=>{if(active)setFailed(true)};
    const field=(node:Text|Element,attr:string)=>{
      const get=()=>node instanceof Text?node.data:node.getAttribute(attr);
      const set=(value:string)=>{if(node instanceof Text)node.data=value;else node.setAttribute(attr,value)};
      const source=get();
      let fields=states.get(node);
      if (fields?.get(attr)?.shown===source) return;
      fields?.delete(attr);
      if (!source||!hasChinese(source))return;
      if (!fields) {fields=new Map();states.set(node,fields)}
      const view={source,shown:source};
      fields.set(attr,view);
      const show=(text:string)=>{
        if(active&&node.isConnected&&fields.get(attr)===view&&get()===view.shown&&text!==view.shown){
          view.shown=text;set(text);
        }
      };
      const known=englishDisplay(source);
      if(!hasChinese(known))show(known);
      else void translateDisplayText(source).then(show,fail);
    };
    const accept=(el:Element|null)=>!!el&&!el.closest(excluded);
    const visit=(node:Node)=>{
      if(node instanceof Text){if(accept(node.parentElement))field(node,'');return}
      if(!(node instanceof Element)||!accept(node))return;
      for(const attr of attributes)if(node.hasAttribute(attr))field(node,attr);
      for(const child of node.childNodes)visit(child);
    };
    const observer=new MutationObserver(changes=>{
      for(const change of changes){
        if(change.type==='childList'){for(const node of change.addedNodes)visit(node)}
        else if(change.type==='characterData')visit(change.target);
        else if(change.target instanceof Element && change.attributeName && accept(change.target))field(change.target,change.attributeName);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});
    visit(document.body);
    const title=document.querySelector('title')?.firstChild;
    if(title instanceof Text)field(title,'');
    window.addEventListener('staycraft-translation-failed',fail);
    return ()=>{
      active=false;observer.disconnect();window.removeEventListener('staycraft-translation-failed',fail);
      const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
      for(let node=walker.nextNode();node;node=walker.nextNode()){
        for(const [attr,{source,shown}] of states.get(node)??[]){
          if(node instanceof Text&&node.data===shown)node.data=source;
          else if(node instanceof Element&&node.getAttribute(attr)===shown)node.setAttribute(attr,source);
        }
      }
    };
  },[enabled,retry,path]);
  if(!enabled||!failed)return null;
  return <p role="status">Some text could not be translated. <button type="button" onClick={()=>{setFailed(false);setRetry(n=>n+1);window.dispatchEvent(new Event('staycraft-translation-retry'))}}>Retry translation</button></p>;
}
