from pathlib import Path
p = Path('src/components/analysis-client.tsx')
s = p.read_text(encoding='utf-8')
for key in ['occupancy', 'booking', 'rate', 'demand', 'satisfaction']:
    start = s.index('<button type="button" aria-pressed={metric === "' + key + '"}')
    end = s.index('</button>', start)
    s = s[:end] + '{metricHint("' + key + '")}' + s[end:]
start = s.index('      {metric === "demand" &&')
end = s.index('      {metric === "satisfaction"', start)
s = s[:start] + '''      {metric === "demand" && <section className="analysis-main-card analysis-metric-panel" id="demand-detail">
        <div className="analysis-metric-title"><h2>{t("Market demand", "市场需求")}</h2><small>{t("Sample data", "示例数据")}</small></div>
        <p>{t("September 2026 · Local accommodation demand", "2026 年 9 月 · 周边住宿需求")}</p>
        <div className="analysis-demand-summary"><strong>{t("Sep 26 is the monthly peak", "9 月 26 日为本月高峰")}</strong><span>{t("Demand index 92 / 100", "需求指数 92 / 100")}</span></div>
        <p>{t("Higher scores mean stronger local demand, not your occupancy rate.", "指数越高，周边住宿需求越强；不代表你的入住率。")}</p>
        <svg className="analysis-demand-chart" viewBox="0 0 360 210" role="img" aria-label={t("September sample demand index, from 0 to 100. Peak: September 26, 92.", "9 月示例需求指数，范围 0 至 100。9 月 26 日最高，为 92。") }>
          {[0,50,100].map(value => <g key={value}><line x1="32" x2="344" y1={170-value*1.3} y2={170-value*1.3} stroke="#dde3ea" strokeDasharray={value ? "3 4" : undefined}/><text x="25" y={174-value*1.3} textAnchor="end" fontSize="11" fill="#61656d">{value}</text></g>)}
          <polyline points={exploreDays.map((entry,index)=>`${32+index*312/29},${170-entry.score*1.3}`).join(" ")} fill="none" stroke="#8bb3e1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={32+25*312/29} x2={32+25*312/29} y1="32" y2="170" stroke="#527faf" strokeDasharray="3 4" />
          <circle cx={32+25*312/29} cy={170-92*1.3} r="4" fill="#0a84ff" stroke="white" strokeWidth="2" />
          <text x={32+25*312/29} y="23" textAnchor="end" fill="#35648f" fontSize="11">{t("Sep 26 · 92", "9/26 · 92")}</text>
          {[1,10,20,30].map(day => <text key={day} x={32+(day-1)*312/29} y="195" textAnchor={day===1?"start":day===30?"end":"middle"} fill="#61656d" fontSize="11">{zh ? `9/${day}` : `Sep ${day}`}</text>)}
        </svg>
        <p>{t("In this demo, weekends have stronger demand, with a local event on Sep 26. Use this as context for promotions.", "示例中周末需求较强，9 月 26 日设有周边活动，可作为安排推广的参考。")}</p>
        <Link href="/native-explore">{t("Explore local opportunities", "查看周边机会")} <ArrowRight size={15}/></Link>
      </section>}
''' + s[end:]
p.write_text(s, encoding='utf-8')
