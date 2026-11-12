import type {ReactNode} from "react";
import {renderWorkspaceShell} from "@/lib/workspace";

export default function WorkspaceLayout({children}:{children:ReactNode}){
 return renderWorkspaceShell(children);
}
