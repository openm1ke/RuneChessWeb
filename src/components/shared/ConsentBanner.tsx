import { useL10n } from '../../l10n/l10nContext';
/** True in the archive built for games.yandex.ru — see vite.config.ts.
 * §8.4.2 forbids links out of the game, this one included. */
const BUILT_FOR_YANDEX_GAMES = import.meta.env.VITE_YANDEX_GAMES === '1';

export function ConsentBanner({
  onAcceptAnalytics,
  onDeclineAnalytics,
}: {
  onAcceptAnalytics: () => void;
  onDeclineAnalytics: () => void;
}) {
  const l10n = useL10n();
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      style={{
        position: 'fixed',
        zIndex: 1000,
        left: '50%',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        width: 'min(680px, calc(100vw - 28px))',
        boxSizing: 'border-box',
        padding: '18px 20px',
        border: '1px solid rgba(236, 178, 48, 0.82)',
        borderRadius: 18,
        color: '#eef3ff',
        background: 'linear-gradient(135deg, rgba(17, 45, 97, 0.98), rgba(7, 17, 45, 0.98))',
        boxShadow: '0 14px 42px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255,255,255,0.12)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div id="consent-title" style={{ fontFamily: 'var(--font-display)', color: '#ffdc82', fontSize: 16, letterSpacing: 0.8 }}>
        {l10n.consentTitleWeb.toUpperCase()}
      </div>
      <p style={{ margin: '9px 0 14px', fontSize: 14, lineHeight: 1.42 }}>
        {l10n.consentBodyWeb}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={onAcceptAnalytics} style={primaryButtonStyle}>
          {l10n.consentAcceptAnalytics}
        </button>
        <button type="button" onClick={onDeclineAnalytics} style={secondaryButtonStyle}>
          {l10n.consentEssentialOnly}
        </button>
        {!BUILT_FOR_YANDEX_GAMES && (
          <a
            href="./privacy.html"
            style={{ marginLeft: 'auto', color: '#b9ccf5', fontSize: 12 }}
          >
            {l10n.privacyPolicy}
          </a>
        )}
      </div>
    </section>
  );
}

const primaryButtonStyle = {
  border: '1px solid #ffd86e',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#10234c',
  background: 'linear-gradient(#ffe39a, #e9ae35)',
  fontFamily: 'var(--font-display)',
  fontSize: 12,
  cursor: 'pointer',
} as const;

const secondaryButtonStyle = {
  border: '1px solid rgba(216, 230, 255, 0.55)',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#edf3ff',
  background: 'rgba(8, 19, 49, 0.5)',
  fontFamily: 'var(--font-display)',
  fontSize: 12,
  cursor: 'pointer',
} as const;
