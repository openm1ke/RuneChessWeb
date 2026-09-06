import { formatHintWait } from '../../game/hintWallet';

/**
 * Out of free hints: the ad as the fast path, waiting as the slow one.
 *
 * Both are always offered honestly — when no ad can be shown the dialog says
 * so instead of pretending, because a dead "watch a video" button is exactly
 * what made the old hint gate feel broken.
 */
export function HintOfferDialog({
  waitMs,
  adReady,
  onWatch,
  onClose,
}: {
  waitMs: number | null;
  adReady: boolean;
  onWatch: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Подсказки закончились"
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
        <div style={{ fontSize: 30, lineHeight: 1 }}>💡</div>
        <div style={{ height: 8 }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: '#ffe2a4' }}>Подсказки закончились</div>
        <div style={{ height: 6 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(206,225,255,0.78)' }}>
          {waitMs == null
            ? 'Подсказка скоро восстановится.'
            : `Следующая через ${formatHintWait(waitMs)}.`}
        </div>
        <div style={{ height: 14 }} />
        {adReady ? (
          <button
            type="button"
            onClick={onWatch}
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
            Посмотреть ролик
          </button>
        ) : (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(206,225,255,0.55)' }}>
            Ролик сейчас недоступен — попробуйте позже.
          </div>
        )}
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
          {adReady ? 'Обойдусь' : 'Понятно'}
        </button>
      </div>
    </div>
  );
}
