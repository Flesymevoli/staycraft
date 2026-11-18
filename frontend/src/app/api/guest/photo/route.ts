import {retiredGuestResponse} from "@/lib/retired-guest";

export const dynamic="force-dynamic";
export function GET(){return retiredGuestResponse();}
