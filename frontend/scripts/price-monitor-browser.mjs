import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import path from 'node:path';

// Windows already supplies Edge. Its dedicated persistent profile is shared by
// the login and collection windows, separate from the user's everyday browser.
export function launchPriceBrowser(profile,options={}){
 const edge=process.platform==='win32'&&[process.env['PROGRAMFILES(X86)'],process.env.PROGRAMFILES,process.env.LOCALAPPDATA]
  .some(root=>root&&existsSync(path.join(root,'Microsoft','Edge','Application','msedge.exe')));
 return chromium.launchPersistentContext(edge?profile+'-edge':profile,{
  headless:false,locale:'zh-CN',viewport:{width:1366,height:940},timeout:30000,
  ...(edge?{channel:'msedge'}:{}),...options,
 });
}
