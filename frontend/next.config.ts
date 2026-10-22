import type {NextConfig} from "next";
const hosted=process.env.VERCEL==="1"||process.env.STAYCRAFT_HOSTED==="1";
if(hosted&&process.env.STAYCRAFT_OPERATOR_SAMPLE==="1")throw new Error("Operator samples must run in a separate local process.");
if(hosted){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key.startsWith("sb_publishable_"))throw new Error("Hosted deployments require a valid Supabase URL and publishable key.");
 if(process.env.HOMESTAY_LOCAL_DATA==="1")throw new Error("Local demo data must be disabled in hosted deployments.");
}
const nextConfig:NextConfig={devIndicators:false,poweredByHeader:false,async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"X-Frame-Options",value:"DENY"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}];}};
export default nextConfig;
