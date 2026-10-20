import { useEffect, useState } from 'react';
import { BUILT_FOR_PLAYGAMA } from '../../buildTarget';

/** The widest the game field may be, as a multiple of its height, in the
 * Playgama build — its checklist (§27) asks for margins rather than a strip
 * on an ultra-wide or very short window. Mirrors `.rc-ratio-capped` in
 * global.css, which narrows #root to the same width. */
export const MAX_FIELD_ASPECT = 2;

function measure() {
  const height = window.innerHeight;
  const width = BUILT_FOR_PLAYGAMA ? Math.min(window.innerWidth, height * MAX_FIELD_ASPECT) : window.innerWidth;
  return { width, height };
}

/** Tracks the size the game is laid out in — used to pick portrait vs
 * landscape layout. The browser viewport, capped at 2:1 on Playgama. */
export function useViewportSize() {
  const [size, setSize] = useState(measure);

  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
