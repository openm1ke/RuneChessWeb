import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { BOARD_LEFT, BOARD_TOP } from './boardPerspective';
import { useDragController } from './useDragController';
import { Tray } from '../tray/Tray';
import { DozorEngine } from '../../game/dozorEngine';
import { useDozorEngine } from '../../game/useDozorEngine';
import { useCosmeticSkin } from '../../game/cosmeticSkinContext';
import type { LessonScript } from '../../data/howToPlayLessons';

/** The composition a lesson is laid out on, in design units: a board and a
 * tray, with none of the game screen's furniture around them. */
const DESIGN_WIDTH = 430;
const DESIGN_HEIGHT = 490;
/** How much of the set's painting is cropped off the top — the room above
 * the table is already behind this card. */
const ART_TOP = 206;

/**
 * One rules-screen lesson, played on the real board.
 *
 * `Board` and `Tray` here are the same components the game runs on, driven
 * by an engine of the lesson's own through `DozorEngine.loadLesson`. The
 * player drags a real figure onto a real square and watches a real beam
 * reach a real rune. Mirrors the app's `LessonBoard`.
 *
 * The composition is drawn at a fixed design size and scaled to the room it
 * is given; dropping a figure still lands on the right square because the
 * drag controller maps the pointer through the board's on-screen rect.
 */
export function LessonBoard({
  lesson,
  resetSignal,
  onSolvedChange,
}: {
  lesson: LessonScript;
  /** Bumped by the screen's "again" button to put the lesson back to its
   * opening position. */
  resetSignal: number;
  onSolvedChange: (solved: boolean) => void;
}) {
  const skin = useCosmeticSkin();
  const engine = useMemo(() => {
    const created = new DozorEngine();
    created.loadLesson(lesson.level);
    return created;
  }, [lesson]);
  const { snapshot } = useDozorEngine(engine);
  const boardRef = useRef<HTMLDivElement>(null!);
  const trayRef = useRef<HTMLDivElement>(null!);
  const drag = useDragController(engine, boardRef, trayRef);

  useEffect(() => {
    if (resetSignal > 0) engine.resetLevel();
  }, [resetSignal, engine]);

  useEffect(() => {
    onSolvedChange(snapshot.solved);
  }, [snapshot.solved, onSolvedChange]);

  // The beams flow only while there are beams to draw, as in the game.
  const [beamPhase, setBeamPhase] = useState(0);
  useEffect(() => {
    if (snapshot.beams.length === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (time: number) => {
      setBeamPhase(((time - start) / 1150) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [snapshot.beams.length]);

  // Scale the fixed composition to whatever room the screen gives it.
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setScale(Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          marginLeft: -DESIGN_WIDTH / 2,
          marginTop: -DESIGN_HEIGHT / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          borderRadius: 22,
          overflow: 'hidden',
          background: skin.backdrop,
        }}
      >
        {/* The set's own table, at the size it was painted for and slid up
            so the board stands on it exactly as in the game. Scaling it to
            this shorter box would squash the perspective the squares are
            projected with. */}
        <img
          src={skin.boardAsset}
          alt=""
          draggable={false}
          style={{ position: 'absolute', left: 0, top: -ART_TOP, width: 430, height: 764, objectFit: 'fill' }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 764 - ART_TOP,
            bottom: 0,
            background: `linear-gradient(to bottom, ${skin.tableFadeTop}, ${skin.tableFadeBottom})`,
          }}
        />
        <Board
          engine={engine}
          snapshot={snapshot}
          beamPhase={beamPhase}
          drag={drag}
          boardRef={boardRef}
          boardLeft={BOARD_LEFT}
          boardTop={BOARD_TOP - ART_TOP}
        />
        <Tray
          engine={engine}
          snapshot={snapshot}
          drag={drag}
          trayRef={trayRef}
          left={62}
          right={62}
          bottom={16}
          height={100}
          panelExtent={DESIGN_WIDTH - 124}
        />
      </div>
    </div>
  );
}
