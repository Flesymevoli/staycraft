import { AbsoluteFill, Sequence } from 'remotion';
import { useBrandFonts } from './fonts';
import { DURATION } from './core/timeline';
import { SHOTS } from './core/timeline';
import { SHOT_COMPONENTS } from './shots';
import { Grain } from './core/ui';
import { Bgm, SfxBed } from './core/AudioBed';

export const StayCraftPromo: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  useBrandFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: '#f4f4f6' }}>
      {SHOTS.map((shot) => {
        const Shot = SHOT_COMPONENTS[shot.id];
        return (
          <Sequence key={shot.id} from={shot.from} durationInFrames={shot.duration} name={`${shot.id} ${shot.title}`} premountFor={30}>
            <Shot />
          </Sequence>
        );
      })}
      <Bgm enabled={bgm} />
      <SfxBed />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};

export { DURATION };