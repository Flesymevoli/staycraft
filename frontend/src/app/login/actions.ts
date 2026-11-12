"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig, supabaseConfig } from "@/lib/supabase/config";
import {operatorSample} from '@/lib/operator-sample';
import {loginEmail, normalizeUsername, usernameEmail} from '@/lib/login-identity';

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

export type SignupState = { error: "username" | "password" | "unavailable" | "sample" | "failed" | "taken" | "confirmation_required" } | undefined;

export async function signUp(_previous: SignupState, formData: FormData): Promise<SignupState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username) return { error: "username" };
  if (password.length < 8) return { error: "password" };
  if (operatorSample()) return { error: "sample" };
  if (!hasSupabaseConfig()) return { error: "unavailable" };
  let signedIn = false;
  try {
    // Username identities cannot receive email. Check before creating an account.
    const {url, publishableKey} = supabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {apikey: publishableKey}, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return {error: "unavailable"};
    const settings = await response.json();
    if (settings.disable_signup || settings.external?.email === false) return {error: "unavailable"};
    if (settings.mailer_autoconfirm !== true) return {error: "confirmation_required"};
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: usernameEmail(username), password,
      options: {data: {username, display_name: username}},
    });
    if (error) return { error: error.code === "user_already_exists" || error.code === "email_exists" ? "taken" : "failed" };
    signedIn = Boolean(data.session);
  } catch { return { error: "unavailable" }; }
  if (signedIn) redirect("/app");
  return { error: "confirmation_required" };
}

export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = loginEmail(String(formData.get("email") ?? formData.get("username") ?? ""));
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
