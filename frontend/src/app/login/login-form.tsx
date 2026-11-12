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
    email: "Username or email",
    password: "Password",
    submit: "Sign in",
    loading: "Signing in…",
    missing: "Enter your username or email and password, then try again.",
    invalid: "We couldn't verify those details. Check them and try again.",
    unavailable: "Sign-in is unavailable right now. Please try again later.",
    demo: "View the interactive prototype",
  },
  zh: {
    title: "欢迎回来。",
    subtitle: "登录你的民宿工作台。",
    email: "用户名或邮箱",
    password: "密码",
    submit: "登录",
    loading: "正在登录…",
    missing: "请输入用户名或邮箱和密码后重试。",
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
      <Link href="/" className="auth-brand" aria-label={language==='zh'?'StayCraft 首页':'StayCraft home'}><Image src="/brand/StayCraft-main-HD.png" alt="StayCraft" width={4102} height={1058} priority unoptimized /></Link>
      <button type="button" className="auth-language" aria-label={language==='zh'?'切换为英文':'Switch to Chinese'} onClick={() => setLanguage(language === "en" ? "zh" : "en")}>{language === "en" ? "中文" : "EN"}</button>
    </header>
    <aside className="auth-intro"><span>STAYCRAFT / DECISION WORKBENCH</span><h2>{language==='zh'?'每一个经营判断，\n都有迹可循。':'Every decision,\nbacked by evidence.'}</h2><p>{language==='zh'?'把订单、房态和酒店市场报价连在一起。AI 主动调查，你专注于下一步。':'Connect bookings, room data and hotel market prices. AI investigates so you can focus on your next move.'}</p><ol><li>{language==='zh'?'整合你的经营数据':'Connect your business data'}</li><li>{language==='zh'?'让 AI 主动展开调查':'Let AI investigate proactively'}</li><li>{language==='zh'?'带着依据，决定下一步':'Choose your next step with evidence'}</li></ol></aside>
    <main id="auth-main" tabIndex={-1} className="auth-main">
      <h1>{register?(language==='zh'?'创建账号。':'Create an account.'):t.title}</h1>
      <p className="auth-subtitle">{register?(language==='zh'?'开始管理你的民宿。':'Start your homestay workspace.'):t.subtitle}</p>
      {confirmationFailed&&<p role="alert" className="auth-error">{language==='zh'?'未能在此窗口建立登录会话。如果已确认邮箱，请返回原窗口登录。':'This window could not start a session. If you confirmed your email, return to the original window and sign in.'}</p>}
      <form key={register?'signup':'login'} action={register?signupAction:action} className="auth-card">
        <label htmlFor="email">{register?(language==='zh'?'用户名':'Username'):t.email}</label>
        <input id="email" name={register?'username':'email'} type="text" autoComplete="username" spellCheck={false} autoCapitalize="none" minLength={register?3:undefined} maxLength={register?32:254} aria-describedby={register?'username-hint':undefined} required />
        {register&&<small id="username-hint">{language==='zh'?'3–32 位字母、数字或 . _ -，以字母或数字开头和结尾，不区分大小写。':'3–32 letters, numbers or . _ -. Start and end with a letter or number. Case-insensitive.'}</small>}
        <label htmlFor="password">{t.password}</label>
        <input id="password" name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:undefined} placeholder={register?(language==='zh'?'至少 8 位':'At least 8 characters'):undefined} required />
        {!register&&state?.error && <p role="alert" className="auth-error">{t[state.error]}</p>}
        {register&&signupState?.error&&<p role="alert" className="auth-error">{signupState.error==='sample'?(language==='zh'?'当前为隔离测试环境，请使用测试账号登录。':'This isolated test environment uses test accounts.'):signupState.error==='password'?(language==='zh'?'密码至少需要 8 位。':'Use at least 8 characters.'):signupState.error==='username'?(language==='zh'?'请按要求填写用户名，不能包含空格或连续的点。':'Enter a valid username without spaces or consecutive dots.'):signupState.error==='taken'?(language==='zh'?'该用户名已被使用，请换一个。':'This username is already in use. Choose another.'):signupState.error==='confirmation_required'?(language==='zh'?'用户名注册服务尚未开通，请稍后重试或使用已有账号登录。':'Username registration is not enabled yet. Try later or sign in with an existing account.'):signupState.error==='failed'?(language==='zh'?'注册未成功，请检查用户名和密码后重试。':'Could not register. Check your username and password.'):t.unavailable}</p>}
        {!configured && <p role="status" className="auth-setup">{language === "zh" ? "登录服务尚未配置，当前可查看交互原型。" : "Sign-in is not configured yet. The interactive prototype is available."}</p>}
        <button className="auth-submit" type="submit" disabled={busy || !configured}>{register?(signupPending?(language==='zh'?'正在注册…':'Creating…'):(language==='zh'?'注册':'Create account')):pending ? t.loading : t.submit}</button>
        <button type="button" className="auth-switch" disabled={busy} onClick={()=>setRegister(!register)}>{register?(language==='zh'?'已有账号？去登录':'Already registered? Sign in'):(language==='zh'?'还没有账号？注册':'New here? Create an account')}</button>
      </form>
      {prototypeAvailable&&<a className="auth-demo-link" href="/native-home">{t.demo} <span aria-hidden="true">→</span></a>}
    </main>
  </div>;
}
