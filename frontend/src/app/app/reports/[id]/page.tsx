import {notFound,redirect} from 'next/navigation';
import {verifiedProperty} from '@/lib/workspace-access';
import {agentStore} from '@/lib/decision-agent-store';
import {DiagnosticArticle} from '@/components/diagnostic-article';
export const dynamic='force-dynamic';
export default async function ReportPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f\d-]{36}$/i.test(id))notFound();
 const access=await verifiedProperty().catch(()=>null);if(!access)redirect('/login');
 const saved=await agentStore(access.supabase,access.propertyId).detail(id);if(!saved.run)notFound();
 return <DiagnosticArticle initial={saved.run} running={saved.task?.status==='running'}/>;
}
