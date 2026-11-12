export const decisionQuestions = {
 vacancy: {
  group: "operating", label: ["Which dates should I promote first?", "这周哪天最空，先推哪几天？"],
  required: ["Recorded bookings and active room inventory", "已记录订单、启用客房和逐日可售房量"],
  optional: ["Nearby events", "周边活动"], coverage: ["Upcoming dates in the selected period", "所选周期内的未来住宿日期"],
 },
 pace: {
  group: "operating", label: ["Are bookings coming in more slowly than last week?", "进单比上周慢了吗？"],
  required: ["Booking snapshots taken at the same lead time", "两周同一提前天数的预订快照"],
  optional: ["Channel and room type", "渠道、房型"], coverage: ["Two comparable seven-day stay windows", "两段可比的 7 天入住周期"],
 },
 channels: {
  group: "operating", label: ["Am I relying too much on one booking channel?", "订单都来自一个渠道，正常吗？"],
  required: ["Orders with source channel and status", "带来源渠道与订单状态的订单"],
  optional: ["Channel fees and a comparable prior period", "渠道费用、上一可比周期"], coverage: ["Orders overlapping the selected stay period", "与所选住宿周期重叠的订单"],
 },
 events: {
  group: "market", label: ["For nearby event dates, should I raise rates or keep rooms ready?", "周边有活动的那几天，该涨价还是备房？"],
  required: ["Verified nearby event dates and overlapping availability", "已核实的周边活动日期、同期可售房量"],
  optional: ["Comparable prices and prior booking performance", "同口径报价、历史预订表现"], coverage: ["Overlapping upcoming stay dates", "重叠的未来住宿日期"],
 },
 positioning: {
  group: "market", label: ["Is my rate high or low compared with similar stays?", "我的价格在同行里偏高还是偏低？"],
  required: ["Own offer and peer quotes matched by stay date, room, guest count, breakfast, cancellation and taxes", "同入住日、房型、人数、早餐、取消和含税口径的本店与同行报价"],
  optional: ["Several independent comparable properties", "多家独立同类民宿"], coverage: ["Same upcoming stay date and quote conditions", "同一未来入住日及报价条件"],
 },
 progress: {
  group: "review", label: ["Has the metric in my last action plan improved?", "上次的行动计划，有没有改善？"],
  required: ["A saved baseline and a later comparable diagnosis", "已保存的行动基线和之后同口径的诊断"],
  optional: ["Action completion record", "行动完成记录"], coverage: ["From plan creation to the latest comparable diagnosis", "计划创建至最新可比诊断"],
 },
} as const;

export type DecisionQuestionId = keyof typeof decisionQuestions;
export const decisionQuestionIds = Object.keys(decisionQuestions) as DecisionQuestionId[];

export function isDecisionQuestionId(value: unknown): value is DecisionQuestionId {
 return typeof value === "string" && Object.hasOwn(decisionQuestions, value);
}
