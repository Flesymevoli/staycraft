# EN cut — implementation notes & deviations (Lead)

> The locked copy deck is docs/02-copy-en.md. This file records where implementation
> differs and why (all data-backed; no fabricated product content).

## 1. Delivered variants
| file | VO | subtitles (burned caption layer) | BGM | notes |
|---|---|---|---|---|
| out/staycraft-promo-en.mp4 | yes | yes | yes | main delivery |
| out/staycraft-promo-en-nosub.mp4 | yes | **no** | yes | clean picture |
| out/staycraft-promo-en-novo.mp4 | no | yes | yes | for a different VO language |
| out/staycraft-promo-en-nobgm.mp4 | yes | yes | **no** | for re-scoring |
- subtitles = the film's caption layer (core Caption, src/core/ui.tsx) burned into the picture;
  the no-subtitle variant hides that layer via src/core/options.tsx.
- external subtitle file: subs/staycraft-promo-en.srt (17 cues, from copy §D).

## 2. Voice-over
- Voice: **en-US-ChristopherNeural** (male, calm), edge-tts; rate −2%…+4% per line.
- 16 segments (one per shot), silence-trimmed; every line fits its window
  (audio/vo/manifest-vo.json). 95 words after fallbacks (S01/S08/S14 use shorter takes).
- BGM auto-ducks from 0.86 to 0.40 under VO (src/core/vo.ts bgmVolumeAt, 6f ramps).

## 3. Deviations from the copy deck (implementation reality)
1. **S06**: unlocked from "Completed booking value ¥1,579" because the English demo never
   rendered that expanded card (multiple capture attempts hit network/auth limits; the only
   captured evidence is the collapsed accordion header). EN S06 therefore uses the
   **Booked (19/35 · ¥10,802.33) vs Still open (16 room nights · 8–10 Nov)** pair, both
   visible in app-analysis.png. Caption: "Booked is not the same as earned." → kept as the
   headline "Booked. / Still open." with caption "Nineteen room nights booked. Sixteen still open."
2. **S10/S11/S12** use the analysis page as the document (no EN report-reader page in the demo);
   S10 quotes the real EN AI diagnosis summary, S12 lists three real EN UI caveats.
3. **S15**: headline locked to "Before you post, / check the details."; the phone shows the
   Social sample card (S14) labelled "Sample copy · English edition". The baked mobile tab bar
   is masked with an in-card patch; Chinese AI blocks are out of frame.
4. **S13**: Chinese AI audience copy is blurred / cropped out; only English chrome + the
   Simple/Social tabs are readable.
5. **QR**: only in the English cut (per user), bottom-right end card, https://staycraft.online.
   The Chinese cut is unchanged (no QR).
6. **S09**: headline "Your rates. / Overlap the range."; quote points ¥150/203/212/239/639,
   band ¥520–760, axis ¥100–800.
7. Hotel names/addresses in the market screenshot are blurred at the asset level.

## 4. Asset notes
- All page textures are 2x EN captures of staycraft.online (CSS 1440 grid, PageCam limit 1.5).
- No Chinese AI text is readable in the EN cut (blur/crop); all numbers come from the EN
  screenshots (54.3%, 19/35, ¥10,802.33, ¥568.54, ¥150–¥639, ¥520–760, 8–10 Nov).
- BGM is the same 120BPM 60s edit as the Chinese cut; SFX table unchanged.
