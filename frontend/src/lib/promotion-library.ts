import type {PromotionBrief} from './promotion';

// Each entry is a complete editable draft. Keep publishing tips outside the copy.
const ordinary = [
  ['城市太吵，来坐坐。\n\n把消息提醒关小一点，把周末留给自己。今晚不用赶行程，发一会儿呆也算正事。\n\n私信留下入住日期和人数，我帮你查房。\n\n#周末去哪儿 #慢生活 #说走就走',
   'A quieter weekend starts here.\n\nTurn the notifications down. Leave a little room in the day for doing nothing at all.\n\nMessage us your dates and group size and we’ll check the rooms.\n\n#WeekendAway #SlowTravel'],
  ['下个月，还想约谁一起出来？\n\n比起打卡多少地方，我更喜欢有人围坐聊天，聊到忘了看时间。\n\n评论区留个日期，我帮你看看那几天空不空。\n\n#民宿日常 #朋友小聚 #周末出行',
   'Who would you take away next month?\n\nOur favourite part of a trip is the conversation that makes everyone forget to check the time.\n\nLeave your dates in the comments and we’ll check availability.\n\n#WeekendPlans #TimeTogether'],
  ['周末想出发？先把房间问明白。\n\n发我「周末」和出行人数，我把对应日期的房型、实拍和报价发给你。看好了，再慢慢决定。\n\n#周末出游 #住宿实拍 #民宿推荐',
   'Thinking about this weekend?\n\nSend “weekend”, your dates and your group size. Ask us for room photos and a quote before you decide.\n\n#WeekendTrip #RoomTour'],
  ['想给自己放个假？\n\n这次把行程单留白。醒来再决定去哪儿，累了就回来，住下来也是旅行的一部分。\n\n评论区留出行日期，我帮你查房。\n\n#逃离城市 #慢生活 #短途旅行',
   'Ready for a day off?\n\nLeave a blank page in the itinerary. Choose a walk when you wake up, then come back whenever you like.\n\nComment with your travel dates and we’ll check the rooms.\n\n#SlowTravel #ShortBreak'],
  ['挑住处，你最看重什么？\n\n有人先看床，有人想知道附近怎么走。把你在意的那件小事告诉我，订房前就聊清楚。\n\n第一次来？私信日期，问问当天房价。\n\n#民宿推荐 #旅行住宿 #放心住',
   'What matters to you in a stay?\n\nSome people ask about the bed first. Others want to know their way around. Tell us what you care about before you book.\n\nMessage us for the rate on your dates.\n\n#FindYourStay #TravelPlans'],
];
const discovery = [
  ["睡过那么多酒店，只有这家看懂了我的累\n\n周五下班，把工作群调成免打扰。推开窗吹一会儿风，连发呆都觉得是赚的。\n\n成年人最奢侈的不是年假，是允许自己消失48小时。\n\n📍想给周末留个空？私信日期和人数，我帮你查房。\n\n#逃离城市 #治愈系民宿 #周末出逃",
   "The stay that understood how tired I was\n\nFriday evening. Work chat on mute. An open window and enough time to do absolutely nothing. Sometimes the real luxury is letting yourself disappear for 48 hours.\n\n📍 Send your dates and group size for weekend availability.\n\n#WeekendEscape #SlowTravel"],
  ["好民宿从来不是用来打卡的，是用来休息的\n\n不赶景点，不排网红店，也不凑九宫格。在这趟行程里，赖床才是正经事。\n\n泡杯茶，手机扔一边。等你终于想起看时间，半个下午已经过去了。\n\n📍想短暂“失踪”？评论区留个日期，帮你看看有没有房。\n\n#民宿推荐 #慢生活 #放空自己",
   "A good stay is for resting, not collecting check-ins\n\nSkip the queues and the nine-photo grid. Sleeping late is a perfectly good plan. Make some tea, set the phone aside, and let the afternoon slip by.\n\n📍 Leave your dates and we’ll check the rooms.\n\n#SlowAfternoon #WeekendAway"],
  ["江浙沪打工人出逃计划：两天一夜，给自己充个电\n\n被工作榨干后，最需要的不是鸡汤，是一个能躺平的地方。\n\n把闹钟关掉，把“收到请回复”留在周五。睡到自然醒，再出门吹吹晚风。两天一夜，刚好。\n\n📍周末想出发？私信「充电」和日期，看房型和报价。\n\n#打工人 #周末去哪儿 #江浙沪周边游",
   "A two-day recharge in the Yangtze River Delta\n\nAfter a long week, a pep talk can wait. Turn off the alarm, leave “please confirm” on Friday, and go out for an evening walk when you feel like it.\n\n📍 Message “recharge” and your dates for rooms and rates.\n\n#ShortBreak #WeekendTrip"],
  ["误打误撞住进这家民宿，结果直接躺平不想走了\n\n本来只想找个地方歇脚，结果外套一脱，行李都懒得拆了。\n\n原先列了一长串想去的地方，现在只想把这一页书翻完。旅行偶尔改个计划，也挺好。\n\n📍想看看住的地方？私信「实拍」，挑你在意的角落看。\n\n#宝藏民宿 #住过一次就上头 #周末放空",
   "I came for a stopover and wanted to stay\n\nI put down my bag and never got around to unpacking. There was a whole list of places to see. Suddenly, finishing a chapter felt like a good enough plan.\n\n📍 Ask for a real photo of the corner you care about.\n\n#UnexpectedStay #SlowWeekend"],
  ["再不下手，秋天就要偷偷溜走了～\n\n秋天的第一场旅行，别再拖到下个月。翻出薄外套，约一个愿意陪你走慢点的人，趁晚风微凉，去捡一片喜欢的落叶。🍂\n\n别只在朋友圈里过秋天。\n\n📍评论区留「秋游」和出发日期，我来帮你查空房。\n\n#秋日限定 #周末出游 #秋天去哪儿",
   "Autumn has a way of slipping past\n\nPull out a light jacket and find someone who likes to walk slowly. Take the long way, pick out a fallen leaf, and enjoy autumn somewhere beyond your feed. 🍂\n\n📍 Comment “autumn” and your travel dates for availability.\n\n#AutumnBreak #WeekendWalk"],
];

export function drawPromotionCopy(brief:PromotionBrief, used:number[]) {
  const bank = brief.channel === 'wechat' ? ordinary : discovery;
  const indices = bank.map((_, index) => index);
  const remaining = indices.filter(index => !used.includes(index));
  const options = remaining.length ? remaining : indices.filter(index => index !== used.at(-1));
  const chosen = options[Math.floor(Math.random() * options.length)];
  return {
    content: bank[chosen][brief.language === 'zh' ? 0 : 1],
    used: [...(remaining.length ? used : []), chosen],
  };
}
