export type TopicId = "Location" | "Cleanliness" | "Breakfast" | "Service";

export const exploreDays = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const weekday = new Date(2026, 8, day).getDay();
  const weekend = weekday === 0 || weekday === 6;
  const event = day === 26;
  const score = event ? 92 : weekend ? 70 + (day % 3) * 5 : 35 + ((day * 7) % 24);
  const low = event ? 460 : weekend ? 440 : 390;
  const high = event ? 590 : weekend ? 570 : 510;
  return { day, weekend, event, score, low, high, rate: 520 };
});

export const exploreTopics: Record<TopicId, {
  chinese: string;
  mentions: number;
  sentiment: [string, string];
  comments: [string, string][];
}> = {
  Location: {
    chinese: "位置", mentions: 26, sentiment: ["Guests love the setting", "客人喜欢这里的位置"],
    comments: [
      ["A peaceful street, with cafés a short walk away.", "街道安静，步行就能到咖啡馆。"],
      ["Easy to find, but the last bus is quite early.", "位置好找，不过末班车有点早。"],
    ],
  },
  Cleanliness: {
    chinese: "清洁", mentions: 24, sentiment: ["Consistently positive", "评价持续正面"],
    comments: [
      ["Fresh linens and a spotless room.", "床品清爽，房间非常干净。"],
      ["The bathroom felt well cared for.", "浴室维护得很好。"],
    ],
  },
  Breakfast: {
    chinese: "早餐", mentions: 18, sentiment: ["Mostly positive", "大多为正面评价"],
    comments: [
      ["Loved the warm breakfast before our morning walk.", "晨间散步前的热早餐很贴心。"],
      ["Fresh and simple. A little more variety would be lovely.", "新鲜简单，如果种类再多一点就更好了。"],
      ["The later breakfast time made our stay more relaxed.", "早餐供应时间晚一些，让住宿更从容。"],
    ],
  },
  Service: {
    chinese: "服务", mentions: 21, sentiment: ["Warm, personal service", "温暖而贴心的服务"],
    comments: [
      ["The host shared thoughtful local tips.", "房东提供了贴心的当地游玩建议。"],
      ["A quick, helpful reply when we arrived late.", "我们晚到时，房东回复迅速并提供帮助。"],
    ],
  },
};
