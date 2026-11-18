import {englishDisplay} from './english-display';

type Translator = {translate(input:{from:string;to:string;text:string}):Promise<{target:{text:string}}>};
const modulePath = '/translation/local.js';
let engine: Promise<Translator> | undefined;
const cached = new Map<string, Promise<string>>();
export const hasChinese = (text:string) => /\p{Script=Han}/u.test(text);

async function translateLine(source:string):Promise<string> {
  if (!engine) engine = import(/* webpackIgnore: true */ modulePath)
    .then(module=>module.createTranslator()).catch(error=>{engine=undefined;throw error});
  const service=await engine;
  const convert=async (text:string)=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('translation_timeout')),45000)});
    const {target}=await Promise.race([deadline,service.translate({from:'zh',to:'en',text})]).finally(()=>clearTimeout(timer));
    if (!target.text.trim()) throw Error('translation_empty');
    return target.text.trim();
  };
  // Keep URLs and numeric facts exactly as supplied, including dates, rates and percentages.
  const protectedParts=/(https?:\/\/[^\s<>，。；」]+|[¥￥$]?\d+(?:[.,:/–—-]\d+)*(?:%|°C)?)/gu;
  const translated=await convert(source);
  if (JSON.stringify(source.match(protectedParts))===JSON.stringify(translated.match(protectedParts))) return translated;
  const parts=source.split(protectedParts);
  return (await Promise.all(parts.map(async (part,i)=>i%2||!hasChinese(part)?part:await convert(part)))).join(' ').trim();
}

export function translateDisplayText(source:string):Promise<string> {
  const known=englishDisplay(source);
  if (!hasChinese(known)) return Promise.resolve(known);
  const hit=cached.get(source);
  if (hit) return hit;
  const result=Promise.all(known.split(/(\n+)/u).map(line=>hasChinese(line)?translateLine(line):line))
    .then(lines=>lines.join('')).catch(error=>{cached.delete(source);throw error});
  if (cached.size>=1500) cached.delete(cached.keys().next().value!);
  cached.set(source,result);
  return result;
}
