import type {ActionPlan,DetectorSignal,Opportunity} from './decisions/types';
import type {SourceRef} from './signals/types';
export type AgentPeriod = {start:string;end:string};
export type AgentMetrics = {bookedPct:number|null;bookedRoomNights:number;capacityRoomNights:number;availableRoomNights:number;amountCents:number|null;activeRooms:number;averageBookedRateCents?:number|null;listedRateMin?:number|null;listedRateMax?:number|null};
export type AgentEvidence = {id:string;kind:'metrics'|'inventory'|'market'|'bookings'|'revenue'|'weather'|'events'|'competitor';title:string;source:string;capturedAt:string;period?:AgentPeriod;periodEnd?:'inclusive'|'exclusive';facts:string[];href?:string};
export type AgentStep = {id:string;label:string;status:'completed'|'failed';tool?:string;detail:string;durationMs:number;phase?:string;finishReason?:string;usage?:{promptTokens:number;completionTokens:number};errorCode?:string};
export type AgentNextAction = {kind:'review_data'|'research_market'|'plan_promotion'|'observe';period:AgentPeriod;evidenceIds:string[];target:'data'|'market'|'promotion'|'diagnosis'};
export type AgentDailyMetric = {date:string;booked:number;capacity:number|null;available:number|null;bookedPct:number|null;amountCents:number|null};
export type AgentFinding = {id:string;title:string;severity:'high'|'medium'|'low';conclusion:string;action:string;reason:string;evidenceIds:string[];uncertainty:string;nextAction?:AgentNextAction};
export type AgentMarket = {snapshot?:{capturedAt:string;fictional:boolean};query?:{location:string;rooms:number;adults:number;nights:number;limit:number};start:string;end:string;count:number;currency:'CNY';low:number|null;high:number|null;hotels:{name:string;price:number|null;currency:string;conditions:string}[]};
export type DecisionAgentRun = {id:string;status:'completed'|'limited'|'unavailable';engine:'model_v1'|'rules_v1';modelProvider?:'course'|'deepseek_official';generatedAt:string;period:AgentPeriod;summary:string;metrics:AgentMetrics;dailyMetrics?:AgentDailyMetric[];findings:AgentFinding[];steps:AgentStep[];evidence:AgentEvidence[];market?:AgentMarket;limitations:string[];phase?:'investigated'|'writing'|'complete'|'writing_failed';report?:FullAgentReport;snapshots?:AgentSnapshot[];errorCode?:string;dataMode?:'fictional_demo'|'recorded_property_data';reportDraft?:string;reportAttempts?:number;signals?:DetectorSignal[];signalSources?:SourceRef[];opportunities?:Opportunity[];actionPlan?:ActionPlan;findingsSource?:'model'|'rules'};
export type DecisionAgentResponse = {run:DecisionAgentRun;cached:boolean;historyAvailable?:boolean};
export type AgentHistoryItem={id:string;status:string;engine:string|null;createdAt:string;completedAt:string|null;period:AgentPeriod;summary:string};

export type AgentSnapshot={evidence:AgentEvidence;data:Record<string,unknown>};
export type ReportClaim={evidenceId:string;path:string;value:number|string|boolean|null};
export type ReportSection={title:string;paragraphs:string[];evidenceIds:string[];claims:ReportClaim[]};
export type FullAgentReport={version:1;title:string;period:AgentPeriod;updatedAt:string;summary:string;sections:ReportSection[];recommendations:{title:string;body:string;priority:'high'|'medium'|'low';evidenceIds:string[];findingId?:string}[];uncertainties:string[]};
