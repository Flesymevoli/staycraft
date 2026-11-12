# 02 · English copy deck, caption/subtitle script & male VO (StayCraft 60s EN cut)

> Role: copywriter (EN adaptation)｜Version: **v-final EN (2026-11-05)** — locked for implementation after director review; only the final frame check of §D / S13 / S15 remains after this revision. Incorporates Lead's voice/caption decisions + `docs/vo-windows.md` + director's reading-speed/honesty fixes.
> Status: **LOCKED — v-final EN, approved by creative-director (2026-11-05), no blockers.** Copy changes now require a written note from Lead or director.
> Scope: this file only. No code, no render, no edits to the Chinese cut or product project.
>
> Sources of truth:
> 1. `docs/01-en-facts.md` — frozen EN facts, real EN UI strings, screen sizes, adaptation decisions.
> 2. `docs/vo-windows.md` — per-shot usable VO seconds (0.3s pad both ends) + suggested word counts.
> 3. `video/staycraft-promo/docs/02-narrative-copy.md` — Chinese locked copy (semantic baseline, not literal translation).
> 4. `video/staycraft-promo/docs/04-storyboard-draft.md` §1.3/§5 + `src/core/timeline.ts` — 16 shots, 0–1800f, 30fps, 120 BPM.
> 5. EN captures (`capture/meta-desktop.json`, `public/textures/`) — UI wording only. **No Chinese AI content may be readable in the EN cut.**
>
> Deliverables this feeds: `out/staycraft-promo-en.mp4` (EN + male VO + captions + BGM/SFX), `-nosub` (captions layer OFF), `-novo` (VO OFF), `subs/staycraft-promo-en.srt`.

---

## 0. Locks and conventions

1. **Frames**: absolute 0–1800 @30fps; all windows below follow `SHOTS`.
2. **Three text layers, two are copyowned here**:
   - **Headline** (design, 96–132px) — big statement per screen, ≤8 words/line, max 2 lines.
   - **Caption = subtitle layer** (56–60px, centered, max 2 lines ×42 chars, must be a complete readable sentence). The subtitles are **not a transcript of the VO**: they reuse this caption text. The no-subtitle cut simply turns this layer off.
   - **VO narration** (audio only; not subtitled) — separate script in §C; do not read the headline verbatim.
3. **Word/char limits**: headline ≤8 words/line; caption/subtitle ≤42 chars/line, ≤2 lines; label 34–40px.
4. **One emphasis per screen**: yellow marker = decision/gap/money; violet = machine/data. Do not add a second color emphasis.
5. **Frozen numbers** (match EN textures exactly, no rounding): Booked occupancy **54.3%**; Booking progress **19 / 35** room nights; Booked amount **¥10,802.33**; Average booked rate **¥568.54**; Completed booking value **¥1,579**; Supplier starting-price range **¥150–¥639**; 5 distinct hotels / 5 valid quotes; quote points **150 / 203 / 212 / 239 / 639**; list rates **¥520–¥760 / night**; 11-08 = **20%**, **1 booked / 4 open**; gap **8–10 November**.
6. **Never write**: ¥2,717.66 (Chinese cut), old ranges ¥124–¥621 / ¥124–¥639, "profit", "cash received", "report says" (there is no EN report page), or any Chinese AI copy as if it were English product output.
7. **Honesty labels**: S10 quote = **"AI diagnosis · demo data"** (real EN AI diagnosis text, not a report page); S14/S15 quote cards = **"Sample copy · English edition"** (film rewrite, not product-generated); S12 = **"Product caveats · English UI"** (real UI strings).
8. **Voice**: **en-US-ChristopherNeural**, male, calm, rate −2%…+2%; one file per shot; fit inside §C windows (Lead's tool validates per line).
9. **Subtitle reading speed**: caption window ≥ chars ÷ 18s (≈15–18 chars/s comfortable). §D gives the approved short lines/windows; S02/S03/S13 are the 19–19.4 chars/s upper bound approved by the director for their cuts. Long sentences stay in the VO, not in the subtitle.

---

## 0.1 Fast replace sheet (v0.9 — designers start here)

> **All 16 shots are in this file now** (not only S01–S09). The exact strings below are the ones to replace into the EN shots; §B has the same copy with fallbacks and frame guidance. v-final may only polish S01–S09 wording; S10–S16 are locked for the EN cut because they carry the data/honesty decisions.

| Shot | Headline / main text (exact) | Caption = subtitle (exact) | Label / chip / small print (exact) |
|---|---|---|---|
| S01a | One week of bookings. / Scattered across tabs. | Bookings are scattered. | OTA · WeChat · Excel |
| S01b | Which night is free? / You're still guessing. | The calendar can't say. | Handwritten notes (fictional) |
| S01c | Five tabs for one price. / Then you write it down. | Copied by hand. | Price notes · November (fictional) |
| S02 | See your business. / Plan your next move. | Bookings, rates, quotes — one view. | AI DECISION WORKBENCH · STAYCRAFT |
| S03 | First, the bookings. / Then the numbers. | Check records. Then import. | Import queue · checked line by line |
| S04 | Five rooms. / Thirty-five room nights. | 19 booked, 16 open. | Booked occupancy 54.3% · Booking progress 19 / 35 · Booked amount ¥10,802.33 · Average booked rate ¥568.54; "19 nights × ¥568.54 ≈ ¥10,802.33" |
| S05 | 8 November. / Only one room sold. | Four rooms still open. | Daily booked occupancy · 11-08 = 20% |
| S06 | Booked. / Not earned. | Booked is not earned. | Completed booking value ¥1,579 · Booked amount ¥10,802.33 · Source-completed orders; not cash receipts. |
| S07 | Let the AI check. / Stop switching tabs. | Reads records, checks quotes. | Read records · Query rates · Save evidence · AI research · steps logged |
| S08 | Same night. / Nearby: ¥150–¥639 | Five hotels. Five valid quotes. | Supplier starting-price range · 5 distinct hotels · Check-in 11-06 · Retrieved 5 Nov, 20:16 · RollingGo |
| S09 | Your rates. / Overlap the range. | Rates: ¥520–760 a night. | List rates · 5 rooms on sale · Overlaps the returned range |
| S10 | 19 of 35 room nights sold. / The gap sits on 8–10 November. | Answer, then evidence. | AI diagnosis · demo data |
| S11 | Pills: Gap: 8–10 Nov · The rest is fairly full · Decide those three nights first | Conclusion, reason, action. | Recommendations · demo data |
| S12 | It also names / its blind spots. | It states its limits. | Channels may be incomplete · Not an occupancy forecast · Not cash receipts |
| S13 | Turn the gap / into an invitation. | Two drafts, from / your details. | Promotion plans · AI suggestion (chrome only) |
| S14 | Simple: Thinking of a weekend away? / Ask about the room first. / Social: We came for one night. / Stayed for the quiet. | Same gap. Two ways. | Simple · Social · Short invitations with a clear next step. · Sample copy · English edition (≥34px, visible entire shot) |
| S15 | Before you post, / check the details. | You check. Then post. | Rooms · Rates · Wording · Check rooms, rates and wording. · Human in the loop · product principle |
| S16 | Clearer signals. / Better decisions. | — (no caption) | Scan to explore StayCraft · staycraft.online · Fictional demo data. |

**Designers**: use this sheet to replace text now; §B + §C + §D are the review/final layers. Do not add Chinese text back; keep the emphasis rule (one yellow/violet emphasis per screen).

---

## A. Brand English expression

### A1. Opening tagline (S02, 180–285f)
- **Recommended**: **"See your business." / "Plan your next move."**
  - Verbatim product landing-page EN hero (frontend landing-page.tsx), matching the CN opening tagline source; two concrete 3–4-word lines; brand evidence traceable. Fits the 104px slot in S02.
- Alternative: **"See the business clearly." / "Decide the next step."** (closer literal rendering of 「看清经营，决定下一步」; only if a literal translation is required).
- Kicker above logo (keep as built): **"AI DECISION WORKBENCH · STAYCRAFT"**
- Brand micro-line (metadata / QR card area): **"An AI decision workbench for independent stays."**

### A2. Closing tagline (S16, 1620–1800f)
- **Recommended**: **"Clearer signals." / "Better decisions."** (official product EN footer; different sentence from the opening tagline).
- Alternative (more concrete): **"See what's open." / "Decide what's next."**
- Do not reuse the opening tagline at the end; do not add a third tagline.

### A3. QR card (already in S16 — lock copy)
- **"Scan to explore StayCraft"** / **"staycraft.online"**
- Keep the real QR asset `brand/qr-staycraft.png`; no redraw.

### A4. Brand one-liner (optional metadata)
**"Bookings, rates and nearby quotes — turned into a clear next decision."**

---

## B. Per-shot English copy (16 shots)

> Recommended column first; ALT = fallback. **Caption text is also the subtitle text** (§D) and must read as a complete sentence. S01a/b/c are the three beats inside S01. S10/S11/S14 have no 96px headline — the quote/pills are the main text.

### Act I — Pain (0–180f)

| Shot | Frames | Headline (rec / ALT) | Caption = subtitle (rec / ALT) | Label / chip | Emphasis |
|---|---|---|---|---|---|
| **S01a** | 0–60 | **One week of bookings.** / **Scattered across tabs.**<br>ALT: Bookings in three places. / None of them agree. | **Bookings are scattered.**<br>ALT: Three apps, one owner, no single view. | "OTA · WeChat · Excel" | Scattered |
| **S01b** | 60–120 | **Which night is free?** / **You're still guessing.**<br>ALT: Is Thursday open? / Check every app again. | **The calendar can't say.**<br>ALT: So you check the apps one more time. | "Handwritten notes (fictional)" | guessing |
| **S01c** | 120–180 | **Five tabs for one price.** / **Then you write it down.**<br>ALT: One night's rate. / Five tabs to find it. | **Copied by hand.**<br>ALT: By the time you compare, prices moved. | "Price notes · November (fictional)" | Five |

### Act II — Brand + data (180–660f)

| Shot | Frames | Headline (rec / ALT) | Caption = subtitle (rec / ALT) | Label / chip / data | Emphasis |
|---|---|---|---|---|---|
| **S02** | 180–285 | **See your business.** / **Plan your next move.**<br>ALT: See the business clearly. / Decide the next step. | **Bookings, rates, quotes — one view.**<br>ALT: Every scattered signal, in one view. | Kicker: "AI DECISION WORKBENCH · STAYCRAFT" | clearly |
| **S03** | 285–375 | **First, the bookings.** / **Then the numbers.**<br>ALT: Put the bookings in one place. / The count starts here. | **Check records. Then import.**<br>ALT: Import once. Trust the numbers after. | "Import queue · checked line by line" | First |
| **S04** | 375–495 | **Five rooms.** / **Thirty-five room nights.**<br>ALT: One week, five rooms. / Thirty-five nights to fill. | **19 booked, 16 open.**<br>ALT: These are bookings, not revenue. | DOM: "Booked occupancy 54.3%" / "Booking progress 19 / 35" / "Booked amount ¥10,802.33" / "Average booked rate ¥568.54"; multiply "19 nights × ¥568.54 ≈ ¥10,802.33"; small "2026-11-05 — 11-11 · Demo data" | 54.3% |
| **S05** | 495–585 | **8 November.** / **Only one room sold.**<br>ALT: The 8th. / One booking, four open rooms. | **Four rooms still open.**<br>ALT: The week's weakest night. | "Daily booked occupancy · 11-08 = 20%" | one |
| **S06** | 585–660 | **Booked.** / **Not earned.**<br>ALT: Booked amount. / Completed value. | **Booked is not earned.**<br>ALT: Two numbers, two different questions. | Left: **Completed booking value ¥1,579** · Right: **Booked amount ¥10,802.33**; small "Source-completed orders; not cash receipts." | earned |

### Act III — AI research + market (660–1020f)

| Shot | Frames | Headline (rec / ALT) | Caption = subtitle (rec / ALT) | Label / chip / data | Emphasis |
|---|---|---|---|---|---|
| **S07** | 660–750 | **Let the AI check.** / **Stop switching tabs.**<br>ALT: The AI does the checking. / You keep the decision. | **Reads records, checks quotes.**<br>ALT: Every step leaves a trace. | Chips "Read records" / "Query rates" / "Save evidence"; label "AI research · steps logged" | AI |
| **S08** | 750–870 | **Same night.** / **Nearby: ¥150–¥639**<br>ALT: What nearby stays cost / on the same night. | **Five hotels. Five valid quotes.**<br>ALT: Starting prices for one night nearby. | "Supplier starting-price range · 5 distinct hotels"; source "Check-in 11-06 · Retrieved 5 Nov, 20:16 · RollingGo" | ¥150–¥639 |
| **S09** | 870–960 | **Your rates.** / **Overlap the range.**<br>ALT: Your rates. / Overlap the quotes. | **Rates: ¥520–760 a night.**<br>ALT: Same night, same price scale. | "List rates · 5 rooms on sale"; bracket "Overlaps the returned range"; axis 150/203/212/239/639 | Overlap |
| **S10** | 960–1020 | **Quote (DOM, 2 lines; no 96px headline):** / **19 of 35 room nights sold.** / **The gap sits on 8–10 November.**<br>ALT (96px-safe): 19 of 35 nights sold. / Gap: 8–10 November. | **Answer, then evidence.**<br>ALT: The diagnosis leads with the answer. | Small "AI diagnosis · demo data"; quote is the real EN AI diagnosis summary (01-en-facts §2) | gap |
| **S11** | 1020–1200 | **No 96px headline — three pills are the main text:** / ① **Gap: 8–10 Nov** / ② **The rest is fairly full** / ③ **Decide those three nights first** | **Conclusion, reason, action.**<br>ALT: Three lines. One decision. | Label "Recommendations · demo data"; pills widened to 520–560px; evidence lines point at the daily chart / metrics region (no Chinese report text) | 8–10 |
| **S12** | 1200–1290 | **It also names** / **its blind spots.**<br>ALT: It shows what / it can't see. | **It states its limits.**<br>ALT: Limits are part of the answer. | Three cards (real EN caveats): **Channels may be incomplete** / **Not an occupancy forecast** / **Not cash receipts**; label "Product caveats · English UI" | blind |

### Act IV–V — Decision, promotion, brand (1290–1800f)

| Shot | Frames | Headline (rec / ALT) | Caption = subtitle (rec / ALT) | Label / chip / quote | Emphasis |
|---|---|---|---|---|---|
| **S13** | 1290–1380 | **Turn the gap** / **into an invitation.**<br>ALT: Make the gap / an invitation. | **Two drafts, from** / **your details.**<br>ALT: From the same week, a promotion plan. | "Promotion plans · AI suggestion (chrome only)"; keep real "Promotion copy" card + Simple/Social tabs in frame; Chinese AI audience block out of frame/blurred | invitation |
| **S14** | 1380–1530 | **No headline — two DOM quote cards are the main text:** / **Simple:** "Thinking of a weekend away?" / "Ask about the room first." / **Social:** "We came for one night." / "Stayed for the quiet." | **Same gap. Two ways.**<br>ALT: One invitation, two voices. | Tabs "Simple" / "Social" (real UI); UI line "Short invitations with a clear next step."; small "Sample copy · English edition" **≥34px, visible entire shot** | Simple: Ask · Social: quiet |
| **S15** | 1530–1620 | **Before you post,** / **check the details.**<br>ALT: Before it goes out, / you check the details. | **You check. Then post.**<br>ALT: Human check before posting. | Chips **Rooms / Rates / Wording**; hint "Check rooms, rates and wording."; small "Sample copy · English edition" **visible entire shot**; label "Human in the loop · product principle" | check |
| **S16** | 1620–1800 | **Clearer signals.** / **Better decisions.**<br>ALT: See what's open. / Decide what's next. | — (brand close, C1 exempt; no subtitle) | QR "Scan to explore StayCraft" / "staycraft.online"; small "Fictional demo data." | none |

**Checks**: all headlines ≤8 words/line; all caption lines ≤42 chars; all captions are complete, speakable sentences; S16 intentionally has no caption (and therefore no subtitle).

---

## C. Male VO script

### C1. Voice + pacing + windows
- **Voice**: **en-US-ChristopherNeural** (male, calm, normal rate; tool will nudge −2%…+2% per line and verify each line fits).
- **Pacing**: ~2.0–2.3 words/sec. **Total 105 words** (target 105–125; Lead's `vo-windows.md` budget 100–115). Estimated speech ≈47–50s, leaving breathing room.
- **Windows**: shot ±0.3s pad from `vo-windows.md`; exceptions: S16 ends at **f1761** (not f1791) so the final logo hold has a clean 0.6s tail.
- **Rules**: one file per shot; `VO[].from` = start frame; set `durationInFrames` to the measured audio length; if a line overruns by >0.2s, use the fallback in C3 (never truncate mid-word). Do not read the headline verbatim. Numbers stay on screen, not in VO (keeps audio valid if the market capture changes).
- Optional silence: Lead's note says S03/S06/S09/S12/S15 may be left silent; this script keeps 3–5-word lines there so the total reaches 105 words. If the cut needs air, drop those five lines and accept ~80 words (still reads, but below the task's 105-word floor — confirm with Lead).

| Shot | Start–End (f) | VO line | Words | Est. @2.0 w/s | Notes |
|---|---|---|---|---|---|
| S01 | 9–171 | "Bookings live in three tabs. The empty night? You're still guessing." | 11 | 5.4s | Ends before the white-seam flash. |
| S02 | 189–276 | "The whole week, in one view." | 6 | 2.9s | Under the tagline; no line during the logo-only opening. |
| S03 | 294–366 | "Start with your bookings first." | 5 | 2.4s | Optional (can be silent). |
| S04 | 384–486 | "Half the week booked. The rest open." | 7 | 3.4s | Do not read exact numbers over the DOM layer. |
| S05 | 504–576 | "One night, four rooms open." | 5 | 2.4s | — |
| S06 | 594–651 | "Booked, not earned yet." | 4 | 1.9s | Optional; lands with the card flip. |
| S07 | 669–741 | "The AI checks the market." | 5 | 2.4s | "AI" as letters. |
| S08 | 759–861 | "Five hotels, same night, real starting prices." | 7 | 3.4s | Range stays on screen only. |
| S09 | 879–951 | "Your rates sit in range." | 5 | 2.4s | Optional. |
| S10 | 969–1011 | "Answer, then evidence." | 3 | 1.4s | Let the quote read. |
| S11 | 1029–1191 | "It names just three nights, not the whole week. Start there first." | 12 | 5.4s | Fits 5.4s at ~2.2 w/s. |
| S12 | 1209–1281 | "It names its blind spots." | 5 | 2.4s | Optional. |
| S13 | 1299–1371 | "The gap becomes an invitation." | 5 | 2.4s | — |
| S14 | 1389–1521 | "One asks. One invites. Both give you a next step." | 10 | 4.4s | — |
| S15 | 1539–1611 | "You check the room details." | 5 | 2.4s | Optional; human-check beat. |
| S16 | 1629–1761 | "So the next move is still yours. This is StayCraft." | 10 | 4.4s | Ends f1761; clean tail into the logo hold. |

**Total = 105 words** (11+6+5+7+5+4+5+7+5+3+12+5+5+10+5+10).

### C2. Delivery notes
- ChristopherNeural reads lists flat; keep the script's short sentences and let the music carry energy.
- Do not stress "AI" as a brand; it is a plain noun here ("The AI checks the market").
- S06 and S16 are the only lines that can be slightly slower; the rest should sit under the cut and never run into the hold.
- S01 and S16 are the two lines worth an extra take; the rest are informational.

### C3. Fallback lines if a take overruns
- S01: "Bookings in three tabs. The empty night? Still guessing." (9)
- S02: "The whole week, one view." (5)
- S04: "Half the week booked. Rest open." (6)
- S08: "Five hotels, same night, real prices." (6)
- S11: "Three nights matter. Start there." (5)
- S14: "One asks. One invites." (4)
- S16: "The next move is yours." (5)

---

## D. Caption = subtitle table (SRT-ready)

> Per Lead + director review: the subtitle layer **reuses each shot's caption**, centered 56–60px, max 2 lines ×42 chars; the no-subtitle cut turns this layer off. **Reading-speed rule: window ≥ chars ÷ 18s** (≈15–18 chars/s comfortable). The windows below are the approved short lines/time slots; S02/S03/S13 are the 18.4–19.4 chars/s upper bound the director accepted for their cuts. Long sentences live in the VO, not in the subtitle. S16 has no caption (brand close, C1 exempt). VO is separate and not subtitled.

| # | Shot | Frames | Timecode in → out | Caption / subtitle lines | chars/s |
|---|---|---|---|---|---|
| 1 | S01a | 14–60 | 00:00:00,467 → 00:00:02,000 | Bookings are scattered. | 15.0 |
| 2 | S01b | 74–118 | 00:00:02,467 → 00:00:03,933 | The calendar can't say. | 15.7 |
| 3 | S01c | 130–164 | 00:00:04,333 → 00:00:05,467 | Copied by hand. | 13.2 |
| 4 | S02 | 228–284 | 00:00:07,600 → 00:00:09,467 | Bookings, rates, quotes — one view. | 18.7 |
| 5 | S03 | 330–374 | 00:00:11,000 → 00:00:12,467 | Check records. Then import. | 18.4 |
| 6 | S04 | 458–494 | 00:00:15,267 → 00:00:16,467 | 19 booked, 16 open. | 15.8 |
| 7 | S05 | 548–584 | 00:00:18,267 → 00:00:19,467 | Four rooms still open. | 18.3 |
| 8 | S06 | 622–658 | 00:00:20,733 → 00:00:21,933 | Booked is not earned. | 17.5 |
| 9 | S07 | 700–750 | 00:00:23,333 → 00:00:25,000 | Reads records, checks quotes. | 17.4 |
| 10 | S08 | 816–868 | 00:00:27,200 → 00:00:28,933 | Five hotels. Five valid quotes. | 17.9 |
| 11 | S09 | 912–958 | 00:00:30,400 → 00:00:31,933 | Rates: ¥520–760 a night. | 15.7 |
| 12 | S10 | 982–1020 | 00:00:32,733 → 00:00:34,000 | Answer, then evidence. | 17.4 |
| 13 | S11 | 1146–1198 | 00:00:38,200 → 00:00:39,933 | Conclusion, reason, action. | 15.6 |
| 14 | S12 | 1246–1288 | 00:00:41,533 → 00:00:42,933 | It states its limits. | 15.0 |
| 15 | S13 | 1330–1378 | 00:00:44,333 → 00:00:45,933 | Two drafts, from / your details. | 18.1 |
| 16 | S14 | 1490–1528 | 00:00:49,667 → 00:00:50,933 | Same gap. Two ways. | 15.0 |
| 17 | S15 | 1582–1620 | 00:00:52,733 → 00:00:54,000 | You check. Then post. | 16.6 |

> The five lines the director flagged are now shortened: S01c "Copied by hand." (15), S03 "Check records. Then import." (28), S07 "Reads records, checks quotes." (29), S10 "Answer, then evidence." (22), S15 "You check. Then post." (22). S02 starts at 228 (before T2 at 262) and is 33 chars; S13 uses the two-line "Two drafts, from / your details."
> **SRT-only out points**: use the cut-frame −1 for S07 (749), S10 (1019), S15 (1619) so the subtitle does not flash on the same frame as the cut; the display windows in the table above stay as written. S01c is trimmed to 164 so it clears the four-grid collapse (starts 162). S02 keeps out 284; if final review calls it "subtitle crossing T2", move only the SRT out to 280.

**SRT template** (paste to `subs/staycraft-promo-en.srt`; no S16 entry):

```
1
00:00:00,467 --> 00:00:02,000
Bookings are scattered.

2
00:00:02,467 --> 00:00:03,933
The calendar can't say.

3
00:00:04,333 --> 00:00:05,467
Copied by hand.

4
00:00:07,600 --> 00:00:09,467
Bookings, rates, quotes — one view.

5
00:00:11,000 --> 00:00:12,467
Check records. Then import.

6
00:00:15,267 --> 00:00:16,467
19 booked, 16 open.

7
00:00:18,267 --> 00:00:19,467
Four rooms still open.

8
00:00:20,733 --> 00:00:21,933
Booked is not earned.

9
00:00:23,333 --> 00:00:24,967
Reads records, checks quotes.

10
00:00:27,200 --> 00:00:28,933
Five hotels. Five valid quotes.

11
00:00:30,400 --> 00:00:31,933
Rates: ¥520–760 a night.

12
00:00:32,733 --> 00:00:33,967
Answer, then evidence.

13
00:00:38,200 --> 00:00:39,933
Conclusion, reason, action.

14
00:00:41,533 --> 00:00:42,933
It states its limits.

15
00:00:44,333 --> 00:00:45,933
Two drafts, from
your details.

16
00:00:49,667 --> 00:00:50,933
Same gap. Two ways.

17
00:00:52,733 --> 00:00:53,967
You check. Then post.

```

## E. English narrative adjustments (why S06/S10–S15 differ from the Chinese cut)

### E1. S06 — two books, but no Chinese completed-revenue figure
- The EN workbench shows **Completed room revenue "—"** (not loaded); the Chinese-cut ¥2,717.66 / 5 room nights must not appear in EN.
- Real EN pair: **Completed booking value ¥1,579** (analysis-page card, with the real caveat "Source-completed orders; not cash receipts.") vs **Booked amount ¥10,802.33**.
- On-screen: headline "Booked. / Not earned."; cards carry the two amounts; small print "Source-completed orders; not cash receipts."; caption "Booked is not the same as earned."
- If the final texture does not show ¥1,579, fall back to **Booked 19 / Still open 16** with the gap on 8–10 Nov — never re-introduce ¥2,717.66 or a profit claim.

### E2. S10–S12 — no English report page / no English AI report text
- The EN demo has **no report-reader page**; AI content is Chinese and must not be readable (01-en-facts §3.9).
- **S10**: use the real English **AI diagnosis summary** as a DOM quote: "19 of 35 room nights sold." / "The gap sits on 8–10 November."; small print **"AI diagnosis · demo data"** — not "report title". 96px overflow is a known EN-edition exception (see §F.1); use 80–84px or the 96px-safe alt.
- **S11**: three pills distilled from the same sentence — "Gap: 8–10 Nov" / "The rest is fairly full" / "Decide those three nights first"; pills widened to 520–560px (director-approved); evidence lines point at the daily chart / metrics region, never at Chinese sentences.
- **S12**: three real EN UI caveats — "Channels may be incomplete" / "Not an occupancy forecast" / "Not cash receipts"; label "Product caveats · English UI". **EN S12 = three EN UI caveats; CN cut = four CN report caveats — two independent frozen captures. Final review must not cross-check counts/wording between cuts.**
- If an English report page is captured later, swap only the S10 quote for its verbatim title and change the small print to "Report title · demo data".

### E3. S13 — no English AI audience copy, but keep the promotion context
- The EN "Who to reach" body is Chinese AI text; keep it out of frame or blurred (01-en-facts §3.5). Do not quote/translate it as product output.
- Keep the real EN **"Promotion copy" card and the Simple / Social tabs** in frame as the S14 preview; only the Chinese AI audience block is excluded.
- Caption: **"Two drafts, from / your details."** (31 chars, 19.4 chars/s — director-approved); headline "Turn the gap / into an invitation."; label "Promotion plans · AI suggestion (chrome only)".

### E4. S14 — two invitations are the film's English rewrite, not product output
- The EN demo has **no English promo drafts** (saved drafts empty; generated copy is Chinese). The two quote cards are **DOM English sample copy**, labelled **"Sample copy · English edition"** (≥34px, visible for the whole shot, not covered by the quote card).
- Simple: "Thinking of a weekend away?" / "Ask about the room first." — matches the real UI line "Short invitations with a clear next step."
- Social: "We came for one night." / "Stayed for the quiet." — scene-led social version.
- Keep only the real UI tabs "Simple" / "Social" around the cards; do not show Chinese drafts; do not imply the demo generated these English lines.

### E5. S15 — same English sample on the phone, checked by a human
- Use the EN mobile promotion page cropped to the "Promotion copy" area (no Chinese AI blocks, no baked-in tab bar in frame).
- Carry the **Social** sample card from S14 onto the phone **verbatim** (same line breaks, same punctuation), with "Sample copy · English edition" visible for the whole shot.
- Chips **Rooms / Rates / Wording**; hint "Check rooms, rates and wording."; caption **"You check. Then post."** (no "AI drafts" claim — the EN demo has no English AI draft; that honesty risk is closed).
- The phone must not imply generated English product copy; VO keeps "You check the room details."

### E6. S16 — brand close
- Tagline "Clearer signals. / Better decisions."; QR "Scan to explore StayCraft" / "staycraft.online"; small "Fictional demo data."
- Ensemble crops from EN textures only; no Chinese text, no old-date promo card, no readable hotel/guest names.

### E7. Subtitle ≠ VO transcript
- Captions/subtitles are the on-screen explanatory lines (shown above); they are written as complete sentences so the no-sound cut still reads.
- The VO is a separate narration track with different wording (never read the headline verbatim). If accessibility requires a full VO transcript later, generate a second SRT; do not replace this caption SRT.

---

## F. Data / asset checklist for Lead (before lock)

| Item | Where | Action |
|---|---|---|
| 54.3% / 19 / 35 / ¥10,802.33 / ¥568.54 | S04 DOM, S06 right card | match EN textures exactly; no rounding |
| Completed booking value **¥1,579** | S06 left card | only if visible in final texture; else Booked 19 / Open 16 fallback (E1) |
| **¥150–¥639**, 5 hotels, 5 quotes, points 150/203/212/239/639 | S08, S09 | frozen per 01-en-facts; VO avoids numbers so audio survives a re-capture |
| List rates **¥520–¥760 / night** | S09 | keep "overlaps the returned range" |
| 11-08: 20% / 1 booked / 4 open | S05 | 20% and 1/4 same frame ±15f |
| Gap **8–10 November** | S10/S11/S12, VO S11 | no 6/7/11 Nov (Chinese-cut data) |
| AI diagnosis quote | S10 | exact from 01-en-facts §2 |
| EN caveats | S12 | exact real UI strings (E2) |
| QR/domain | S16 | already in code; confirm final URL |
| Hotel names | S08 | blurred in final texture |
| Chinese AI blocks | S13/S14/S15 | out of frame / blurred / replaced by English DOM sample |
| Disclaimers | S04 small, S10 small, S12 label, S16 small | "Demo data" / "AI diagnosis · demo data" / "Product caveats · English UI" / "Fictional demo data." |

**F.1 Screen-fit and known deviations (EN edition)**
- **S10 quote (known deviation)**: the two Lead-approved lines (29/31 chars) at 96px overflow the 1260px quote card. EN edition uses ~80–84px for this quote (or widens the card); the CN cut's 96px rule is not violated because it is a different cut. 96px-safe alt: "19 of 35 nights sold." / "Gap: 8–10 November." Record this in the EN QA notes so Q11/C11 don't flag it blind.
- **Headline width**: at 96px, ~24 Latin chars ≈1150px. Shots with a narrow text block (S01, S04, S15) use 84–88px or the shorter ALT; S15 uses "check the details." on purpose (chips carry Rooms/Rates/Wording).
- **S11 pills**: widen to 520–560px; second pill is "The rest is fairly full" (22 chars). If the layout can't move, fallback "Week is fairly full" (19).
- **S06 cards**: "Completed booking value" may wrap to two lines at 34px; keep ¥1,579 and ¥10,802.33 exact. The small caveat "Source-completed orders; not cash receipts." is real UI copy; it overlaps semantically with S12's "Not cash receipts" — keep it in S06 (accuracy) and accept S12 as a recap unless final review flags F2 duplication.
- **S12**: three cards replace the CN four-row list; muted style, adjust row height. Do not add a fourth row from the CN report.
- **S13**: keep the real "Promotion copy" card + Simple/Social tabs in frame; Chinese AI audience block stays out/blurred; the caption "Two drafts, from / your details." carries the information.
- **S09**: headline "Overlap the range." is correct — list rates 520–760 are NOT fully inside 150–639; the 520–639 part overlaps. Do not use "Inside the range.".
- **Reading speed**: caption windows in §D are the approved minimum; if a line is later lengthened, extend the window proportionally (≥ chars ÷ 18s) or move the full sentence into the VO.


---

## G. Review & revision log

### G1. Review request to creative-director (2026-11-05)
Focus: EN sentence length vs 42-char subtitle lines; brand tone (no abstract marketing); rhythm vs 120 BPM cuts; S14 sample-copy honesty; VO 105 words with ChristopherNeural and per-shot fit; S13 framing without Chinese AI block; whether S16 can stay subtitle-free.

### G2. Lead decisions incorporated in v2
- Voice: **en-US-ChristopherNeural** (male, calm, −2%…+2%).
- Subtitle layer = **caption text** (not VO transcript); no-subtitle cut turns captions off.
- S06: Completed booking value **¥1,579** vs Booked amount **¥10,802.33** (no ¥2,717.66).
- S12: **three** real EN caveat cards (not four).
- Market frozen at **¥150–¥639** (no placeholder).
- VO total **105 words**, all 16 shots, windows per `vo-windows.md`.

### G3. Creative-director review (2026-11-05) and resolution
- **Passed**: sentence length (headlines ≤6 words/line), brand tone, data/honesty labelling, S14 sample-copy approach.
- **Blockers fixed in this version**:
  1. **Subtitle reading speed**: all captions shortened/re-timed to ~15–19.4 chars/s (S01a/b/c, S02 228–280, S03, S04, S05, S06, S07, S09–S15 per director's list; the five worst — S01c/S03/S07/S10/S15 — now use the exact short lines).
  2. **S15 honesty**: caption changed to "You check. Then post." — no claim that the demo generated English copy.
  3. **S13 density**: caption changed to "Two drafts, from / your details."; real "Promotion copy" + Simple/Social tabs stay in frame; only the Chinese AI audience block is excluded.
  4. **S09 data ambiguity**: headline changed to "Overlap the range." (520–760 is not fully inside 150–639).
- **Accepted by director**: open with official landing EN "See your business. / Plan your next move."; close with official footer "Clearer signals. / Better decisions."; S15 headline "Before you post, / check the details." with chips + hint; S11 pills widened to 520–560px; S14/S15 "Sample copy · English edition" labels visible.
- **Resolved in this v-final**: the four items are all updated (§D windows/captions, S15 caption, S13 caption+tabs, S09 headline).
- **Director final frame check (2026-11-05): passed, no blockers, v-final EN locked.** Three implementation notes recorded: SRT out = shotEnd−1 for S07/S10/S15 (749/1019/1619); S01c trimmed to 164 to clear the 162–180 collapse; S02 out 284 kept, optional SRT-only fallback to 280 if final review flags the T2 crossing.


---

## H. Open questions for Lead / final check

1. **S06**: confirm Completed booking value **¥1,579** is visible in the final EN texture; otherwise use the Booked 19 / Open 16 fallback (never ¥2,717.66).
2. **S10 known deviation**: confirm the EN-edition 80–84px quote is accepted as a documented deviation from the CN cut's 96px rule (Q11/C11 note).
3. **VO tight lines**: S11 (12 w / 5.4s), S14 (10 w / 4.4s), S16 (10 w / 4.4s) are the first to test with ChristopherNeural; if a take overruns >0.2s use the C3 fallback. The VO floor per Lead's vo-windows is ~100–115 words; current total 105, so one fallback still lands at 100 — flag it, don't silently drop lines.
4. **S12 cross-version**: EN = three EN UI caveats; CN = four CN report caveats; separate frozen captures. Confirm final review will not cross-check counts/wording between cuts.
5. **S16**: no caption/subtitle accepted (C1 exemption); VO ends f1761, leaving the logo hold clean.
6. **Layout handoffs**: S10 quote size, S11 pill width, S06 label wrap, S12 three-card height, S13 tab visibility — confirm with designers before the first EN render.
