import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, EASE, FONT } from '../core/theme';
import { WordTitle } from '../core/ui';

/**
 * S06 · Action plan (555–660f, 3.5s)
 * workbench-10 action-plan card macro. Camera settles down the card and lands
 * EXACTLY on S07's f0 rect: x=900 y=160 w=880 h=769 (2.2924× CSS, rounded 24,
 * 1px border, shadow) with no residual scale/rotation — motion-b's S07 f0 starts
 * from that same rectangle. One yellow use: a hand-drawn ring around the "¥40"
 * decision line; it fades before the handoff so S07 f0 carries no yellow.
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// S07 handoff rect (motion-b): 880×769 at (900,160)
const END = { x: 900, y: 160, w: 880, h: 769 };
const START = { x: 960, y: 215, w: 840, h: 735 };

export const S06: React.FC = () => {
  const f = useCurrentFrame();

  const enter = ramp(f, 0, 14, EASE.inOut);
  const settle = ramp(f, 0, 100, EASE.inOut);
  const x = START.x + (END.x - START.x) * settle;
  const y = START.y + (END.y - START.y) * settle;
  const w = START.w + (END.w - START.w) * settle;
  const h = START.h + (END.h - START.h) * settle;

  const kick = ramp(f, 5, 17, EASE.out);
  const ringDraw = ramp(f, 28, 42, EASE.inOut);
  const ringPop = interpolate(f, [28, 34, 44], [1.14, 1.0, 1.0], clamp);
  const ringOut = 1 - ramp(f, 86, 100, EASE.inOut);
  // left title/kicker leaves before the S07 hand-off (S07 f0 has no title)
  const titleOut = 1 - ramp(f, 92, 104, EASE.inOut);

  // ring in card-local display space, measured from the 2x capture (×2 CSS: 99..167, 227..275)
  const S = w / 768;
  const ringW = 68 * S;
  const ringH = 48 * S;
  const ringX = 99 * S;
  const ringY = 227 * S;
  const rcx = ringX + ringW / 2;
  const rcy = ringY + ringH / 2;

  return (
    <AbsoluteFill style={{ background: C.stage, overflow: 'hidden' }}>
      {/* editorial column */}
      <div style={{ position: 'absolute', left: 100, top: 268, width: 800, opacity: titleOut, transform: 'translateY(' + (1 - titleOut) * -8 + 'px)' }}>
        <div
          style={{
            fontFamily: FONT.en,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: C.violet,
            opacity: kick,
            transform: 'translateY(' + (1 - kick) * 8 + 'px)',
          }}
        >
          ACTION PLAN · 2 OF 3 DONE
        </div>
        <WordTitle lines={['From judgment', 'to action.']} from={10} size={96} color={C.ink} style={{ marginTop: 34 }} />
      </div>

      {/* card macro — ends on S07's exact handoff rectangle, no residual transform */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          opacity: enter,
          filter: enter >= 0.999 ? undefined : 'blur(' + (1 - enter) * 8 + 'px)',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid ' + C.lineStrong,
          boxShadow: C.shadow,
          background: '#fff',
        }}
      >
        <Img src={staticFile('textures/cards/workbench-10.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

        {/* yellow hand-drawn ring around "¥40" (single emphasis, gone before handoff) */}
        <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} style={{ position: 'absolute', inset: 0, opacity: ringOut }}>
          <rect
            x={ringX}
            y={ringY}
            width={ringW}
            height={ringH}
            rx={16 * S}
            fill="none"
            stroke={C.yellow}
            strokeWidth={6}
            opacity={0.22}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ringDraw}
            transform={'translate(' + rcx + ' ' + rcy + ') rotate(-2) scale(' + ringPop + ') translate(' + -rcx + ' ' + -rcy + ')'}
          />
          <rect
            x={ringX}
            y={ringY}
            width={ringW}
            height={ringH}
            rx={16 * S}
            fill="none"
            stroke={C.yellow}
            strokeWidth={2.6}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ringDraw}
            transform={'translate(' + rcx + ' ' + rcy + ') rotate(-2) scale(' + ringPop + ') translate(' + -rcx + ' ' + -rcy + ')'}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
