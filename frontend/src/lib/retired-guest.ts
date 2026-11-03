// The import-based product has no public booking or guest messaging surface.
// Prefix boundaries matter: /guesthouse must not accidentally match /guest.
export function retiredGuestPath(path:string){
 path=path.toLowerCase();
 return path==="/guest"||path.startsWith("/guest/")||path==="/api/guest"||path.startsWith("/api/guest/")||path==="/api/workspace/automation"||path==="/api/workspace/conversations"||path.startsWith("/api/workspace/conversations/")||path.startsWith("/app/messages/");
}
