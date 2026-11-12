import { Composition } from 'remotion';
import type { FC } from 'react';
import { StayCraftPromo } from './StayCraftPromo';
import { DURATION, FPS, HEIGHT, WIDTH } from './core/beat';

export const RemotionRoot: FC = () => {
  return (
    <Composition
      id="StayCraftPromoEN"
      component={StayCraftPromo}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ bgm: true, vo: true, captions: true }}
    />
  );
};
