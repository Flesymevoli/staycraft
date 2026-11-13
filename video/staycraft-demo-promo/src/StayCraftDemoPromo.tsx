import { AbsoluteFill, Sequence } from 'remotion';
import { useBrandFonts } from './fonts';
import { SHOTS } from './core/timeline';
import { SHOT_COMPONENTS } from './shots';
import { FilmOptionsProvider } from './core/options';
import { Bgm, SfxBed } from './core/AudioBed';
import { Grain } from './core/ui';

type Props = { bgm?: boolean; sfx?: boolean };

export const StayCraftDemoPromo: React.FC<Props> = ({ bgm = true, sfx = true }) => {
  useBrandFonts();
  return (
    <FilmOptionsProvider value={{ bgm, sfx }}>
      <AbsoluteFill style={{ backgroundColor: '#efedf8' }}>
        {SHOTS.map((shot) => {
          const Shot = SHOT_COMPONENTS[shot.id];
          return (
            <Sequence key={shot.id} from={shot.from} durationInFrames={shot.duration} name={shot.id + ' ' + shot.title} premountFor={30}>
              <Shot />
            </Sequence>
          );
        })}
        <Bgm />
        <SfxBed />
        <Grain opacity={0.06} />
      </AbsoluteFill>
    </FilmOptionsProvider>
  );
};
