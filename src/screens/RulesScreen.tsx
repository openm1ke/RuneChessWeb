import { useCallback, useState, type ReactNode } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useL10n } from '../l10n/l10nContext';
import type { Strings } from '../l10n/ru';
import { RoundControl } from '../components/shared/RoundControl';
import { LessonBoard } from '../components/board/LessonBoard';
import { howToPlayLessons } from '../data/howToPlayLessons';
import { useViewportSize } from '../components/game/useViewportSize';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';

/**
 * How to play, inside the game — three lessons on the real board.
 *
 * The menu's book icon opens this screen in every build. `how-to-play.html`
 * stays on runechess.ru as the page for search engines (linked from the
 * about page and the sitemap) — but a player who is already in the game
 * learns faster on the board than from a page of text.
 *
 * The screen used to be a page of text: four steps, six figures, three
 * ratings. It described a beam without ever showing one. Each lesson is now
 * a real position on the real board and tray (see `LessonBoard`), with a
 * title and one sentence — everything else the player needs is in front of
 * them. Mirrors the app's rules screen.
 */
export function RulesScreen({ onBack, onLevels }: { onBack: () => void; onLevels?: () => void }) {
  const viewport = useViewportSize();
  const skin = useCosmeticSkin();
  const lessons = <Lessons onBack={onBack} onLevels={onLevels ?? onBack} />;
  if (viewport.width > viewport.height) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <img
          src={skin.adaptiveMenu.ultrawide}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          draggable={false}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            margin: '0 auto',
            maxWidth: 620,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {lessons}
        </div>
      </div>
    );
  }
  return (
    <DesignCanvas>
      {(canvas) => (
        <div style={{ position: 'relative', width: canvas.width, height: canvas.height, overflow: 'hidden' }}>
          <img
            src={skin.adaptiveMenu.tall}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>{lessons}</div>
        </div>
      )}
    </DesignCanvas>
  );
}

/** Title and one sentence per lesson, in lesson order. */
function copyOf(l10n: Strings, index: number): { title: string; body: string } {
  switch (index) {
    case 0:
      return { title: l10n.infoLessonRayTitle, body: l10n.infoLessonRayBody };
    case 1:
      return { title: l10n.infoLessonCountTitle, body: l10n.infoLessonCountBody };
    default:
      return { title: l10n.infoLessonReachTitle, body: l10n.infoLessonReachBody };
  }
}

function Lessons({ onBack, onLevels }: { onBack: () => void; onLevels: () => void }) {
  const l10n = useL10n();
  const count = howToPlayLessons.length;
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState<boolean[]>(() => howToPlayLessons.map(() => false));
  const [resets, setResets] = useState<number[]>(() => howToPlayLessons.map(() => 0));
  const last = index === count - 1;
  const { title, body } = copyOf(l10n, index);
  const solvedHere = solved[index];

  const onSolvedChange = useCallback(
    (value: boolean) =>
      setSolved((prev) => (prev[index] === value ? prev : prev.map((v, i) => (i === index ? value : v)))),
    [index],
  );

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 6px' }}>
        <RoundControl onClick={onBack} label={l10n.infoBackToMenu} size={54}>
          ‹
        </RoundControl>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold-bright)' }}>
          {l10n.infoHowToPlay}
        </div>
        <div
          style={{
            minWidth: 54,
            padding: '7px 12px',
            borderRadius: 14,
            background: 'rgba(20,33,66,0.6)',
            border: '1px solid rgba(215,164,55,0.44)',
            fontSize: 15,
            fontWeight: 800,
            color: '#e8eeff',
            textAlign: 'center',
          }}
        >
          {index + 1}/{count}
        </div>
      </header>

      <div style={{ textAlign: 'center', padding: '6px 20px 0' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#ffe2a4' }}>{title}</div>
        {/* The win line replaces the instruction rather than adding a second
            paragraph to read. */}
        <div
          role={solvedHere ? 'status' : undefined}
          style={{
            marginTop: 6,
            minHeight: 50,
            fontSize: 17,
            lineHeight: 1.45,
            fontWeight: solvedHere ? 900 : 700,
            color: solvedHere ? 'var(--gold-bright)' : '#d4e0f8',
          }}
        >
          {solvedHere ? l10n.infoLessonSolved : body}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '6px 16px 0' }}>
        <LessonBoard
          key={index}
          lesson={howToPlayLessons[index]}
          resetSignal={resets[index]}
          onSolvedChange={onSolvedChange}
        />
      </div>

      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <button
          type="button"
          onClick={() => setResets((prev) => prev.map((v, i) => (i === index ? v + 1 : v)))}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#bfd0f5',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            letterSpacing: 0.6,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          ↻ {l10n.infoLessonReset.toUpperCase()}
        </button>
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 18px' }}>
        <NavButton disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} quiet>
          ‹ {l10n.back.toUpperCase()}
        </NavButton>
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
          {howToPlayLessons.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 20 : 8,
                height: 8,
                borderRadius: 8,
                background: i === index ? '#ffd779' : 'rgba(215,228,255,0.4)',
                transition: 'width 180ms',
              }}
            />
          ))}
        </div>
        {/* Never disabled, however the lesson is going: a player who cannot
            solve it is exactly the one who must not be held on this screen.
            It glows once the lesson is solved. */}
        <NavButton onClick={last ? onLevels : () => setIndex((i) => i + 1)} lit={solvedHere}>
          {(last ? l10n.infoOpenLevels : l10n.infoNext).toUpperCase()} {last ? '✦' : '›'}
        </NavButton>
      </footer>
    </>
  );
}

function NavButton({
  children,
  onClick,
  disabled = false,
  quiet = false,
  lit = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  quiet?: boolean;
  lit?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 50,
        borderRadius: 14,
        padding: '0 10px',
        fontFamily: 'var(--font-display)',
        fontSize: 12.5,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        border: quiet ? '1px solid rgba(215,164,55,0.5)' : 'none',
        background: quiet ? 'transparent' : lit ? '#ffd779' : 'rgba(255,215,121,0.24)',
        color: quiet ? '#e7eeff' : lit ? '#162350' : '#e7eeff',
        transition: 'background 200ms, color 200ms',
      }}
    >
      {children}
    </button>
  );
}
