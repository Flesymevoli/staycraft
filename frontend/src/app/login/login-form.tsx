"use client";

import { useActionState } from "react";
import { useOperatorLanguage } from "@/components/operator-language";
import { signIn, type LoginState } from "./actions";

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

export function LoginForm({ configured,prototypeAvailable=true,sample=false }: { configured: boolean;prototypeAvailable?:boolean;sample?:boolean }) {
  const {language, setLanguage} = useOperatorLanguage();
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);
  const t = messages[language];

  return <div className="auth-page">
    <header className="auth-header">
      <span className="auth-kicker">STAYCRAFT</span>
      <button type="button" className="auth-language" onClick={() => setLanguage(language === "en" ? "zh" : "en")}>{language === "en" ? "中文" : "EN"}</button>
    </header>
    <main className="auth-main">
      <h1>{t.title}</h1>
      <p className="auth-subtitle">{t.subtitle}</p>
      {sample&&<p className="auth-subtitle">本机虚构演示<br/>demo@example.invalid / staycraft-demo<br/>修改重启即还原，不连接云端。</p>}
      <form action={action} className="auth-card">
        <label htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">{t.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {state?.error && <p role="alert" className="auth-error">{t[state.error]}</p>}
        {!configured && <p role="status" className="auth-setup">{language === "zh" ? "登录服务尚未配置，当前可查看交互原型。" : "Sign-in is not configured yet. The interactive prototype is available."}</p>}
        <button className="auth-submit" type="submit" disabled={pending || !configured}>{pending ? t.loading : t.submit}</button>
      </form>
      {prototypeAvailable&&<a className="auth-demo-link" href="/native-home">{t.demo} <span aria-hidden="true">→</span></a>}
    </main>
  </div>;
}
