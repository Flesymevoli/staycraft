import { createContext, useContext } from 'react';

export type FilmOptions = {
  /** background music (off for the no-BGM deliverable used when adding VO later) */
  bgm: boolean;
  /** sound effects */
  sfx: boolean;
};

export const DEFAULT_FILM_OPTIONS: FilmOptions = { bgm: true, sfx: true };
const Ctx = createContext<FilmOptions>(DEFAULT_FILM_OPTIONS);
export const FilmOptionsProvider = Ctx.Provider;
export const useFilmOptions = () => useContext(Ctx);
