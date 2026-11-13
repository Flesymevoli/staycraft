import type {DecisionAgentRun, AgentEvidence} from './decision-agent-types';

export type DiagnosisLanguage = 'zh' | 'en';
export type DiagnosisTranslation = {texts: string[]};

// Translate display prose only. IDs, dates, values, claims, saved snapshots and
// action-plan state stay owned by the original diagnosis.
export function mapDiagnosisText(run: DecisionAgentRun, text: (value: string) => string): DecisionAgentRun {
 const evidence = (item: AgentEvidence) => ({...item, title:text(item.title), facts:item.facts.map(text)});
 return {...run, summary:text(run.summary),
  findings:run.findings.map(item=>({...item,title:text(item.title),conclusion:text(item.conclusion),reason:text(item.reason),action:text(item.action),uncertainty:text(item.uncertainty)})),
  evidence:run.evidence.map(evidence), limitations:run.limitations.map(text),
  steps:run.steps.map(item=>({...item,label:text(item.label),detail:text(item.detail)})),
  snapshots:run.snapshots?.map(item=>({...item,evidence:evidence(item.evidence)})),
  report:run.report?{...run.report,title:text(run.report.title),summary:text(run.report.summary),
   sections:run.report.sections.map(item=>({...item,title:text(item.title),paragraphs:item.paragraphs.map(text)})),
   recommendations:run.report.recommendations.map(item=>({...item,title:text(item.title),body:text(item.body)})),
   uncertainties:run.report.uncertainties.map(text)}:undefined};
}
export function diagnosisTexts(run: DecisionAgentRun): string[] {
 const values = new Set<string>();
 mapDiagnosisText(run, value=>{if(value.trim())values.add(value);return value});
 return [...values];
}
export function diagnosisLanguage(run: DecisionAgentRun): DiagnosisLanguage {
 return run.language ?? (/[\u3400-\u9fff]/.test(run.report?.summary || run.summary) ? 'zh' : 'en');
}
const numbers = (value:string) => (value.replace(/(?<=\d),(?=\d{3}(?:\D|$))/g,'').match(/\d+(?:\.\d+)?/g)??[]).sort().join('|');
const urls = (value:string) => (value.match(/https?:\/\/[^\s<>]+/g)??[]).sort().join('|');
export function validateTranslation(source:string[], value:unknown): DiagnosisTranslation {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join()!=='texts')throw Error('translation_invalid');
 const texts=(value as DiagnosisTranslation).texts;
 if(!Array.isArray(texts)||texts.length!==source.length||texts.some((text,i)=>typeof text!=='string'||!text.trim()||text.length>Math.max(1200,source[i].length*8)||numbers(text)!==numbers(source[i])||urls(text)!==urls(source[i])))throw Error('translation_invalid');
 return {texts};
}
export function applyTranslation(run:DecisionAgentRun, translation:DiagnosisTranslation):DecisionAgentRun {
 const source=diagnosisTexts(run),valid=validateTranslation(source,translation);
 const dictionary=new Map(source.map((value,index)=>[value,valid.texts[index]]));
 return mapDiagnosisText(run, value=>dictionary.get(value)??value);
}
