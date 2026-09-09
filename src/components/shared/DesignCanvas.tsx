import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

const DESIGN_WIDTH = 430;
const DESIGN_HEIGHT = 932;

/**
 * The widest the canvas grows: what the wide painting behind it covers, which
 * is every portrait shape up to square — a 4:3 tablet asks for 699.
 */
export const MAX_CANVAS_WIDTH = 940;

/**
 * The tallest. 1165 units is an aspect of 0.37; the tallest phones sold are
 * 21:9, which is 0.43.
 */
export const MAX_CANVAS_HEIGHT = 1165;

export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * The canvas a screen composes on, in design units, for a viewport of this
 * size.
 *
 * The app is drawn for 430×932 and a viewport is rarely that shape. Scaling
 * the composition and accepting the margins is the simple answer, and it is
 * what every screen used to do; what it costs is a letterbox around the
 * picture, and a layout that ignores the room it was given.
 *
 * So the canvas keeps the viewport's own aspect — 430 wide and taller than
 * 932 on a phone, 932 tall and wider than 430 on a desktop window — and the
 * parts anchored to its edges move with them. One of the two dimensions is
 * always the design value, so nothing is ever scaled up past the size it was
 * drawn at, and the board's own geometry is untouched: it is measured from
 * the board's box, which this does not move.
 *
 * Mirrors the mobile app's `adaptiveCanvasUnits`.
 */
// eslint-disable-next-line react-refresh/only-export-components -- layout maths, not a component
export function adaptiveCanvasUnits(width: number, height: number): CanvasSize {
  if (width <= 0 || height <= 0) return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
  const unitsTall = (height * DESIGN_WIDTH) / width;
  if (unitsTall >= DESIGN_HEIGHT) {
    return { width: DESIGN_WIDTH, height: Math.min(unitsTall, MAX_CANVAS_HEIGHT) };
  }
  return {
    width: Math.min((width * DESIGN_HEIGHT) / height, MAX_CANVAS_WIDTH),
    height: DESIGN_HEIGHT,
  };
}

const CanvasSizeContext = createContext<CanvasSize>({
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
});

/**
 * The canvas the surrounding screen is laid out on. Screens use it to keep a
 * button a button: anything with a drawn size stays that size and is centred
 * on the canvas, while backgrounds and panels take the width they are given.
 */
// eslint-disable-next-line react-refresh/only-export-components -- a hook, not a component
export function useCanvasSize(): CanvasSize {
  return useContext(CanvasSizeContext);
}

/**
 * Every full-screen scene is composed on the canvas above, then scaled to the
 * real viewport — a port of `adaptiveCanvasUnits` + `FittedBox` from the
 * Flutter app. Canvas and viewport share an aspect ratio, so the scale here
 * only turns design units into pixels and nothing is letterboxed.
 */
export function DesignCanvas({
  children,
  background = '#000',
}: {
  /** Given a function, it is called with the canvas the screen ended up
   * with: the parts that must keep the size they were drawn at need it to
   * centre themselves. */
  children: ReactNode | ((canvas: CanvasSize) => ReactNode);
  background?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<CanvasSize>({
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  });
  const [style, setStyle] = useState<CSSProperties>({ transform: 'scale(1)' });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const recompute = () => {
      const { clientWidth, clientHeight } = outer;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const next = adaptiveCanvasUnits(clientWidth, clientHeight);
      const scale = Math.min(clientWidth / next.width, clientHeight / next.height);
      setCanvas((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
      setStyle({
        width: next.width,
        height: next.height,
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
        <CanvasSizeContext.Provider value={canvas}>
          {typeof children === 'function' ? children(canvas) : children}
        </CanvasSizeContext.Provider>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- shared layout constant, not a component
export const designCanvasSize = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
