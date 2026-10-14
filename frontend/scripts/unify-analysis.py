from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/components/analysis-client.tsx'
s=p.read_text(encoding='utf-8')
s=s.replace('  const [showPace, setShowPace] = useState(false);','  const [metric, setMetric] = useState("occupancy");')
s=s.replace('onClick={() => chartRef.current?.scrollIntoView({ behavior: "smooth" })}', 'aria-pressed={metric === "occupancy"} onClick={() => setMetric("occupancy")}')
for ident,key in [('booking-detail','booking'),('rate-detail','rate'),('demand-detail','demand'),('satisfaction-detail','satisfaction')]:
 s=s.replace('onClick={() => document.getElementById("'+ident+'")?.scrollIntoView({ behavior: "smooth" })}', 'aria-pressed={metric === "'+key+'"} onClick={() => setMetric("'+key+'")}')
s=s.replace('<strong>{mean}%</strong>','<strong>{selected === null ? mean : data[selected].value}%</strong>')
s=s.replace('      <section className="analysis-main-card" ref={chartRef}>', '      <div className="analysis-selected-detail" aria-live="polite">\n      {metric === "occupancy" && <>\n      <section className="analysis-main-card" ref={chartRef}>')
s=s.replace('        <div className="analysis-big-number">{selected === null ? mean : data[selected].value}<span>%</span></div>','')
a=s.index('        <button type="button" className="analysis-row" aria-expanded={showPace}')
b=s.index('        <button type="button" className="analysis-row" onClick={() => comparisonRef',a)
s=s[:a]+s[b:]
s=s.replace('      <section className="analysis-main-card analysis-metric-panel" id="booking-detail">','      </>}\n      {metric === "booking" && <section className="analysis-main-card analysis-metric-panel" id="booking-detail">')
s=s.replace('</section>\n      <section className="analysis-main-card analysis-metric-panel" id="rate-detail">','</section>}\n      {metric === "rate" && <section className="analysis-main-card analysis-metric-panel" id="rate-detail">')
s=s.replace('</section>\n      <section className="analysis-main-card analysis-metric-panel" id="demand-detail">','</section>}\n      {metric === "demand" && <section className="analysis-main-card analysis-metric-panel" id="demand-detail">')
s=s.replace('</section>\n      <section className="analysis-main-card analysis-metric-panel" id="satisfaction-detail">','</section>}\n      {metric === "satisfaction" && <section className="analysis-main-card analysis-metric-panel" id="satisfaction-detail">')
s=s.replace('<GuestFeedback language={language} /></section>','<GuestFeedback language={language} /></section>}\n      </div>')
for number in ['32<span> / 70</span>','¥520','4.8<span> / 5</span>']:
 s=s.replace('<div className="analysis-big-number">'+number+'</div>','')
p.write_text(s,encoding='utf-8')
