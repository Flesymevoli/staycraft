import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { useFilmOptions } from './options';
import { SFX } from './sfx';

export const Bgm: React.FC = () => {
  const { bgm } = useFilmOptions();
  if (!bgm) return null;
  return <Audio src={staticFile('audio/bgm/staycraft-60s.wav')} volume={0.82} />;
};

export const SfxBed: React.FC = () => {
  const { sfx } = useFilmOptions();
  if (!sfx) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {SFX.map((cue) => (
        <Audio key={cue.id} src={staticFile(cue.src)} volume={cue.volume} startFrom={0} />
      ))}
    </AbsoluteFill>
  );
};
