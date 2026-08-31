import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { MenuActionButton } from './MenuScreen';
import { asset } from '../lib/assetUrl';

export function TutorialCompleteScreen({ onContinue, onLevels }: { onContinue: () => void; onLevels: () => void }) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return <LandscapeTutorialCompleteScene onContinue={onContinue} onLevels={onLevels} />;
  }

  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <img
          src={asset("assets/images/menu-castle-bg-clean.webp")}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
        <div style={{ position: 'absolute', left: 36, right: 36, top: 270, textAlign: 'center' }}>
          <div style={{ fontSize: 54, color: '#ffd56a' }}>✦</div>
          <div style={{ height: 16 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 27, lineHeight: 1.25, letterSpacing: 1.7, color: 'var(--gold-bright)' }}>
            ВЫ ПРОШЛИ
            <br />
            ОБУЧЕНИЕ
          </div>
          <div style={{ height: 14 }} />
          <div style={{ fontSize: 15, lineHeight: 1.35, fontWeight: 700, color: 'var(--text-soft)' }}>
            Основная кампания открыта.
            <br />
            Впереди более сложные задачи.
          </div>
        </div>
        <div style={{ position: 'absolute', left: 76, right: 76, top: 560, height: 68 }}>
          <MenuActionButton label="ПРОДОЛЖИТЬ" onClick={onContinue} prominent />
        </div>
        <div style={{ position: 'absolute', left: 88, right: 88, top: 642, height: 60 }}>
          <MenuActionButton label="К УРОВНЯМ" onClick={onLevels} />
        </div>
      </div>
    </DesignCanvas>
  );
}

/**
 * The tutorial finale uses the wide castle art and keeps the next choices
 * side-by-side, avoiding a shrunken portrait page after rotation.
 */
function LandscapeTutorialCompleteScene({ onContinue, onLevels }: { onContinue: () => void; onLevels: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset("assets/images/menu-castle-bg-web-wide.webp")}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.475)' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 680, padding: '0 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, color: '#ffd56a' }}>✦</div>
          <div style={{ height: 14 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 31, letterSpacing: 1.7, color: 'var(--gold-bright)' }}>
            ВЫ ПРОШЛИ ОБУЧЕНИЕ
          </div>
          <div style={{ height: 14 }} />
          <div style={{ fontSize: 17, lineHeight: 1.35, fontWeight: 700, color: 'var(--text-soft)' }}>
            Основная кампания открыта.
            <br />
            Впереди более сложные задачи.
          </div>
          <div style={{ height: 34 }} />
          <div style={{ height: 68, display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <MenuActionButton label="ПРОДОЛЖИТЬ" onClick={onContinue} prominent fontSize={20} letterSpacing={1.6} />
            </div>
            <div style={{ flex: 1 }}>
              <MenuActionButton label="К УРОВНЯМ" onClick={onLevels} fontSize={17} letterSpacing={1.6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
