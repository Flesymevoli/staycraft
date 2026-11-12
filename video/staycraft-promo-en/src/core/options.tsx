import { createContext, useContext } from 'react';

export type FilmOptions = {
  /** narration / subtitle captions (title typography is design, not subtitle) */
  captions: boolean;
  /** voice-over track + BGM ducking */
  vo: boolean;
  /** background music */
  bgm: boolean;
};

export const DEFAULT_FILM_OPTIONS: FilmOptions = { captions: true, vo: true, bgm: true };

const Ctx = createContext<FilmOptions>(DEFAULT_FILM_OPTIONS);
export const FilmOptionsProvider = Ctx.Provider;
export const useFilmOptions = () => useContext(Ctx);
