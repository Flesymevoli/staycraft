// Deterministic detection and opportunity contract. Detectors own the numbers; the model only cites them.
import type {CompetitorAnchor,LocalEvent,WeatherDay} from '../signals/types';
export type DetectorKind='booking_pace'|'cancellation_rate'|'channel_mix'|'price_volume_divergence'|'gap_window';
export type DetectorSignal={id:string;kind:DetectorKind;window:{start:string;end:string};metric:{name:string;unit:'pct'|'cny'|'room_nights'|'count';value:number|null};baseline:{kind:'same_weekday_history'|'same_lead_snapshot'|'prior_period'|'capacity_ratio';value:number|null;samples:number};threshold:{op:'gt'|'lt'|'outside';value:number};severity:'high'|'medium'|'low';confidence:'high'|'medium'|'low';evidenceIds:string[];unknowns:string[]};
export type OpportunityAction={title:string;target:'data'|'market'|'promotion'|'diagnosis'};
export type Opportunity={id:string;kind:'risk'|'opportunity';title:string;window:{start:string;end:string};claim:string;basis:DetectorSignal[];anchors?:CompetitorAnchor[];events?:LocalEvent[];weather?:WeatherDay[];actions:OpportunityAction[];coverage:string;unknowns:string[]};
export type ActionPlanItem={id:string;title:string;dueDate?:string;status:'planned'|'done'|'dismissed'};
export type ActionPlan={id:string;runId:string;opportunityId:string;createdAt:string;items:ActionPlanItem[];followUpAt:string;metricBaseline:{name:string;value:number|null;direction?:'higher_better'|'lower_better';window?:DetectorSignal['window'];unit?:DetectorSignal['metric']['unit'];kind?:DetectorKind;comparison?:DetectorSignal['baseline']['kind']}};
