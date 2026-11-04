"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {operatorSample} from '@/lib/operator-sample';

export async function signInDemo():Promise<LoginState>{
 const sample=operatorSample(),email=sample?'demo@example.invalid':process.env.DEMO_LOGIN_EMAIL,password=sample?'staycraft-demo':process.env.DEMO_LOGIN_PASSWORD;
 if(!email||!password||!hasSupabaseConfig())return {error:'unavailable'};
 try{
  const supabase=await createClient();
  const {data:current}=await supabase.auth.getUser();
  if(!current.user){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)return {error:'unavailable'};}
 }catch{return {error:'unavailable'}}
 redirect('/app');
}

export type LoginState = { error: "invalid" | "unavailable" | "missing" } | undefined;

export type SignupState = { error?: "missing" | "password" | "unavailable" | "sample" | "failed"; sent?: boolean } | undefined;

export async function signUp(_previous: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "missing" };
  if (password.length < 8) return { error: "password" };
  if (operatorSample()) return { error: "sample" };
  if (!hasSupabaseConfig()) return { error: "unavailable" };
  let signedIn = false;
  try {
    const origin = (await headers()).get("origin");
    if (!origin) return { error: "unavailable" };
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/callback", origin).href } });
    if (error) return { error: "failed" };
    signedIn = Boolean(data.session);
  } catch { return { error: "unavailable" }; }
  if (signedIn) redirect("/app");
  return { sent: true };
}

export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missing" };
  if (!hasSupabaseConfig()) return { error: "unavailable" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "invalid" };
  } catch {
    return { error: "unavailable" };
  }

  redirect("/app");
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
