import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { useBrandFonts } from './fonts';
import { DURATION, SHOTS } from './core/timeline';
import { SHOT_COMPONENTS } from './shots';
import { Grain } from './core/ui';
import { Bgm, SfxBed } from './core/AudioBed';
import { FilmOptionsProvider } from './core/options';
import { VO, bgmVolumeAt } from './core/vo';

type Props = { bgm?: boolean; vo?: boolean; captions?: boolean };

export const StayCraftPromo: React.FC<Props> = ({ bgm = true, vo = true, captions = true }) => {
  useBrandFonts();
  return (
    <FilmOptionsProvider value={{ bgm, vo, captions }}>
      <AbsoluteFill style={{ backgroundColor: '#f4f4f6' }}>
        {SHOTS.map((shot) => {
          const Shot = SHOT_COMPONENTS[shot.id];
          return (
            <Sequence key={shot.id} from={shot.from} durationInFrames={shot.duration} name={`${shot.id} ${shot.title}`} premountFor={30}>
              <Shot />
            </Sequence>
          );
        })}
        {bgm ? <Audio src={staticFile('audio/bgm/staycraft-60s.wav')} volume={(f) => (vo ? bgmVolumeAt(f) : 0.86)} /> : null}
        {vo
          ? VO.map((seg) => (
              <Sequence key={seg.id} from={seg.from} durationInFrames={seg.durationInFrames} name={'vo ' + seg.id}>
                <Audio src={staticFile(seg.file)} volume={2.0} />
              </Sequence>
            ))
          : null}
        <SfxBed />
        <Grain opacity={0.1} />
      </AbsoluteFill>
    </FilmOptionsProvider>
  );
};

export { DURATION };
