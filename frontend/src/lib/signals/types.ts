// External-signal contract. Sources are evidence, never instructions.
export type SignalSourceId='orders'|'inventory'|'weather'|'events'|'competitor'|'market';
export type Coverage={from:string;to:string;kind:'complete'|'partial'|'none'};
export type SourceRef={id:SignalSourceId;authority:'internal'|'public'|'manual';observedAt:string;coverage:Coverage;confidence:'high'|'medium'|'low';note?:string};
// Weather codes are WMO codes from Open-Meteo. Null means not returned, never zero.
export type WeatherDay={date:string;code:number;tempMin:number|null;tempMax:number|null;precipProb:number|null;source:SourceRef};
// A maintained calendar entry: the date range is the event window, not a news publish date.
export const EVENT_CATEGORIES = {
 festival:['节日','Festivals'],
 seasonal:['时令','Seasonal'],
 concert:['文艺演出','Performances'],
 sports:['体育赛事','Sports'],
 exhibition:['展览','Exhibitions'],
 market:['市集','Markets'],
 tradeFair:['行业会展','Trade fairs'],
 campus:['高校活动','University events'],
 exam:['教育考试','Education & exams'],
 shoppingDistrict:['商圈活动','Shopping district events'],
 other:['其他','Other'],
} as const;
export type EventCategory=keyof typeof EVENT_CATEGORIES;
export type LocalEvent={id:string;title:string;start:string;end:string;venue?:string;distanceKm?:number;category:EventCategory;sourceUrl:string;observedAt:string;verified:boolean;source:SourceRef};
// One stay date and one quote. Not a market average, range or trend.
export type CompetitorAnchor={id:string;name:string;kind:'independent_homestay'|'comparable_stay';stayDate:string;amountCny:number|null;roomType?:string;meal?:string;cancellation?:string;sourceType:'manual'|'screenshot'|'platform';sourceUrl?:string;capturedAt:string;status:'observed'|'missing'|'conflicting'|'unverified';source:SourceRef};
export type SignalBundle={weather:WeatherDay[];events:LocalEvent[];anchors:CompetitorAnchor[];sources:SourceRef[]};
