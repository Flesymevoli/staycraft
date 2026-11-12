"use client";

import {useState,type CSSProperties} from "react";

export function SegmentedControl<Value extends string>({className,label,options,value,onChange,disabled}:{
 className:string;
 label:string;
 options:readonly {id:Value;label:string}[];
 value:Value;
 onChange:(value:Value)=>void;
 disabled?:boolean;
}){
 const [pointerMotion,setPointerMotion]=useState(false);
 const index=options.findIndex(option=>option.id===value);
 const style={"--segment-count":options.length,"--segment-index":index} as CSSProperties;

 return <div className={`${className} segmented-control`} role="group" aria-label={label}
  data-pointer-motion={pointerMotion} style={style}>
  <span className="segmented-indicator" aria-hidden="true"/>
  {options.map(option=><button key={option.id} type="button" disabled={disabled}
   aria-pressed={value===option.id} onClick={event=>{
    setPointerMotion(event.detail>0);
    onChange(option.id);
   }}>{option.label}</button>)}
 </div>;
}
