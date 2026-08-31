import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const DESIGN_WIDTH = 430;
const DESIGN_HEIGHT = 932;

/**
 * Every full-screen scene is composed on a fixed 430x932 design canvas, then
 * scaled to the real viewport — a port of `designCanvasFit`/`FittedBox` from
 * the Flutter app. On a typical phone aspect ratio, scaling to fill the
 * viewport's width also fits it vertically (no letterboxing). On a
 * wider-than-designed viewport (tablets, desktop windows), filling the width
 * would push the canvas taller than the available height and crop the
 * bottom controls, so this falls back to "contain" instead, leaving a
 * same-color letterbox margin rather than ever cropping.
 */
export function DesignCanvas({ children, background = '#000' }: { children: ReactNode; background?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ transform: 'scale(1)' });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const recompute = () => {
      const { clientWidth, clientHeight } = outer;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const scaledHeightAtFitWidth = DESIGN_HEIGHT * (clientWidth / DESIGN_WIDTH);
      const fitsByWidth = scaledHeightAtFitWidth <= clientHeight + 0.5;
      const scale = fitsByWidth
        ? clientWidth / DESIGN_WIDTH
        : Math.min(clientWidth / DESIGN_WIDTH, clientHeight / DESIGN_HEIGHT);
      setStyle({
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `translateX(-50%) scale(${scale})`,
      });
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transformOrigin: 'top center',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- shared layout constant, not a component
export const designCanvasSize = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
