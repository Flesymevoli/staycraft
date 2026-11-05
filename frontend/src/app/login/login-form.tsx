"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOperatorLanguage } from "@/components/operator-language";
import { signIn, signUp, type LoginState, type SignupState } from "./actions";

const messages = {
  en: {
    title: "Welcome back.",
    subtitle: "Sign in to your homestay workspace.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    loading: "Signing in…",
    missing: "Enter your email and password, then try again.",
    invalid: "We couldn't verify those details. Check them and try again.",
    unavailable: "Sign-in is unavailable right now. Please try again later.",
    demo: "View the interactive prototype",
  },
  zh: {
    title: "欢迎回来。",
    subtitle: "登录你的民宿工作台。",
    email: "邮箱",
    password: "密码",
    submit: "登录",
    loading: "正在登录…",
    missing: "请输入邮箱和密码后重试。",
    invalid: "账号信息无法验证，请检查后重试。",
    unavailable: "暂时无法登录，请稍后重试。",
    demo: "查看交互原型",
  },
} as const;

export function LoginForm({ configured,prototypeAvailable=true,confirmationFailed=false }: { configured: boolean;prototypeAvailable?:boolean;sample?:boolean;demoAvailable?:boolean;confirmationFailed?:boolean }) {
  const {language, setLanguage} = useOperatorLanguage();
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);
  const [signupState,signupAction,signupPending]=useActionState<SignupState,FormData>(signUp,undefined);
  const [register,setRegister]=useState(false);
  const busy=pending||signupPending;
  const t = messages[language];

  return <div className="auth-page" lang={language==='zh'?'zh-CN':'en'}>
    <a className="auth-skip" href="#auth-main">{language==='zh'?'跳至登录表单':'Skip to sign-in form'}</a>
    <header className="auth-header">
      <Link href="/" className="auth-brand" aria-label={language==='zh'?'StayCraft 首页':'StayCraft home'}><Image src="/brand/staycraft-violet-yellow.png" alt="StayCraft" width={2172} height={724} priority /></Link>
      <button type="button" className="auth-language" aria-label={language==='zh'?'切换为英文':'Switch to Chinese'} onClick={() => setLanguage(language === "en" ? "zh" : "en")}>{language === "en" ? "中文" : "EN"}</button>
    </header>
    <aside className="auth-intro"><span>STAYCRAFT / DECISION WORKBENCH</span><h2>{language==='zh'?'每一个经营判断，\n都有迹可循。':'Every decision,\nbacked by evidence.'}</h2><p>{language==='zh'?'把订单、房态和酒店市场报价连在一起。AI 主动调查，你专注于下一步。':'Connect bookings, room data and hotel market prices. AI investigates so you can focus on your next move.'}</p><ol><li>{language==='zh'?'整合你的经营数据':'Connect your business data'}</li><li>{language==='zh'?'让 AI 主动展开调查':'Let AI investigate proactively'}</li><li>{language==='zh'?'带着依据，决定下一步':'Choose your next step with evidence'}</li></ol></aside>
    <main id="auth-main" tabIndex={-1} className="auth-main">
      <h1>{register?(language==='zh'?'创建账号。':'Create an account.'):t.title}</h1>
      <p className="auth-subtitle">{register?(language==='zh'?'开始管理你的民宿。':'Start your homestay workspace.'):t.subtitle}</p>
      {confirmationFailed&&<p role="alert" className="auth-error">{language==='zh'?'确认链接已失效，请重新注册或登录。':'This confirmation link has expired. Register again or sign in.'}</p>}
      <form key={register?'signup':'login'} action={register?signupAction:action} className="auth-card">
        <label htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} autoCapitalize="none" required />
        <label htmlFor="password">{t.password}</label>
        <input id="password" name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:undefined} placeholder={register?(language==='zh'?'至少 8 位':'At least 8 characters'):undefined} required />
        {!register&&state?.error && <p role="alert" className="auth-error">{t[state.error]}</p>}
        {register&&signupState?.error&&<p role="alert" className="auth-error">{signupState.error==='sample'?(language==='zh'?'本地预览请返回首页体验演示。':'Return to the homepage to try the demo.'):signupState.error==='password'?(language==='zh'?'密码至少需要 8 位。':'Use at least 8 characters.'):signupState.error==='missing'?t.missing:signupState.error==='failed'?(language==='zh'?'注册未成功，请检查邮箱和密码后重试。':'Could not register. Check your email and password.'):t.unavailable}</p>}
        {register&&signupState?.sent&&<p role="status" className="auth-setup">{language==='zh'?'请查收确认邮件，点击链接后即可进入。':'Check your inbox and follow the confirmation link.'}</p>}
        {!configured && <p role="status" className="auth-setup">{language === "zh" ? "登录服务尚未配置，当前可查看交互原型。" : "Sign-in is not configured yet. The interactive prototype is available."}</p>}
        <button className="auth-submit" type="submit" disabled={busy || !configured}>{register?(signupPending?(language==='zh'?'正在注册…':'Creating…'):(language==='zh'?'注册':'Create account')):pending ? t.loading : t.submit}</button>
        <button type="button" className="auth-switch" disabled={busy} onClick={()=>setRegister(!register)}>{register?(language==='zh'?'已有账号？去登录':'Already registered? Sign in'):(language==='zh'?'还没有账号？注册':'New here? Create an account')}</button>
      </form>
      {prototypeAvailable&&<a className="auth-demo-link" href="/native-home">{t.demo} <span aria-hidden="true">→</span></a>}
    </main>
  </div>;
}
