import "@/components/workbench.css";
import Image from "next/image";
import "./loading.css";

export default function WorkspaceLoading() {
  return <main className="workbench-loading" aria-busy="true"><Image src="/brand/staycraft-violet-yellow.png" alt="StayCraft" width={2172} height={724} priority className="workbench-loading-logo"/><div className="workbench-loading-skeleton" aria-hidden="true"><span/><span/><span/></div><p role="status">正在打开工作台…</p></main>;
}
