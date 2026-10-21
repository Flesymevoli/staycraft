import "@/components/native-home.css";
import "@/components/workspace.css";

export default function WorkspaceLoading() {
  return <div className="native-shell workspace-shell"><main className="native-page workspace-page">
    <header className="native-header"><span className="native-kicker">STAYCRAFT</span></header>
    <section className="workspace-empty" role="status" aria-live="polite"><p>正在打开工作台…</p></section>
  </main></div>;
}
