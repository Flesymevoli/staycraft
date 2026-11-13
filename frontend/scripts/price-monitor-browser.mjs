import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Windows already supplies Edge. Its dedicated persistent profile is shared by
// the login and collection windows, separate from the user's everyday browser.
export function launchPriceBrowser(profile,options={}){
 const drive=process.env.SystemDrive||process.env.SYSTEMDRIVE||'C:';
 const edge=process.platform==='win32'&&[
  process.env['PROGRAMFILES(X86)'],process.env.ProgramFiles,process.env.PROGRAMFILES,process.env.LOCALAPPDATA,
  path.join(drive,'Program Files (x86)'),path.join(drive,'Program Files'),path.join(os.homedir(),'AppData','Local'),
 ].filter(Boolean).map(root=>path.join(root,'Microsoft','Edge','Application','msedge.exe')).find(existsSync);
 return chromium.launchPersistentContext(edge?profile+'-edge':profile,{
  headless:false,locale:'zh-CN',viewport:{width:1366,height:940},timeout:30000,
  ...(edge?{executablePath:edge}:{}),...options,
 });
}
