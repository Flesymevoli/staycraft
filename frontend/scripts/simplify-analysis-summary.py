from pathlib import Path
p=Path('src/components/analysis-client.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace('ArrowRight, ChevronDown, Plus', 'ArrowRight, ChevronDown')
for line in s.splitlines(True):
    if any(x in line for x in ['const [showWhy,','const [showAction,','const [showRooms,','const chartRef =','const comparisonRef =','const weekdays =','const weekends =','const remaining =','const monThuRemaining =','const opportunityShare =']):
        s=s.replace(line,'')
s=s.replace(' ref={chartRef}','')
start=s.index('      <section className="analysis-compare"')
end=s.index('      </>}',start)
s=s[:start]+s[end:]
anchor='      <p className="analysis-footer">'
summary='''      <section className="analysis-summary-card">
        <div className="analysis-summary-heading"><h2>{t("Your business summary", "经营总结")}</h2><small>{t("AI summary · Sample", "AI 总结 · 示例")}</small></div>
        <p>{t("This week's occupancy is 70%, up 5 percentage points from last week. Weekends are busier than weekdays, so weekday availability is the main opportunity. Next week has 32 of 70 room nights booked, six more than last week at the same lead time.", "本周入住率为 70%，较上周提升 5 个百分点。周末比工作日更满，补充工作日预订仍是主要机会。下周已订 32 / 70 间夜，比上周同一提前期增加 6 间夜，预订进度有所改善。")}</p>
        <p>{t("The sample market signals suggest stronger demand around Sep 26. Your ¥520 rate sits within the ¥460–590 comparison range, while guest ratings average 4.8/5. Together, these suggest testing a targeted weekday promotion before considering a broad discount. The sample review comments also suggest checking breakfast variety.", "示例市场信号显示，9 月 26 日前后需求较强。当前房价 ¥520 位于 ¥460–590 的参考区间，客人平均评分为 4.8/5。综合来看，可以优先尝试有针对性的工作日推广，再根据预订变化判断是否调价；评价中提及的早餐种类也值得跟进。")}</p>
      </section>
      <section className="analysis-decisions">
        <h2>{t("Suggested next steps", "建议决策")}</h2>
        <Link href="/native-explore#promotion" className="analysis-decision-link"><span><strong>{t("Promote weekday stays", "优先推广工作日住宿")}</strong><small>{t("Turn local opportunities into a draft", "结合周边机会，生成推广草稿")}</small></span><ArrowRight size={18}/></Link>
        <Link href="/native-explore" className="analysis-decision-link"><span><strong>{t("Review before changing rates", "调价前先看周边情况")}</strong><small>{t("Compare similar stays and upcoming demand", "结合周边同类住宿与需求再判断")}</small></span><ArrowRight size={18}/></Link>
        <button type="button" className="analysis-decision-link" onClick={()=>{setMetric("satisfaction");document.getElementById("analysis-metrics")?.scrollIntoView({behavior:"smooth",block:"start"});}}><span><strong>{t("Review breakfast feedback", "跟进早餐体验反馈")}</strong><small>{t("Read the comments before choosing an improvement", "先查看具体评价，再决定改善方式")}</small></span><ArrowRight size={18}/></button>
      </section>
'''
s=s.replace(anchor,summary+anchor)
s=s.replace('className="analysis-selected-detail" aria-live','id="analysis-metrics" className="analysis-selected-detail" aria-live')
p.write_text(s,encoding='utf-8')
