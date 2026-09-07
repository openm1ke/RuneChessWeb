/**
 * After three resets of the same level: a way out that is not "close the
 * game".
 *
 * The skip control existed but was dev-only, so a player stuck on level 30
 * had exactly two options — reset the same puzzle again, or leave. This is
 * also the moment a rewarded ad is genuinely welcome rather than intrusive:
 * it arrives when the player has already decided they want out.
 */
export function SkipOfferDialog({
  onSkip,
  onClose,
}: {
  onSkip: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Уровень не поддаётся?"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(320px, 100%)',
          padding: '22px 22px 14px',
          borderRadius: 18,
          border: '2px solid #cf9c3c',
          background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: '#ffe2a4' }}>Уровень не поддаётся?</div>
        <div style={{ height: 6 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(206,225,255,0.78)' }}>
          Можно пропустить его за ролик и вернуться позже. Звёзды за пропущенный уровень не
          начисляются.
        </div>
        <div style={{ height: 14 }} />
        <button
          type="button"
          onClick={onSkip}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            border: 'none',
            background: '#2fbe8a',
            color: '#06251a',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 0.4,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Посмотреть рекламу и пропустить
        </button>
        <div style={{ height: 4 }} />
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,231,178,0.62)',
            fontSize: 13,
            fontWeight: 800,
            padding: 10,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Ещё попробую
        </button>
      </div>
    </div>
  );
}
