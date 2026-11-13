# StayCraft · 60s concept-demo promo — English (Remotion)

English product film built on the final Gemini concept demo
(`frontend/public/concept/index.html`). Three functions, one decision loop:
**AI diagnosis → business data → nearby market research**, closing on the official
brand line and a QR to https://staycraft.online.

- 1920×1080 · 30fps · 1800 frames · 60.0s · 120 BPM grid
- **No voice-over, no subtitles** — the user adds them later with GPT. The bottom
  140px centre is kept free as a subtitle-safe area.
- BGM + SFX included; a no-BGM variant is delivered for VO mixing.
- Old Chinese/English films remain untouched (`video/staycraft-promo`,
  `video/staycraft-promo-en`).

## Deliverables
| file | what |
|---|---|
| `out/staycraft-demo-promo.mp4` | main: BGM + SFX, QR end card · 1800f / 60.053s · **−15.5 LUFS / −2.7 dBTP** |
| `out/staycraft-demo-promo-nobgm.mp4` | BGM muted (SFX only), for adding VO/music later · 1800f / 60.032s · **−20.0 LUFS / −3.3 dBTP** |

## Render
```bash
cd video/staycraft-demo-promo
npx remotion render src/index.ts StayCraftDemoEN out/staycraft-demo-promo.mp4
npx remotion render src/index.ts StayCraftDemoEN out/staycraft-demo-promo-nobgm.mp4 --props=props-nobgm.json
```
- Chromium path is set in `remotion.config.ts`; TEMP/TMP may need to point inside
  the project on sandboxed Windows hosts.
- Master with a limiter after render (levels in docs/04).

## How it is built
- `src/core/timeline.ts` — locked 16-shot timeline (docs/03).
- `src/core/layout.ts` — authoritative CSS-px geometry measured from the demo.
- `src/core/PageCam.tsx`, `overlays.tsx`, `ui.tsx` — 2.5D camera and overlay kit.
- `src/shots/S01–S16.tsx` — the film (motion-a: S01–S06, motion-b: S07–S11,
  motion-c: S12–S16).
- `src/core/sfx.ts` — SFX cue table; `public/audio/bgm/staycraft-60s.wav` — reused 120BPM edit.
- `capture/` — capture + layout scripts and measured JSON; `docs/` — brief,
  visual direction, copy deck, storyboard, implementation notes.

## Assets & honesty
- All screen textures are 2x captures of the English demo (2026-11-13). The demo's
  EN mode leaves a few labels untranslated; those labels were localized **at capture
  time only** (DOM text pass, 36 nodes) — the frontend source was not modified and
  no data was changed. No Chinese is readable in the picture.
- Numbers on screen are the demo's: ¥18,450 / 42 / ¥439.29 / ¥12,800 (24/35) /
  68.6% / ¥533.33 / ¥540 / ¥488–¥594 / ¥420–¥580 / ¥520–¥540. Demo data is labelled
  "Concept demo · fictional data".
- No real OTA/PMS/payment integration is claimed; "Ctrip" appears only as the demo's
  captured source label.
- QR: https://staycraft.online (decoded and verified).
- Fonts: Outfit (OFL), copied from the demo's public folder.
- BGM/SFX licensing: same CC0 sources as the previous StayCraft films
  (`public/audio/sfx/FREESOUND-CREDITS.md`, `ATTRIBUTION-note.md`).

## Final QA (2026-11-13)
- Both files: 1800 frames, 1920×1080, 30fps, H.264 + AAC 320k/48kHz; durations 60.05s / 60.03s.
- QR decoded from the final rendered frame 1799: **https://staycraft.online**.
- Seams checked numerically (S06→S07, S10→S11 pixel-identical card bounds; S11→S12 card match; S15→S16 iris).
- All 16 shots were reviewed at their acceptance frames; S04 count-up dropped (ring only),
  S02 duplicate-KPI overlays removed, S14 crop includes the card heading.
- Project typecheck `npx tsc --noEmit -p tsconfig.json` exits 0.
