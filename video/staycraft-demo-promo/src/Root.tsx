import { Composition } from 'remotion';
import type { FC } from 'react';
import { StayCraftDemoPromo } from './StayCraftDemoPromo';
import { DURATION, FPS, HEIGHT, WIDTH } from './core/beat';

export const RemotionRoot: FC = () => (
  <Composition
    id="StayCraftDemoEN"
    component={StayCraftDemoPromo}
    durationInFrames={DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ bgm: true, sfx: true }}
  />
);
