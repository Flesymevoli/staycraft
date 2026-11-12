import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { FC, ReactNode } from 'react';
import { C, EASE, FONT, SHADOW } from '../core/theme';

/**
 * S03 · 导入归位 (285–375f, 3.0s)
 * fog 台；PC-04「订单与导入」页的真实裁片放在纸上（裁掉 sidebar，取内容区 240–1440）。
 * 3 行导入待办从空中飞入嵌入真实槽位（row-embed：加速下落 + rotateX 收平 + 压弹 + 底边 violet 缝），
 * 然后 T3 同页状态连续：真实 tab 胶囊从「订单与导入」滑到「数据概况」，内容 12f crossfade 到 PC-03。
 * 只做页面外注记：大字 / caption / 小字 / 槽位补丁 / 胶囊（胶囊与内容都是真实截图裁片，不重绘 UI）。
 */

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ramp = (f: number, a: number, b: number, ease: (t: number) => number = EASE.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });

// 页面纸在屏幕上的位置：内容区裁切（page x 240–1440, y 0–900），1:1 基准
const SHEET = { x: 680, y: 90, w: 1200, h: 850, cropX: 240 };
const CROP_Y = 850;
const TRACK = '#e9e9ed'; // 截图里 segmented control 的轨道底色（逐像素采样）

// ───────────── 页面纸 ─────────────
const PageSheet: FC<{ scale: number; children?: ReactNode }> = ({ scale, children }) => (
  <div
    style={{
      position: 'absolute',
      left: SHEET.x,
      top: SHEET.y,
      width: SHEET.w,
      height: SHEET.h,
      borderRadius: 26,
      overflow: 'hidden',
      border: '1px solid ' + C.line,
      background: '#ffffff',
      boxShadow: SHADOW.sheet,
      transform: 'scale(' + scale + ')',
      transformOrigin: 'center center',
    }}
  >
    <div style={{ position: 'absolute', left: -SHEET.cropX, top: 0, width: 1440, height: CROP_Y }}>
      <Img src={staticFile('textures/app-import.png')} style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 4799, display: 'block' }} />
      {children}
    </div>
  </div>
);

// ───────────── 行嵌入（row-embed 参数）─────────────
type Slot = { x: number; y: number; w: number; h: number };
// 导入待办 4 行：文字行实测 baseline y = 546 / 612 / 679 / 745，槽位含下方「标记完成」链接
const SLOTS: Slot[] = [
  { x: 280, y: 536, w: 1100, h: 58 },
  { x: 280, y: 602, w: 1100, h: 58 },
  { x: 280, y: 669, w: 1100, h: 58 },
  { x: 280, y: 735, w: 1100, h: 58 },
];
// 第 1 行作为已存在的锚点，后 3 行飞入（cue 8/18/26，飞行 12f，末段仍有速度）
const FLY_ROWS = [1, 2, 3];
const CUES = [8, 18, 26];
const FLY = 12;
const FLY_EASE = Easing.bezier(0.5, 0, 0.8, 0.75);

const RowSlots: FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {FLY_ROWS.map((slotIndex, k) => {
        const slot = SLOTS[slotIndex];
        const cue = CUES[k];
        const land = cue + FLY;
        const air = 1 - ramp(f, cue, cue + FLY, FLY_EASE);
        const patchOp = f >= land ? interpolate(f, [land, land + 2], [1, 0], clamp) : 1;
        const appear = ramp(f, land - 6, land - 3, EASE.out);
        const p = 1 - air;
        const scale = f < land ? 1.06 - 0.065 * p : interpolate(f, [land, land + 4], [0.995, 1], { ...clamp, easing: Easing.out(Easing.quad) });
        const mb = f < land ? Math.sin((1 - air) * Math.PI) * 2.4 : 0;
        const flying = f >= cue && f < land + 4;
        const seamP = f >= land && f < land + 8 ? 1 : 0;
        return (
          <div key={slotIndex}>
            {/* 空槽补丁：页面真实底色 #fff + 极淡虚线槽位框 */}
            {patchOp > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: slot.x - 8,
                  top: slot.y - 4,
                  width: slot.w + 24,
                  height: slot.h + 8,
                  background: '#ffffff',
                  opacity: patchOp,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 6,
                    width: slot.w,
                    height: slot.h - 8,
                    borderRadius: 8,
                    border: '1px dashed rgba(101,84,232,0.20)',
                    boxSizing: 'border-box',
                    background: 'rgba(101,84,232,0.015)',
                    opacity: interact(f, cue, land),
                  }}
                />
              </div>
            ) : null}
            {/* 落地接触影 */}
            {flying ? (
              <div
                style={{
                  position: 'absolute',
                  left: slot.x + 10,
                  top: slot.y + 6,
                  width: slot.w - 20,
                  height: slot.h - 6,
                  borderRadius: 10,
                  boxShadow: '0 ' + (2 + 6 * air) + 'px ' + (6 + 18 * air) + 'px rgba(60,42,20,' + (0.16 * (1 - air)) + ')',
                  zIndex: 3,
                }}
              />
            ) : null}
            {/* 飞行体：整页截图的负偏移裁片（不重绘内容）。外层槽位窗口 overflow hidden —
                行只在自己槽位的窗口里落下，不会叠到相邻行上（row-embed 的 120px 空投在
                这里按 66px 行距改成「窗口内落地」，落点仍是真实槽位） */}
            {flying ? (
              <div style={{ position: 'absolute', left: slot.x, top: slot.y - 18, width: slot.w, height: slot.h + 18, overflow: 'hidden', borderRadius: 8, zIndex: 4 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 18,
                    width: slot.w,
                    height: slot.h,
                    opacity: appear,
                    transform:
                      'perspective(900px) translateY(' + (-120 * air) + 'px) rotateX(' + 16 * air + 'deg) scale(' + scale + ')',
                    filter: mb > 0.2 ? 'blur(' + mb + 'px)' : undefined,
                    background: '#ffffff',
                    backgroundImage: 'url(' + staticFile('textures/app-import.png') + ')',
                    backgroundSize: '1440px 4799px',
                    backgroundPosition: -slot.x + 'px ' + -slot.y + 'px',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,' + 0.9 * air + '), 0 ' + 24 * air + 'px ' + 48 * air + 'px -' + 12 * air + 'px rgba(24,24,27,' + 0.20 * air + ')',
                  }}
                />
              </div>
            ) : null}
            {/* 嵌入瞬间：底边 2px violet 强调缝，从中心向两侧展开、8f 淡出 */}
            {seamP ? (
              <div
                style={{
                  position: 'absolute',
                  left: slot.x + slot.w / 2 - (slot.w * ramp(f, land, land + 5, Easing.out(Easing.cubic))) / 2,
                  top: slot.y + slot.h - 2,
                  width: slot.w * ramp(f, land, land + 5, Easing.out(Easing.cubic)),
                  height: 2,
                  borderRadius: 1,
                  background: 'linear-gradient(90deg, rgba(101,84,232,0) 0%, rgba(101,84,232,0.92) 18%, rgba(101,84,232,0.92) 82%, rgba(101,84,232,0) 100%)',
                  boxShadow: '0 0 7px rgba(101,84,232,0.35)',
                  opacity: interpolate(f, [land, land + 2, land + 8], [1, 1, 0], clamp),
                  zIndex: 5,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
};

// 槽位提示：飞入时虚线框提亮
const interact = (f: number, cue: number, land: number) =>
  interpolate(f, [cue - 6, cue + 4, land, land + 2], [0.5, 1, 1, 0], clamp);

// ───────────── T3：同页 tab 状态切换（真实胶囊裁片 + 真实 tab 栏 crossfade）─────────────
const TabSwitch: FC = () => {
  const f = useCurrentFrame();
  // 目标胶囊 = PC-03 的「数据概况」实测 bbox（282,203,86,40）
  const CAP = { x: 282, w: 86, y: 203, h: 40 };
  const OLD = { x: 372, w: 99, y: 203, h: 40 };
  const slide = ramp(f, 52, 60, Easing.bezier(0.22, 0.61, 0.36, 1));
  const capLeft = OLD.x + (CAP.x - OLD.x) * slide;
  // 胶囊/盖片只在切换窗口出现：f0–51 保持页面原本的「订单与导入」选中态
  const capFade = ramp(f, 51, 53, EASE.out) * (1 - ramp(f, 64, 67, EASE.inOut));
  const tabOverlay = ramp(f, 56, 62, EASE.inOut);
  const contentOverlay = ramp(f, 52, 64, EASE.inOut);
  const patchFade = ramp(f, 51, 52, EASE.out) * (1 - ramp(f, 58, 62, EASE.inOut));
  return (
    <>
      {/* 内容区 crossfade：PC-03 的 date row + 四指标卡 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 250,
          width: 1440,
          height: CROP_Y - 250,
          opacity: contentOverlay,
          zIndex: 6,
          background: '#ffffff',
          backgroundImage: 'url(' + staticFile('textures/app-analysis.png') + ')',
          backgroundSize: '1440px 1530px',
          backgroundPosition: '0px -250px',
        }}
      />
      {/* tab 栏 crossfade：PC-03 的选中态（在胶囊到位后） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 186,
          width: 1440,
          height: 66,
          opacity: tabOverlay,
          zIndex: 7,
          backgroundImage: 'url(' + staticFile('textures/app-analysis.png') + ')',
          backgroundSize: '1440px 1530px',
          backgroundPosition: '0px -186px',
        }}
      />
      {/* 旧胶囊盖片：轨道底色 */}
      <div
        style={{
          position: 'absolute',
          left: OLD.x - 2,
          top: OLD.y - 1,
          width: OLD.w + 4,
          height: OLD.h + 2,
          borderRadius: 999,
          background: TRACK,
          opacity: patchFade,
          zIndex: 8,
        }}
      />
      {/* 滑动胶囊：PC-03「数据概况」真实裁片 */}
      <div
        style={{
          position: 'absolute',
          left: capLeft,
          top: CAP.y,
          width: CAP.w,
          height: CAP.h,
          borderRadius: 999,
          overflow: 'hidden',
          opacity: capFade,
          zIndex: 9,
          backgroundImage: 'url(' + staticFile('textures/app-analysis.png') + ')',
          backgroundSize: '1440px 1530px',
          backgroundPosition: -CAP.x + 'px ' + -CAP.y + 'px',
          boxShadow: '0 2px 8px rgba(24,24,27,0.18)',
        }}
      />
    </>
  );
};

// ───────────── 大字 / caption / 小字 ─────────────
const PressLine: FC<{ text: string; start: number; size?: number; color?: string; weight?: number }> = ({
  text,
  start,
  size = 96,
  color = C.ink,
  weight = 700,
}) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 18, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.16,
        letterSpacing: '-0.02em',
        color,
        whiteSpace: 'nowrap',
        opacity: p,
        filter: p >= 0.999 ? undefined : 'blur(' + (1 - p) * 6 + 'px)',
        transform: 'translateY(' + (1 - p) * 16 + 'px)',
      }}
    >
      {text}
    </div>
  );
};

const FadeLine: FC<{ text: string; start: number; size?: number; color?: string; weight?: number }> = ({
  text,
  start,
  size = 56,
  color = C.muted,
  weight = 500,
}) => {
  const f = useCurrentFrame();
  const p = ramp(f, start, start + 10, EASE.out);
  return (
    <div
      style={{
        fontFamily: FONT.zh,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.5,
        color,
        opacity: p,
        whiteSpace: 'nowrap',
        transform: 'translateY(' + (1 - p) * 10 + 'px)',
      }}
    >
      {text}
    </div>
  );
};

export const S03: FC = () => {
  const f = useCurrentFrame();
  // 相机微拉：1.05 → 1.0（1x 素材止步于原生，结尾最锐）
  const scale = 1.05 - 0.05 * ramp(f, 0, 64, EASE.inOut);
  // 大字「一处」violet 细下划线
  const ul = ramp(f, 74, 82, EASE.inOut);
  const labelIn = ramp(f, 74, 84, EASE.out);
  return (
    <AbsoluteFill style={{ background: C.fog, overflow: 'hidden' }}>
      <PageSheet scale={scale}>
        <RowSlots />
        <TabSwitch />
      </PageSheet>

      {/* 大字左上（页面纸左侧雾灰 gutter 内） */}
      <div style={{ position: 'absolute', left: 120, top: 236 }}>
        <PressLine text="先把订单" start={52} />
        <PressLine text="归到一处" start={56} />
        <div
          style={{
            position: 'absolute',
            left: 2 * 96,
            top: 2 * 96 * 1.16 + 8,
            width: 2 * 96 * ul,
            height: 2,
            background: C.violet,
            opacity: 0.9,
          }}
        />
      </div>

      {/* caption 两行（≤18 字/行），落在左列 */}
      <div style={{ position: 'absolute', left: 120, top: 520 }}>
        <FadeLine text="核对新增、改期、" start={66} />
        <FadeLine text="取消，再开始算。" start={70} />
      </div>

      {/* 小字右下（fog 底边） */}
      <div
        style={{
          position: 'absolute',
          right: 140,
          bottom: 44,
          fontFamily: FONT.zh,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: C.muted,
          opacity: labelIn,
        }}
      >
        导入待办 · 逐条核对
      </div>
    </AbsoluteFill>
  );
};
