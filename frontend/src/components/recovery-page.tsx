"use client";

import Link from "next/link";
import {useOperatorLanguage} from "./operator-language";
import "./recovery-page.css";

export function RecoveryPage({missing=false,retry}:{missing?:boolean;retry?:()=>void}){
 const {language}=useOperatorLanguage(),zh=language==="zh";
 return <main className="recovery-page"><section aria-labelledby="recovery-title">
  <span className="recovery-brand">STAYCRAFT {missing?"· 404":""}</span>
  <h1 id="recovery-title">{missing?(zh?"这个页面不存在":"Page not found"):(zh?"页面暂时无法打开":"This page could not be opened")}</h1>
  <p>{missing?(zh?"链接可能已失效，你可以返回工作台继续操作。":"The link may be out of date. Return to your workspace to continue."):(zh?"请重试。若刚才提交过操作，请先核对保存结果，再决定是否重新提交。":"Please try again. If you just submitted a change, check whether it was saved before submitting again.")}</p>
  <div>{retry&&<button type="button" onClick={retry}>{zh?"重新加载":"Try again"}</button>}<Link href="/app">{zh?"返回工作台":"Back to workspace"}</Link><Link href="/login">{zh?"前往登录":"Go to sign in"}</Link></div>
 </section></main>;
}
