import { useEffect, useState } from 'react';
import { BUILT_FOR_VK, BUILT_WITH_CAPPED_FIELD } from '../../buildTarget';
import { vkInsets } from '../../services/vkPlatform';

/** The widest the game field may be, as a multiple of its height, in the
 * Playgama and VK builds — its checklist (§27) asks for margins rather than a strip
 * on an ultra-wide or very short window. Mirrors `.rc-ratio-capped` in
 * global.css, which narrows #root to the same width. */
export const MAX_FIELD_ASPECT = 2;

function measure() {
  // What the VK mobile client covers at the top and bottom is not ours to
  // draw on (rule 3.2.2); #root leaves it out too, see global.css.
  const insets = BUILT_FOR_VK ? vkInsets() : { top: 0, bottom: 0 };
  const height = window.innerHeight - insets.top - insets.bottom;
  const width = BUILT_WITH_CAPPED_FIELD ? Math.min(window.innerWidth, height * MAX_FIELD_ASPECT) : window.innerWidth;
  return { width, height };
}

/** Tracks the size the game is laid out in — used to pick portrait vs
 * landscape layout. The browser viewport, capped at 2:1 on Playgama and VK. */
export function useViewportSize() {
  const [size, setSize] = useState(measure);

  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
