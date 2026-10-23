"use client";
import {RecoveryPage} from "@/components/recovery-page";

export default function ErrorPage({retry}:{error:Error&{digest?:string};retry:()=>void}){
 return <RecoveryPage retry={retry}/>;
}
