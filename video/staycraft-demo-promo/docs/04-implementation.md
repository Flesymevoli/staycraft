# 04 · Implementation notes (Lead) — EN demo promo

> Canonical engineering reference for the new 60s film. Read together with
> docs/01-visual-direction.md and docs/03-storyboard.md. Only Lead edits shared
> files; each motion designer edits only their own shot files.

## 1. Project
- Remotion project: `video/staycraft-demo-promo` (new; old projects untouched).
- Composition id `StayCraftDemoEN`, 1920×1080, 30fps, 1800f (60.0s), 120BPM.
- No VO, no subtitles/captions layer. Bottom 140px centre is reserved for the
  user's future GPT subtitles; do not place design text there.
- Deliverables: `out/staycraft-demo-promo.mp4` (BGM+SFX) and
  `out/staycraft-demo-promo-nobgm.mp4` (SFX only, for later VO mixing), plus QR end card.

## 2. Assets (2x, CSS sizes below)
- Full app shell: `app-workbench-full.png` 1440×1530 · `app-analysis-full.png` 1440×906 ·
  `app-explore-full.png` 1440×1033 (+ `app-*-collapsed` variants where noted).
- Content only: `page-workbench.png` 1114×1355 · `page-analysis.png` 1114×731 · `page-explore.png` 1114×857.
- Card crops in `textures/cards/` (2x): KPI 266.5×162, hero 710×448, hero-top 660×271,
  gauge 384×325, plan 384×335, signals 710×312, opps 347×284, analysis chart 710×414,
  analysis table 384×461, market stats 710×288, market trend 384×257, quotes 1114×461.
- 3x crops in `textures/hi/` for macro lenses (see capture/layout-hi.json).
- Brand: `brand/StayCraft-main-HD.png` (real logo), `brand/StayCraft-main-HD.png`-family SVGs,
  `brand/qr-staycraft.png` (1024px, encodes https://staycraft.online, errorCorrection M).
- Fonts: `fonts/Outfit.ttf` (OFL) loaded via `useBrandFonts()`.

## 3. Authoritative geometry
Use `src/core/layout.ts` (`WB`, `AN`, `EX`, `PAGE`, `CONTENT`, `NAV`, `SAFE`). It is
measured at scroll 0 from `capture/layout-fixed.json`. Do **not** use
`capture/layout-en.json` (it carries an 111px scroll offset from element screenshots).
- All three content sections start at page y=111, x=281.
- Workbench: KPI row y=200.9; hero 281,380.9 710×448; gauge 1011.1,380.9 384×325;
  plan 1011.1,725.5 384×335; signals 281,1152.8 710×312; opps 281,848.6 710×284.
- Analysis: KPI row y=200.9; chart 281,380.9 710×414 (plot 306,469.3 660×206);
  table 1011.1,380.9 384×461 (rows y 509.4→772.2, h 43.8; Sat/Sun rows 684.6 / 728.4).
- Explore: stats 281,200.9 710×288; trend 1011.1,200.9 384×257; quotes 281,506.9 1114×461.

## 4. English-only capture note
The demo's EN mode leaves a small set of labels untranslated (weekday CJK, 间夜,
a few market-row conditions, chart tooltip, etc.). At capture time only — never in the
frontend source — those labels were localized to English via a DOM text pass
(`capture/capture-en4.mjs` mapping list, 36 nodes). Data, layout and components are
unchanged; no Chinese is readable in the captured textures. Hotel names in the market
list are transliterations of the demo's fictional listings.

## 5. Shared code contract
- Lead owns: `src/core/*` (theme, beat, timeline, layout, PageCam, ui, options, sfx,
  AudioBed), `src/fonts.tsx`, `src/Root.tsx`, `src/StayCraftDemoPromo.tsx`,
  `src/shots/index.tsx`, docs, render scripts.
- motion-a owns `src/shots/S01.tsx`–`S06.tsx`.
- motion-b owns `src/shots/S07.tsx`–`S11.tsx`.
- motion-c owns `src/shots/S12.tsx`–`S16.tsx`.
- Register shots in `src/shots/index.tsx` only after the owner says a file is done; Lead
  will wire the mapping when the files exist (designers may create their files, Lead updates index).
- Reach for shared components first: `PageCam`, `PaperCard`, `Title`, `WordTitle`, `Kicker`,
  `YellowMark`, `Pill`, `Num`, `RollNumber`, `Rule`, `Grain`; only add local components
  inside your own shot file.
- Typecheck only: `npx tsc --noEmit -p tsconfig.json`. Do not run Remotion/Chromium
  renders (Lead renders all acceptance frames and videos).

## 6. Editorial rules
- One emphasis colour: yellow #e7d598 in the demo tokens (creative direction names #ffdc32;
  use the demo token `C.yellow` for screen graphics) only for decision/gap moments —
  max one use per shot. Violet is the structural/system colour.
- Cards must match captured UI exactly (no UI re-drawing, no invented copy).
- Headlines: Outfit, left editorial column or above cards, never over UI text.
- No Chinese, no old-film data, no subtitles/VO.

## 7. Sound
Lead owns `src/core/sfx.ts`; single cue table derived from 03's sound points. BGM is the
existing 60s 120BPM edit at `audio/bgm/staycraft-60s.wav`. The no-BGM variant only mutes BGM.

## 8. Acceptance
2 frames per shot (03 §5). Lead renders them after each owner reports; review notes go back
to the owner. Final render only when every shot passes.

## 9. Render & mastering record (2026-11-13)
- Main: 1800 frames / 60.053s / 1920×1080 / 30fps / H.264 + AAC 320k 48kHz.
  Raw mix −11.7 LUFS / +0.4 dBTP → mastered −15.5 LUFS / −2.7 dBTP
  (`volume=-3.8dB, alimiter=limit=0.76:attack=5:release=60:level=disabled`).
- No-BGM: 1800 frames / 60.032s; SFX only, mastered to −20.0 LUFS / −3.3 dBTP for a later VO mix.
- SFX cue peaks use the measured pipeline offset `OUTPUT_AUDIO_OFFSET_FRAMES = 1.33f`
  (same AAC priming as the previous StayCraft films).
- QR decoded from the final rendered frame 1799: **https://staycraft.online**.
- Seams verified numerically: S06 f659 vs S07 f660 identical white-card bounds
  (901,161,878×766); S10 f1079 vs S11 f1080 identical (917,0,848×965);
  S11→S12 opens from the stats-card rect (S11_EXIT) and S15→S16 crosses through the
  T4 iris.
- Typecheck: `npx tsc --noEmit -p tsconfig.json` exit 0 at final render time.
