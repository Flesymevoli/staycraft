import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
export async function accountProperty(supabase:SupabaseClient,userId:string){
 const read=()=>supabase.from("properties").select("id,name").eq("owner_user_id",userId).maybeSingle();
 let result=await read();if(result.error)throw new Error("property_unavailable");if(result.data)return result.data;
 const created=await supabase.from("properties").insert({owner_user_id:userId,name:"我的民宿"}).select("id,name").single();
 if(!created.error&&created.data)return created.data;
 // Two tabs may initialize concurrently. The unique owner constraint is authoritative.
 if(created.error?.code==="23505"){result=await read();if(!result.error&&result.data)return result.data;}
 throw new Error("property_unavailable");
}
