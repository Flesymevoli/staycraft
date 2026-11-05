const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file){const mod=new Module(file);mod.require=name=>name.endsWith('.css')?{}:name.startsWith('@/')?load(path.resolve('src',name.slice(2))+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return mod.exports;}
const {BookingTrend}=load(path.resolve('src/components/booking-trend.tsx'));
const data={source:'test',period_start:'2026-11-06',period_end:'2026-11-08',booked_pct:20,booked_room_nights:3,amount_cents:15000,average_booked_rate_cents:5000,daily:[{date:'2026-11-06',booked:1,booked_pct:20,order_room_nights:1,amount_cents:5000},{date:'2026-11-07',booked:0,booked_pct:0,order_room_nights:0,amount_cents:0},{date:'2026-11-08',booked:2,booked_pct:40,order_room_nights:2,amount_cents:10000}]};
const render=(metric,overrides={},selected=null)=>renderToStaticMarkup(React.createElement(BookingTrend,{data:{...data,...overrides},metric,zh:true,selected,onSelect(){}}));
for(const metric of ['occupancy','booking','amount','adr']){const html=render(metric);assert(!/NaN|Infinity|linearGradient/.test(html));assert(html.includes('选择预订图表日期'));assert(html.includes('每点代表一天'));}
const gaps=render('adr');assert.equal((gaps.match(/class="chart-data-line"/g)||[]).length,2,'Missing average must split line');
assert(render('adr',{},1).includes('均价缺失，不按零元显示'));
assert(render('occupancy',{historical_inventory_unknown:true,daily:data.daily.map(d=>({...d,booked_pct:null}))}).includes('历史房量未知，无法绘制占用率图'));
assert(!render('occupancy',{daily:[]}).includes('<svg'));
assert(!/NaN|Infinity/.test(render('amount',{daily:[data.daily[0]]})));
assert(!/NaN|Infinity/.test(render('amount',{},999)));
console.log('PASS chart presentation: four metrics, null gaps, unknown history, empty/single-day/stale selection and accessible labels; no live calls.');
