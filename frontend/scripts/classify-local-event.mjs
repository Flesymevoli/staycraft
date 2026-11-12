// Keep collector category IDs aligned with EVENT_CATEGORIES in src/lib/signals/types.ts.
const rules = [
  ['exam', /考试|考点|考研|艺考|笔试|招考|(?:公务员|事业单位|教师招聘|研究生|招生).{0,12}面试|admission test|exam(?:ination)?\b/i],
  ['sports', /马拉松|越野跑|联赛|公开赛|锦标赛|龙舟赛|运动会|marathon|tournament/i],
  ['tradeFair', /博览会|交易会|招商会|行业峰会|产业大会|专业展会|trade fair|industry expo/i],
  ['campus', /新生报到|毕业典礼|校园开放日|大学开放日|高校开放日|(?:高校|大学|校园).{0,16}(?:开学典礼|返校日|校庆)|campus open (?:day|house)|university graduation|freshman orientation/i],
  ['market', /市集|集市|夜市|跳蚤市场|创意集|craft fair|flea market/i],
  ['concert', /音乐节|音乐会|演唱会|演出|戏剧|舞台剧|话剧|脱口秀|concert|performance/i],
  ['exhibition', /展览|画展|书画展|作品展|个展|联展|特展|展览馆|exhibition/i],
  ['shoppingDistrict', /(?:商场|商圈|购物中心|商业广场|商业街).{0,20}(?:开业|周年庆|店庆|购物节)|(?:mall|shopping district).{0,20}(?:grand opening|anniversary|shopping festival)/i],
  ['seasonal', /赏花|花季|观鸟|赏枫|采摘|红叶|观潮|花期|blossom season/i],
  ['festival', /春节|元宵|端午|中秋|国庆|新春|跨年|灯会|节庆|lantern festival/i],
];

export function classifyLocalEvent(title) {
  return rules.find(([, pattern]) => pattern.test(title))?.[0] ?? 'other';
}
