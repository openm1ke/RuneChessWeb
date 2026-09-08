/**
 * What the player's stars are worth, on the screen they start from.
 *
 * Stars were earned everywhere and explained nowhere: three per level, one
 * to three a day, a rank somewhere in the achievements — and, since the
 * cosmetic sets went in, a price. A player who never opened Settings →
 * Внешний вид had no way to learn that the number meant anything at all. So
 * the menu carries it, and clicking it says what it is for and offers to go
 * and spend it. Mirrors the mobile app's `StarCounter`.
 */
import { useState } from 'react';
import { playNavigationPress, playNavigationRelease } from '../../services/musicService';

export function StarCounter({
  available,
  earned,
  onAppearance,
}: {
  /** Stars earned and not yet spent — the number a price is measured
   * against, and the same one the appearance picker shows. */
  available: number;
  /** Everything ever earned; a purchase never touches it. */
  earned: number;
  onAppearance: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Звёзд свободно: ${available}. Узнать, зачем они`}
        onPointerDown={() => playNavigationPress()}
        onPointerUp={() => playNavigationRelease()}
        onClick={() => setOpen(true)}
        style={{
          height: 44,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          borderRadius: 22,
          background: 'rgba(4,13,39,0.58)',
          border: '1.4px solid rgba(203,155,52,0.62)',
          color: 'var(--gold-bright)',
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          letterSpacing: 0.5,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 17, lineHeight: 1 }} aria-hidden="true">★</span>
        {available}
      </button>
      {open && (
        <StarsExplainer
          available={available}
          earned={earned}
          onClose={() => setOpen(false)}
          onAppearance={() => {
            setOpen(false);
            onAppearance();
          }}
        />
      )}
    </>
  );
}

/** Says what the stars are for, and offers the one thing they buy —
 * deliberately ending in the action rather than in "ПОНЯТНО": the answer to
 * "why am I collecting these" is a screen, not a sentence. */
function StarsExplainer({
  available,
  earned,
  onClose,
  onAppearance,
}: {
  available: number;
  earned: number;
  onClose: () => void;
  onAppearance: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Звёзды"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(330px, 100%)',
          padding: '22px 22px 14px',
          borderRadius: 18,
          background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
          border: '2px solid #cf9c3c',
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{ fontSize: 30, color: 'var(--gold-bright)' }} aria-hidden="true">★</div>
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            letterSpacing: 1.2,
            color: 'var(--gold-bright)',
          }}
        >
          Звёзды
        </div>
        <ExplainerLine glyph="🏆">
          Уровень даёт до трёх звёзд, задание дня — одну-три. Чем их больше, тем выше
          звание в достижениях.
        </ExplainerLine>
        <ExplainerLine glyph="🎨">
          На них открываются оформления: доска, фигуры и монеты. Покупка не отнимает
          звание и не меняет сложность.
        </ExplainerLine>
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(16,32,67,0.4)',
            border: '1px solid rgba(207,162,68,0.4)',
            fontSize: 12.5,
            fontWeight: 800,
            color: '#c6d3ed',
          }}
        >
          Свободно {available}★ · всего заработано {earned}★
        </div>
        <button
          type="button"
          onClick={onAppearance}
          style={{
            marginTop: 14,
            width: '100%',
            height: 46,
            borderRadius: 12,
            border: 'none',
            background: 'var(--gold-bright)',
            color: '#06122e',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            letterSpacing: 0.8,
            cursor: 'pointer',
          }}
        >
          ПОСМОТРЕТЬ ОФОРМЛЕНИЯ
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 6,
            width: '100%',
            padding: '10px 0',
            background: 'none',
            border: 'none',
            color: 'rgba(255,231,178,0.62)',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ПОНЯТНО
        </button>
      </div>
    </div>
  );
}

function ExplainerLine({ glyph, children }: { glyph: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        gap: 10,
        textAlign: 'left',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.35,
        color: 'rgba(206,225,255,0.78)',
      }}
    >
      <span aria-hidden="true" style={{ flex: '0 0 auto' }}>{glyph}</span>
      <span>{children}</span>
    </div>
  );
}
