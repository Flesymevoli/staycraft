import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { SFX } from './sfx';

export const Bgm: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  if (!enabled) return null;
  return <Audio src={staticFile('audio/bgm/staycraft-60s.wav')} volume={0.86} />;
};

/** SFX cues are absolute-frame declarations; each plays inside its own Sequence. */
export const SfxBed: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  if (!enabled) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {SFX.map((cue) => (
        <Sequence key={cue.id} from={cue.from} durationInFrames={cue.durationInFrames} name={'sfx ' + cue.id}>
          <Audio src={staticFile(cue.src)} volume={cue.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
