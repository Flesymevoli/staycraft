import type { FC } from 'react';
import type { ShotId } from '../core/timeline';
import { S01 } from './S01';
import { S02 } from './S02';
import { S03 } from './S03';
import { S04 } from './S04';
import { S05 } from './S05';
import { S06 } from './S06';
import { S07 } from './S07';
import { S08 } from './S08';
import { S09 } from './S09';
import { S10 } from './S10';
import { S11 } from './S11';
import { S12 } from './S12';
import { S13 } from './S13';
import { S14 } from './S14';
import { S15 } from './S15';
import { S16 } from './S16';

export const SHOT_COMPONENTS: Record<ShotId, FC> = {
  S01,
  S02,
  S03,
  S04,
  S05,
  S06,
  S07,
  S08,
  S09,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
  S16,
};
