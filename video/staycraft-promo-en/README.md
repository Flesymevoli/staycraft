# StayCraft · 60s product promo — English cut (Remotion)

English version of the StayCraft promo: real English UI captures, English copy,
male voice-over, burned-in subtitles (and a clean no-subtitle variant), QR end card.

## Deliverables
| file | what |
|---|---|
| `out/staycraft-promo-en.mp4` | EN + male VO + burned subtitles + BGM/SFX |
| `out/staycraft-promo-en-nosub.mp4` | same, subtitle layer OFF |
| `out/staycraft-promo-en-novo.mp4` | no VO (subtitles + BGM/SFX) |
| `out/staycraft-promo-en-nobgm.mp4` | no BGM (VO + subtitles + SFX) |
| `subs/staycraft-promo-en.srt` | external subtitle file (17 cues) |

Specs: 1920×1080 / 30fps / 1800 frames / 60.0s, H.264 + AAC.

## Render
```bash
cd video/staycraft-promo-en
npm install
npx remotion render src/index.ts StayCraftPromoEN out/staycraft-promo-en.mp4
npx remotion render src/index.ts StayCraftPromoEN out/staycraft-promo-en-nosub.mp4 --props=props-en-vo-nosub.json
npx remotion render src/index.ts StayCraftPromoEN out/staycraft-promo-en-novo.mp4  --props=props-en-novo.json
npx remotion render src/index.ts StayCraftPromoEN out/staycraft-promo-en-nobgm.mp4 --props=props-en-nobgm.json
```
- Chromium path is set in `remotion.config.ts`; change it on another machine.
- If the system temp dir is restricted, point TEMP/TMP inside the project before rendering.
- Master delivered files with a limiter (see docs/03-en-implementation.md for levels).

## How it is built
- `src/core/timeline.ts` — the same 16-shot / 1800f timeline as the Chinese cut (single source of truth).
- `src/core/layout.ts` — EN page sizes + measured regions (1440 CSS grid).
- `src/shots/S01–S16.tsx` — EN shots (real EN screenshots, English typography, no Chinese AI text readable).
- `src/core/vo.ts` — 16 VO segments + BGM ducking curve.
- `src/core/options.tsx` — `captions` / `vo` / `bgm` switches rendered through props files.
- `src/core/sfx.ts` — same SFX cue table as the Chinese cut.
- `audio/vo/` — generated VO files + manifest; `tools/vo-gen.mjs` regenerates them.
- `docs/` — EN copy deck (locked), facts/adaptation, implementation notes.

## Assets & honesty
- Page textures are 2x captures of the English UI (staycraft.online demo), 2026-11-05.
- Numbers on screen all come from those captures: 54.3%, 19/35, ¥10,802.33, ¥568.54,
  range ¥150–¥639, list rates ¥520–¥760, gap 8–10 Nov. Demo data is labelled as fictional.
- Market hotel names/addresses are blurred before use. No Chinese AI-generated copy is readable.
- Two English invitations are the film's rewrite, labelled "Sample copy · English edition".
- QR end card: https://staycraft.online (English cut only).
- VO: edge-tts en-US-ChristopherNeural; BGM/SFX licensing is the same as the Chinese cut
  (see ../staycraft-promo/public/audio/ATTRIBUTION-note.md and the Freesound manifest).

## Measured deliverables (2026-11-05)

| file | video | audio | loudness |
|---|---|---|---|
| staycraft-promo-en.mp4 | 1800f / 1920×1080 / 30fps | VO + BGM + SFX + burned subs | −14.6 LUFS / −1.8 dBTP |
| staycraft-promo-en-nosub.mp4 | 1800f | VO + BGM + SFX, subs layer OFF | −14.6 LUFS / −1.8 dBTP |
| staycraft-promo-en-novo.mp4 | 1800f | BGM + SFX, no VO | −15.9 LUFS / −3.5 dBTP |
| staycraft-promo-en-nobgm.mp4 | 1800f | VO + SFX, no BGM | −15.4 LUFS / −1.8 dBTP |

VO audibility check (S01 narration window 1–5s, mean/max): with VO −21.2 / −2.5 dB, no-VO bed −24.4 / −9.2 dB.
