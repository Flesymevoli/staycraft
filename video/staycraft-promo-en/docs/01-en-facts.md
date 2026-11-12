# English cut — frozen facts & adaptation plan (Lead, v1)

> Source of truth: English UI captures in `public/textures/` (2026-11-05, staycraft.online demo workspace, EN mode).
> The Chinese cut stays unchanged; this file governs the English cut only.

## 1. Screens (2x captures, CSS size in parentheses)

| file | CSS size | EN text notes |
|---|---|---|
| app-workbench.png | 1440×953 | Operating review may show an analysing spinner; do NOT feature the summary card as a hero unless re-captured |
| app-analysis.png | 1440×1530 | metrics card (278,354,1120×140); daily chart section (278,510,1120×665); completed-booking-value card (278,1426,1120×153) |
| app-import.png | 1440×4732 | import CSV card (278,275,1120×482); bookings list from y=853 |
| app-rooms.png | 1440×1343 | room editor (278,277,1120×512); room board (278,887,1120×353) |
| app-market.png | 1440×1580 | market card (278,199,1100×1193); price band; hotel list from y≈735 (names must be blurred before use) |
| app-promo-simple.png | 1440×1268 | Who-to-reach card (288,199,1100×240, AI text is Chinese → do not quote); nearby (288,464,1100×204); Promotion copy (288,692,1100×310) with Simple/Social at (311/840, 759, 525×44); Saved drafts (288,1026,1100×118) |
| app-promo-traffic.png | 1440×1268 | same layout, Social state |
| m-*.png | 390-wide | mobile EN pages (workbench/analysis/market/promotion) |

## 2. Frozen numbers (must match the EN screenshots)
- Booked occupancy **54.3%**; Booking progress **19 / 35** room nights; Booked amount **¥10,802.33**; Average booked rate **¥568.54**.
- Daily chart: 11-05 80%, 11-06 ~62%, 11-07 80% (weekend), **11-08 20% (low point)**, 11-09 40%, 11-10 40%, 11-11 60%.
- Completed booking value (November 2026): **¥1,579** — "Source-completed orders; not cash receipts".
- Market: supplier starting-price range **¥150–¥639**, 5 distinct hotels, 5 valid quotes; quote points **150 / 203 / 212 / 239 / 639**; own list rates **¥520–¥760 / night**; "Your list rates overlap the returned range"; 5 hotels returned.
- AI diagnosis summary (real English output, from the captured run):
  "The 5–11 November window has 19 of 35 room nights sold for CNY 10,802.33 at an average booked rate of CNY 568.54, with most of the remaining gap sitting on 8–10 November. Your first decision is what to do about those three nights, since the rest of the week is already fairly full."
- Real English caveats visible in the product UI:
  - "Imported channels may be incomplete; this is not live OTA data."
  - "Current recorded bookings: not a forecast of final occupancy."
  - "Source-completed orders; not cash receipts."

## 3. Adaptation decisions (because the EN demo has no English AI report/promo drafts)
1. **S06 two books**: use *Completed booking value ¥1,579* vs *Booked amount ¥10,802.33*. Caption direction: "Booked is not the same as earned."
2. **S10 report hero**: no report-reader page in EN; use the AI diagnosis summary above as the DOM hero quote over the analysis page (line 1 "19 of 35 room nights sold.", line 2 "The gap sits on 8–10 November."). Small print: "AI diagnosis · demo data".
3. **S11 three pills**: (1) "Gap: 8–10 Nov" (2) "Rest of the week is fairly full" (3) "Decide those three nights first" — evidence lines point at the analysis page's daily chart / metric region.
4. **S12 honesty beat**: use the product's real English caveats (not a fabricated report): channels may be incomplete / not a forecast / not cash receipts. Pills or list over the analysis page.
5. **S13**: analysis page → promotion page push; frame only the English chrome area (title + "Promotion copy" card), keep the Chinese AI audience block out of frame or blurred.
6. **S14**: English UI segmented control (Simple/Social) as the hero; the two English sample invitations are DOM copy (the film's English rewrite), not claimed as product-generated content.
7. **S15**: mobile EN promotion page cropped to the "Promotion copy" area; chips Rooms / Rates / Wording; the human-check principle stays. Avoid Chinese AI blocks.
8. **S16**: ensemble crops from EN textures; QR label "Scan to explore StayCraft" + staycraft.online.
9. No Chinese AI content may be readable in the EN cut (blur or crop it; treat as texture).
10. Hotel names/addresses in the market screenshot must be blurred before use.

## 4. Deliverables (EN)
- `out/staycraft-promo-en.mp4` — EN + male VO + subtitles (captions ON) + BGM + SFX
- `out/staycraft-promo-en-nosub.mp4` — same, captions OFF (no subtitles)
- `out/staycraft-promo-en-novo.mp4` — EN, no VO (captions ON), BGM+SFX
- `out/staycraft-promo-en-nobgm.mp4` — EN + VO + captions, no BGM (optional)
- `subs/staycraft-promo-en.srt`
