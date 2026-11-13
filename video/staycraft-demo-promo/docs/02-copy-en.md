# 02 · English on-screen copy deck — StayCraft concept-demo promo (60s, 16 shots)

> Role: copywriter (English on-screen copy)｜Version: **v-final (2026-11-13)** — 16 shots aligned to 03; 04 implementation notes cross-checked; **C1 passed by creative-director**; copy locked for implementation.
> Scope: this file only. **No VO, no subtitle/caption track, no burned subtitles.** The film is BGM + SFX + on-screen typography + end QR; the user will add GPT voice-over/subtitles later.
> Product: **StayCraft concept demo** (`frontend/public/concept`, English mode; property "Wuzhen · Riverside Haven"; badge "Concept demo").
> Sources: `docs/03-storyboard.md` (frames/shots), `capture/text-en.json` (exact English UI strings), `capture/layout-en.json`, `public/textures/*` (2x screenshots), Lead facts (2026-11-13).
> **Frames: locked to 03.** No old-film numbers or wording. All UI values below are verbatim from the demo capture.

---

## 0. Locks and conventions

1. **16 shots / frames locked to 03**: S01 0–90, S02 90–210, S03 210–330, S04 330–450, S05 450–555, S06 555–660, S07 660–780, S08 780–900, S09 900–1020, S10 1020–1080, S11 1080–1200, S12 1200–1320, S13 1320–1410, S14 1410–1500, S15 1500–1620, S16 1620–1800.
2. **No VO / no subtitles.** No spoken script and no caption track in this deck; headlines/labels are design typography. **Bottom-center 140px is reserved for the user's future GPT subtitles — no design text there.**
3. **Text placement**: design copy sits in the **top/left editorial band (x ≈80–1100, y ≈60–240)** and may span the page's upper-left blank area (soft violet scrim if needed); never over the top bar (language toggle) or the AI Assistant input area. The 400px left-column restriction is superseded by 03's C1 note; S05/S15 cards start at y≈280 so titles sit above them.
4. **Headline rule**: ≤6 words per line, max 2 lines; one idea per screen. Kicker/label: uppercase, 1 line, ≤6 words (dates/counts count as one). Small text: 28–34px spec, 1–2 lines, factual.
5. **No Chinese on screen**: design must crop the demo's top bar and AI Assistant Chinese placeholder; this deck contains no Chinese.
6. **Data rule**: every number on screen comes from the frozen demo capture; exact values, no rounding, no reformatting. **Forbidden numbers** from the old films (¥2,717.66, ¥10,802.33, ¥1,579, 54.3%, 19/35, ¥124–¥621/¥639, ¥150–¥639) must not appear on screen.
7. **Demo nature**: "Concept demo · fictional data" appears at S01 and S16 only. The UI badge "Concept demo" is real; keep it visible in screenshots.
8. **Feature naming (screen)**: pages are primary — **Decision Workbench**, **Business Data & Bookings**, **Nearby Market Research**. **"AI Diagnosis" appears once only**, as the S03 kicker. Nav words (Workbench / Business Data / Market Quotes) appear only inside the real UI sidebar; never re-typeset them as overlay labels.
9. **Tone**: calm, operator-facing, concrete; no exclamation marks, no growth-hack claims, no "integration" claims (the demo's "Ctrip" is a captured source label, not a partnership claim).
10. **Emphasis budget**: the yellow decision highlight belongs to the visuals per 03 (S03 underline, S04 ring, S06 +¥40, S08 68.6% ring, S09 weekend rings, S12 ¥540 underline, S14 ¥520–¥540 underline, S15 closure). Copy layers never add a second highlight; violet stays structural. No color is attached to text in this deck.

---

## 1. The three functions — naming and one-line value

| # | Function (screen vocabulary) | Demo surface to point at | One-line value (film rewrite) |
|---|---|---|---|
| 1 | **AI Diagnosis** → inside **Decision Workbench** | Core Judgment card; 68.6% gauge; detector signals; action plan | **Reads completed stays, booked nights, nearby quotes and local events — then names the week's next move.** |
| 2 | **Business Data & Bookings** | KPI row; daily booked occupancy trend; daily figures table | **Verifies the same 68.6% and 24/35 room nights down to the daily figures before you act.** |
| 3 | **Nearby Market Research** | sample median + middle-50% band; nearby quote list; rate advice | **Puts four same-date nearby stays on one price scale — median ¥540, middle 50% ¥488–¥594.** |

- "AI Diagnosis" is used **once**, as the S03 kicker; elsewhere use the page names.
- The three values are film rewrite; each names a visible card and a real data point. No feature or metric is invented.

---

## 2. Per-shot English copy (locked to 03, S01–S16)

> Column key: **Headline** (recommended / ALT) · **Kicker / label** · **Small text (≤34px)** · **UI data that must be visible**.
> "— no headline" means the UI card itself is the text (per 03 §4); do not stack a headline on top of it.

| # | Frames | Headline (rec / ALT) | Kicker / label | Small text (≤34px) | UI data that must be visible |
|---|---|---|---|---|---|
| **S01** | 0–90 | **The week,<br>in one view.**<br>ALT: See the week. / Decide the next move. | **STAYCRAFT · DECISION WORKBENCH** | **Concept demo · fictional data** | Logo lockup; blurred gauge card |
| **S02** | 90–210 | **One week,<br>four numbers.**<br>ALT: The week, / in four numbers. | **DECISION WORKBENCH · 2026-11-10 — 11-16** | — | Completed Room Revenue **¥18,450** (+14.2%) · Sold Room Nights **42** · Achieved Room Rate **¥439.29** · Future Booked Value **¥12,800** (24/35 nights) |
| **S03** | 210–330 | **— no headline** (Core Judgment card is the text) | **AI DIAGNOSIS · CORE JUDGMENT** | — | "Saturday is sold out & Sunday has 1 room left: test a ¥40 Sunday rate increase" · "Nearby Saturday median rose to ¥540 (+25.5% vs midweek)" · "11/14 Sat · 100% booked" |
| **S04** | 330–450 | **— no headline** (68.6% gauge is the text) | **7-DAY BOOKED OCCUPANCY · ON TRACK** | **4 room-nights from the 80% target.** | 68.6% · 24 booked / 35 capacity · Peer avg 62% · 0% Low / 100% Full |
| **S05** | 450–555 | **Every recommendation<br>has a source.**<br>ALT: Every move, / has a source. | **DETECTOR SIGNALS & EVIDENCE · CONFIDENCE HIGH** | — | OTA Ctrip Calendar Price Snapshot (4 properties) · ¥488/night · Verified · PMS 7-Day Weekend Occupancy Peak · 92.5% · Near Full (EVT row soft-focus, no overlay) |
| **S06** | 555–660 | **From judgment<br>to action.**<br>ALT: A plan, / already moving. | **ACTION PLAN · 2 OF 3 DONE** | — | "Raise Sunday Riverside Double rate by ¥40 — Done" · "Verify Room 202 housekeeping status — Done" · "Publish Wuzhen Ginkgo WeChat copy — Planned" · 2 / 3 |
| **S07** | 660–780 | **Before you act,<br>verify the numbers.**<br>ALT: Check the data, / then decide. | **BUSINESS DATA & BOOKINGS** | — | Page title "Business Data & Bookings"; nav pill moves Workbench → Business Data; 68.6% welcome context |
| **S08** | 780–900 | **— no headline** (four KPI cards are the text) | **BOOKED OCCUPANCY · 11/10 → 11/16** | — | Booked Occupancy **68.6%** (+8.4%) · Booking Progress **24 / 35** (11 open) · Booked Amount **¥12,800** (+12.1%) · Average Booked Rate **¥533.33** (Peak ¥590) |
| **S09** | 900–1020 | **One night full.<br>One night opens.**<br>ALT: Saturday at 100%. / Sunday at 80%. | **DAILY BOOKED OCCUPANCY · 11/10 → 11/16** | — | 11/14 Sat **100%** · 11/15 Sun **80%** · weekday 15 / weekend 9 / open 11 rows visible in card |
| **S10** | 1020–1080 | **— no headline** (table is the text) | **DAILY FIGURES BREAKDOWN** | **15 weekday nights · 9 weekend nights · 11 open.** | Table rows 11/14 Sat **5 booked / 0 open / ¥2,950.00** and 11/15 Sun **4 / 1 / ¥2,480.00** highlighted |
| **S11** | 1080–1200 | **Four nearby stays,<br>same date.**<br>ALT: Compare the same night. | **NEARBY MARKET RESEARCH · CHECK-IN 2026/11/14** | — | Page title "Nearby Market Research"; nav pill moves Business Data → Market Quotes; "4 stays · 4 valid calendar quotes" |
| **S12** | 1200–1320 | **— no headline** (three stat numbers are the text) | **DAILY SAMPLE STATS · 4 VALID QUOTES** | — | Sample Median **¥540 / night** · Middle 50% Band **¥488–¥594** · Your Listed Rates **¥420–¥580** · "Listed rates overlap the sample band" |
| **S13** | 1320–1410 | **— no headline** (annotation only) | **— (kicker omitted per 03)** | **SATURDAY MEDIAN ¥540** (32–36px annotation with yellow short line to the 11/14 point) | 7-day trend points: ¥440 / ¥430 / ¥450 / ¥490 / **¥540 (11/14 Sat)** / ¥510 (11/15 Sun) / ¥460 |
| **S14** | 1410–1500 | **Keep Saturday firm.<br>Test ¥520–¥540.**<br>ALT: Hold the weekend, / test the last room. | **RATE ADVISORY · REMAINING SUNDAY ROOM** | — | UI advice box: "Sample median is ¥540. Keep Saturday rates firm and test ¥520–¥540 on the remaining Sunday room." |
| **S15** | 1500–1620 | **Four quotes.<br>One decision.**<br>ALT: Four quotes, / one next move. | **NEARBY STAY QUOTES · 4 VALID QUOTES** | — | Quote rows: Wuzhen Water Lane Riverside Boutique **¥568/night (+¥48)** · Xitang Misty Rain Courtyard Inn **¥488/night (0.0)** · Jiangnan Waterside Design Resort **¥620/night (+¥60)**; row #1 Snapshot Conditions expanded; close with +¥40 "Done" |
| **S16** | 1620–1800 | **Clearer signals.<br>Better decisions.** (official footer; no ALT) | **— (no kicker on screen; the logo lockup carries the brand)** | **Concept demo · fictional data** (32px) | Logo lockup; QR card; "Scan to explore StayCraft" (32px) / "staycraft.online" (34px) |

**Length check**: all headlines ≤6 words/line and ≤2 lines; S03/S04/S08/S10/S12/S13 intentionally have no headline (per 03); S16 uses the official footer with no alternate.

---

## 3. End card (S16) — lock

- Brand footer: **Clearer signals. / Better decisions.** (official product EN footer; one line pair, no second tagline)
- QR card: **Scan to explore StayCraft** / **staycraft.online** (real QR asset `public/brand/qr-staycraft.png`; verify it encodes https://staycraft.online)
- Demo disclaimer: **Concept demo · fictional data**
- No other text, no Chinese, no extra CTA.

---

## 4. Frozen data and exact on-screen labels

> Source: `capture/text-en.json` + 2x page captures (2026-11-13). Exact values; do not round/re-derive. "4 stays" is the UI count; only three quote rows are visible — **do not invent a fourth price**.

| Data | Exact UI label / value | Shot |
|---|---|---|
| Completed Room Revenue | **¥18,450** · +14.2% · Verified completed stays | S02 |
| Sold Room Nights | **42** · Completed · +5 nights vs last period | S02 |
| Achieved Room Rate | **¥439.29** · Weekend +18% · Same revenue period | S02 |
| Future Booked Value | **¥12,800** · 24/35 nights · Allocated by stay night | S02 |
| Core Judgment | "Saturday is sold out & Sunday has 1 room left: test a ¥40 Sunday rate increase" · "Nearby Saturday median rose to ¥540 (+25.5% vs midweek)" | S03 |
| 7-Day Booked Occupancy | **68.6%** · 24 booked / 35 capacity · 4 room-nights from 80% target · On Track · Peer avg 62% | S04 |
| Evidence | OTA Ctrip Calendar Price Snapshot (4 properties) · ¥488/night · Verified · PMS 7-Day Weekend Occupancy Peak · 92.5% · Near Full · EVT 3 activities · Ready · Confidence High | S05 |
| Action Plan | **2 / 3** · Raise Sunday Riverside Double rate by ¥40 (Done) · Verify Room 202 (Done) · Publish Wuzhen Ginkgo WeChat copy (Planned) | S06 |
| Business Data page | Booked Occupancy **68.6%** (+8.4%) · Booking Progress **24 / 35** (11 open) · Booked Amount **¥12,800** (+12.1%) · Average Booked Rate **¥533.33** (Peak ¥590) | S07, S08 |
| Daily trend | 11/14 Sat **100%** · 11/15 Sun **80%** · 15 weekday nights (42.9%) · 9 weekend nights (25.7%) · 11 open (31.4%) | S09 |
| Daily table | 11/10 2/3 ¥960.00 · 11/11 2/3 ¥920.00 · 11/12 3/2 ¥1,440.00 · 11/13 3/2 ¥1,580.00 · 11/14 Sat 5/0 ¥2,950.00 · 11/15 Sun 4/1 ¥2,480.00 · 11/16 4/1 ¥2,470.00 | S10 |
| Market sample | 4 stays · 4 valid quotes · Sample Median **¥540 / night** · Middle 50% Band **¥488–¥594** · Your Listed Rates **¥420–¥580** · "Listed rates overlap the sample band" | S11, S12 |
| 7-day sample median | ¥440 · ¥430 · ¥450 · ¥490 · **¥540 (11/14 Sat)** · ¥510 (11/15 Sun) · ¥460 | S13 |
| Rate advice | "Sample median is ¥540. Keep Saturday rates firm and test ¥520–¥540 on the remaining Sunday room." | S14 |
| Nearby quotes | Wuzhen Water Lane Riverside Boutique **¥568/night (+¥48)** · Xitang Misty Rain Courtyard Inn **¥488/night (0.0)** · Jiangnan Waterside Design Resort **¥620/night (+¥60)**; row #1 Snapshot Conditions available | S15 |
| Date ranges | Workbench 2026-11-10 — 2026-11-16 · Core Judgment 11/14 → 11/16 · Market check-in 2026/11/14 | S02, S03, S11 |
| Room-type revenue (UI, optional in S03 hold) | Riverside Double **¥10,240 / 22 nights / 55.5%** · Courtyard Twin **¥5,670 / 13 nights / 30.7%** · Family Suite **¥2,540 / 7 nights / 13.8%** | S03 (UI, not overlay) |

**Forbidden**: old-film numbers (¥2,717.66, ¥10,802.33, ¥1,579, 54.3%, 19/35, ¥124–¥621/¥639, ¥150–¥639), "profit", "cash received", invented fourth quote price, real hotel/guest names beyond the demo's fictional quote labels, and any "integration/partnership" claim about Ctrip.

---

## 5. Traceability: verbatim UI vs film rewrite

| Type | Lines | Handling |
|---|---|---|
| **Verbatim UI** | Page titles Decision Workbench / Business Data & Bookings / Nearby Market Research / Market Quotes; KPI names+values; Core Judgment text; Detector Signals; Action Plan rows; daily figures; market stats/advice; quote names+prices; "Concept demo" badge | Keep exact spelling/case; if capture updates, re-copy from the latest capture. |
| **UI paraphrase** | "4 stays · 4 valid calendar quotes"; "Your listed rates ¥420–¥580 overlap the sample band"; "4 room-nights from the 80% target." | Keep numbers/nouns; no new claims. |
| **Film rewrite** | S01/S02/S05/S06/S07/S09/S11/S14/S15 headlines; function one-line values; S13 annotation "SATURDAY MEDIAN ¥540" | Supported by adjacent UI in the same shot; must not introduce new metrics/features. |
| **Lead-required copy** | Official footer "Clearer signals. / Better decisions."; QR "Scan to explore StayCraft / staycraft.online"; "Concept demo · fictional data" | Locked; no alternatives in film. |

**Rule for designers**: if a headline does not fit its left-column slot at 96–112px, use its ALT or reduce by one word — never substitute a metric that is not in §4.

---

## 6. Review log / open items

### 6.1 Director review (2026-11-13) — C1 PASSED
- 03 storyboard is 16 shots; mapping applied: S03 Core Judgment and S04 gauge are separate; S07 transition; S08 KPI; S09/S10 split; S11 transition; S12/S13 market split; S14 advice; S15 quote list + closure; S16 close.
- **No headline overlays** on S03/S04/S08/S10/S12/S13: UI cards are already readable at macro; only kicker/small/annotation as specified above.
- **"AI Diagnosis" used once** as S03 kicker; elsewhere page names.
- **S05 headline adopted**: "Every recommendation / has a source." (replaces "Every move").
- **S15 new headline adopted**: "Four quotes. / One decision." — supported by the UI count "4 valid quotes" (only three price rows are visible; no fourth price is written).
- **S13 annotation** adopted: "SATURDAY MEDIAN ¥540" (32–36px).
- **03 sync note**: 03 §2 S05 body still shows the old line "Every move, / has a source." and S15 still carries a pending 02 confirmation flag; 02 locks the new lines ("Every recommendation / has a source." and "Four quotes. / One decision."). Director to sync 03's copy rows; copy deck is authoritative for wording.
- **Safe area**: bottom-center 140px reserved for future GPT subtitles; no design text there.
- **S04/S12 count-up risk**: if DOM count-up cannot align pixel-exactly with the UI number, drop count-up and keep ring/underline (03 §6).
- **C1 passed (2026-11-13)**: S03/S05/S06/S13/S15 readable zones, S01/S16 small positions, bottom 140px, naming/data/no-Chinese all verified. Design-side syncs only: titles moved to the top/left editorial band; S05/S15 cards moved to y≈280; S13 kicker omitted; S16 has no kicker (logo lockup carries). No sentence changes.

### 6.2 Open items for Lead (no copy blockers)
1. **End card**: official footer + QR + demo small print only; no second tagline/CTA (locked).
2. **S02**: no overlay labels on the four KPI cards; the 90–210f hold must let viewers read all four — a motion/QA check, not a copy change.
3. **S15 closure**: "Four quotes. / One decision." confirmed; supported by UI count "4 valid quotes", no fourth price invented.
4. **Implementation QA only**: QR scan test on the rendered end card; 140px bottom safe area; no Chinese readable; old-film numbers absent. Copy is frozen.

Resolved by 04: QR already encodes https://staycraft.online; BGM is the existing 60s/120BPM track; S01 product-first logo is in 03.

### 6.3 Version notes
- v2: re-mapped from 12 blocks to 03's 16 shots; added S04/S13 no-headline states; adopted S05 and S15 headlines; safe-area constraint recorded; all data re-verified against capture/text-en.json.
- v2.1: cross-checked against 04; QR/BGM/opening-logo questions closed; bottom-140px safe area and emphasis budget recorded.
- **v-final: C1 passed by creative-director (2026-11-13); design-side syncs applied (title band, S05/S15 y≈280, S13/S16 kickers omitted); copy frozen.** No VO, no subtitle track.
