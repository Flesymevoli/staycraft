import { useEffect, useState } from 'react';
import { delayRender, continueRender, staticFile } from 'remotion';

let loaded = false;
let handle: number | null = null;

const ensureHandle = () => {
  if (handle === null) handle = delayRender('Loading Outfit font');
  return handle;
};

export const useBrandFonts = () => {
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    if (loaded) { setReady(true); return; }
    const h = ensureHandle();
    const face = new FontFace('Outfit', `url(${staticFile('fonts/Outfit.ttf')}) format('truetype')`, {
      weight: '100 900', style: 'normal',
    });
    let cancelled = false;
    face.load()
      .then((f) => { document.fonts.add(f); loaded = true; if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setReady(true); })
      .finally(() => { continueRender(h); handle = null; });
    return () => { cancelled = true; };
  }, []);
  return ready;
};
