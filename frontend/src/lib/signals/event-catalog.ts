import type {LocalEvent} from './types';

// Venue coordinates use GCJ-02. Catalog entries retain the page used to check event details.
type CityEvent = {
 event: LocalEvent;
 point: {latitude:number;longitude:number};
 demoDistanceKm?: number;
};

function sourcedEvent(input: Pick<LocalEvent,'id'|'title'|'start'|'end'|'venue'|'category'|'sourceUrl'> & {note:string}, observedAt='2026-11-10T16:39:37.911Z'): LocalEvent {
 const {note,...event}=input;
 return {...event,observedAt,verified:true,source:{id:'events',authority:'public',observedAt,coverage:{from:event.start,to:event.end,kind:'partial'},confidence:'medium',note}};
}

// Shanghai East Road 98 is next to the library at 100. Use the cultural center area for an approximate distance.
const taicangTheatreArea={latitude:31.457266,longitude:121.133778};
const theatreCollectedAt="2026-11-11T06:35:00.000Z";
const theatreVenue="太仓大剧院 · 太仓市上海东路98号";
const theatreDistanceNote="距离按行政文化中心范围估算。";

const taicang: CityEvent[] = [
 {event:sourcedEvent({id:'tc-2026-11-dance',title:'精品舞蹈专场',start:'2026-11-14',end:'2026-11-14',venue:theatreVenue,category:'concert',sourceUrl:'https://goupiaotong.cn/mobile/Product/69523.shtml',note:'日期及场馆来自演出票务页。'+theatreDistanceNote},theatreCollectedAt),point:taicangTheatreArea},
 {event:sourcedEvent({id:'tc-2026-11-poetry-concert',title:'《诗乐无界》中央歌剧院经典艺术歌曲专场音乐会',start:'2026-11-15',end:'2026-11-15',venue:theatreVenue,category:'concert',sourceUrl:'https://goupiaotong.cn/mobile/Product/67207.shtml',note:'日期及场馆来自演出票务页。'+theatreDistanceNote},theatreCollectedAt),point:taicangTheatreArea},
 {event:sourcedEvent({id:'tc-2026-11-zhenghe',title:'儿童剧《郑和·东方宝船》秋假专场',start:'2026-11-17',end:'2026-11-17',venue:theatreVenue,category:'concert',sourceUrl:'https://m.weibo.cn/2/detail/5363331381854363',note:'采用太仓大剧院公告明确列出的 11 月 17 日场次。'+theatreDistanceNote},theatreCollectedAt),point:taicangTheatreArea},

 {event:sourcedEvent({id:'tc-2026-11-library-art',title:'太仓市图书馆：四时与小物——赵夏橦个人项目',start:'2026-10-17',end:'2026-11-29',venue:'太仓市上海东路100号 太仓市图书馆',category:'exhibition',sourceUrl:'https://visitsz.wglj.suzhou.com.cn/festival-detail.aspx?id=2026101909345701',note:'苏州市文广旅局官方节庆日历发布，展期已核验；距离为直线估算'}), point:{latitude:31.457266,longitude:121.133778}, demoDistanceKm:5},
 {event:sourcedEvent({id:'tc-2026-11-artist-solo',title:'太仓美术馆：从太仓走来——本土艺术家作品风采展（邢曦峰）',start:'2026-10-20',end:'2026-11-20',venue:'太仓市半泾南路3号 太仓美术馆',category:'exhibition',sourceUrl:'https://visitsz.wglj.suzhou.com.cn/festival-detail.aspx?id=2026102109184801',note:'苏州市文广旅局官方节庆日历发布，展期已核验；距离为直线估算'}), point:{latitude:31.453539,longitude:121.130745}, demoDistanceKm:6},
 {event:sourcedEvent({id:'tc-2026-11-youth-art',title:'太仓美术馆：江海潮生·第四届青年美术家作品展',start:'2026-11-05',end:'2026-12-05',venue:'太仓市半泾南路3号 太仓美术馆5号展厅',category:'exhibition',sourceUrl:'https://visitsz.wglj.suzhou.com.cn/festival-detail.aspx?id=2026110209064901',note:'苏州市文广旅局官方节庆日历发布，展期已核验；距离为直线估算'}), point:{latitude:31.453539,longitude:121.130745}, demoDistanceKm:6},
 {event:sourcedEvent({id:'tc-2026-11-bird-flower',title:'太仓美术馆：苍笔清姿——张小芹写意花鸟个展',start:'2026-10-30',end:'2026-11-29',venue:'太仓市半泾南路3号 太仓美术馆',category:'exhibition',sourceUrl:'https://visitsz.wglj.suzhou.com.cn/festival-detail.aspx?id=2026110209015301',note:'苏州市文广旅局官方节庆日历发布，展期已核验；距离为直线估算'}), point:{latitude:31.453539,longitude:121.130745}, demoDistanceKm:6},
];

const zhejiangArtMuseum = {latitude:30.231049, longitude:120.156894}; // https://ditu.amap.com/place/B023B0BMJ6
const hangzhou: CityEvent[] = [
 {
  event:sourcedEvent({
   id:'hz-zjam-2918', title:'花影缤纷——张世简百年诞辰纪念展',
   start:'2026-11-01', end:'2026-11-21', category:'exhibition',
   venue:'浙江美术馆11、12号展厅 · 杭州市西湖区南山路138号（周一闭馆）',
   sourceUrl:'https://www.zjam.org.cn/Site/Exbition/ExbitionDetail.aspx?etid=2918&type=1',
   note:'日期、展厅和参观时间来自浙江美术馆官网。',
  },"2026-11-11T02:19:23.053Z"),
  point:zhejiangArtMuseum,
 },
 {
  event:sourcedEvent({
   id:'hz-zjam-2917', title:'清风徐来——徐伯清百年诞辰艺术展',
   start:'2026-11-03', end:'2026-11-15', category:'exhibition',
   venue:'浙江美术馆7、8、9号展厅 · 杭州市西湖区南山路138号（周一闭馆）',
   sourceUrl:'https://www.zjam.org.cn/Site/Exbition/ExbitionDetail.aspx?etid=2917&type=1',
   note:'日期、展厅和参观时间来自浙江美术馆官网。',
  },"2026-11-11T02:19:23.053Z"),
  point:zhejiangArtMuseum,
 },
];

export const cityEvents = {taicang,hangzhou};
