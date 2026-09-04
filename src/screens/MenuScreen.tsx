import { useState, type ReactNode } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';
import { playNavigationPress, playNavigationRelease } from '../services/musicService';

export function MenuScreen({
  onPlay,
  onLevels,
  onSettings,
  onAchievements,
  onDailyChallenge,
  dailyChallengeSolvedToday = false,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onAchievements: () => void;
  onDailyChallenge: () => void;
  /** Whether today's daily challenge already has a saved result — shows a
   * small checkmark badge on the button instead of a plain empty ring. */
  dailyChallengeSolvedToday?: boolean;
}) {
  const viewport = useViewportSize();
  const isLandscape = viewport.width > viewport.height;

  if (isLandscape) {
    return (
      <LandscapeMenuScene
        onPlay={onPlay}
        onLevels={onLevels}
        onSettings={onSettings}
        onAchievements={onAchievements}
        onDailyChallenge={onDailyChallenge}
        dailyChallengeSolvedToday={dailyChallengeSolvedToday}
      />
    );
  }

  return (
    <DesignCanvas>
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
        <img
          src={asset("assets/images/menu-castle-bg-clean.webp")}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 104,
            background: 'linear-gradient(to bottom, #000, transparent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 92,
            background: 'linear-gradient(to bottom, transparent, #000)',
          }}
        />
        <div style={{ position: 'absolute', top: 126, left: 0, right: 0 }}>
          <MenuBrand orbSize={124} />
        </div>
        <div style={{ position: 'absolute', top: 366, left: 78, right: 78, height: 64 }}>
          <MenuActionButton
            label="ЗАДАНИЕ ДНЯ"
            onClick={onDailyChallenge}
            backgroundAsset="assets/images/menu-button-daily.webp"
            fontSize={17}
            letterSpacing={1.8}
            badge={<DailyChallengeSolvedBadge solved={dailyChallengeSolvedToday} />}
          />
        </div>
        <div style={{ position: 'absolute', top: 442, left: 78, right: 78, height: 104 }}>
          <MenuActionButton label="ИГРАТЬ" onClick={onPlay} prominent />
        </div>
        <div style={{ position: 'absolute', top: 558, left: 92, right: 92, height: 72 }}>
          <MenuActionButton label="УРОВНИ" onClick={onLevels} />
        </div>
        <div style={{ position: 'absolute', top: 636, left: 92, right: 92, height: 72 }}>
          <MenuActionButton label="ДОСТИЖЕНИЯ" onClick={onAchievements} fontSize={17} letterSpacing={1.8} />
        </div>
        <div style={{ position: 'absolute', top: 714, left: 92, right: 92, height: 72 }}>
          <MenuInfoButton label="ПРАВИЛА" href="how-to-play.html" />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center' }}>
          <MenuFooterLinks />
        </div>
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <MenuSettingsButton onClick={onSettings} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 12,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: 'rgba(154,163,180,0.55)',
          }}
        >
          версия 1.0.0
        </div>
      </div>
    </DesignCanvas>
  );
}

/**
 * A dedicated wide menu avoids letterboxing the portrait illustration when
 * the browser window is wider than it is tall. The artwork has open, darker
 * space in its middle so the controls stay legible without hiding the
 * candle, window or telescope.
 */
function LandscapeMenuScene({
  onPlay,
  onLevels,
  onSettings,
  onAchievements,
  onDailyChallenge,
  dailyChallengeSolvedToday,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onAchievements: () => void;
  onDailyChallenge: () => void;
  dailyChallengeSolvedToday: boolean;
}) {
  const { width, height } = useViewportSize();
  const panelWidth = Math.min(290, Math.max(210, width * 0.27));
  // Centred on the screen's own edges rather than the artwork's off-centre
  // dark pocket (the Dart source's 0.44 factor reads as visibly off-centre
  // once the window is much wider than the source art's own proportions).
  const panelLeft = (width - panelWidth) / 2;
  const panelTop = height * 0.39;
  const brandOrbSize = Math.min(138, Math.max(96, height * 0.16));
  const brandHeight = brandOrbSize * 1.48 * (660 / 560);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={asset("assets/images/menu-castle-bg-web-wide.webp")}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 45% 45%, rgba(0,0,0,0.07), rgba(0,0,0,0.52))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: Math.max(24, panelTop - brandHeight - 16),
          left: 0,
          right: 0,
        }}
      >
        <MenuBrand orbSize={brandOrbSize} />
      </div>
      <div style={{ position: 'absolute', top: panelTop - 4, left: panelLeft + panelWidth * 0.08, width: panelWidth * 0.84, height: 40 }}>
        <MenuActionButton
          label="ЗАДАНИЕ ДНЯ"
          onClick={onDailyChallenge}
          backgroundAsset="assets/images/menu-button-daily.webp"
          fontSize={13}
          letterSpacing={1.4}
          badge={<DailyChallengeSolvedBadge solved={dailyChallengeSolvedToday} small />}
        />
      </div>
      <div style={{ position: 'absolute', top: panelTop + 42, left: panelLeft, width: panelWidth, height: 82 }}>
        <MenuActionButton label="ИГРАТЬ" onClick={onPlay} prominent />
      </div>
      <div
        style={{
          position: 'absolute',
          top: panelTop + 136,
          left: panelLeft + panelWidth * 0.08,
          width: panelWidth * 0.84,
          height: 62,
        }}
      >
        <MenuActionButton label="УРОВНИ" onClick={onLevels} />
      </div>
      <div style={{ position: 'absolute', top: panelTop + 210, left: panelLeft + panelWidth * 0.08, width: panelWidth * 0.84, height: 62 }}>
        <MenuActionButton label="ДОСТИЖЕНИЯ" onClick={onAchievements} fontSize={16} letterSpacing={1.4} />
      </div>
      <div style={{ position: 'absolute', top: panelTop + 284, left: panelLeft + panelWidth * 0.08, width: panelWidth * 0.84, height: 62 }}>
        <MenuInfoButton label="ПРАВИЛА" href="how-to-play.html" />
      </div>
      <div style={{ position: 'absolute', top: 18, right: 24 }}>
        <MenuSettingsButton onClick={onSettings} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, textAlign: 'center' }}>
        <MenuFooterLinks />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 8,
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: 'rgba(154,163,180,0.55)',
        }}
      >
        версия 1.0.0
      </div>
    </div>
  );
}

function MenuFooterLinks() {
  const links = [
    ['ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ', 'privacy.html'],
  ] as const;

  return (
    <nav
      aria-label="Информация об игре"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: 12,
        rowGap: 3,
        padding: '0 18px',
      }}
    >
      {links.map(([label, path]) => (
        <a
          key={path}
          href={asset(path)}
          onPointerDown={playNavigationPress}
          onClick={playNavigationRelease}
          style={{
            color: 'rgba(221, 229, 247, 0.78)',
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: 0.75,
            lineHeight: 1.2,
            textDecoration: 'none',
            textShadow: '0 2px 4px rgba(0,0,0,0.85)',
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

function MenuInfoButton({ label, href }: { label: string; href: string }) {
  const backgroundAsset = asset('assets/images/menu-button-levels.webp');
  return (
    <a
      href={asset(href)}
      onPointerDown={playNavigationPress}
      onClick={playNavigationRelease}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        border: 'none',
        color: 'var(--gold-bright)',
        background: 'transparent',
        fontFamily: 'var(--font-body)',
        fontSize: 19,
        fontWeight: 900,
        letterSpacing: 2.1,
        textDecoration: 'none',
        textShadow: '0 2px 3px rgba(0,0,0,0.66)',
      }}
    >
      <img src={backgroundAsset} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} draggable={false} />
      <span style={{ position: 'relative' }}>{label}</span>
    </a>
  );
}

/**
 * The mark intentionally reuses the game's existing queen-orb artwork.
 * Its circular crop lets the orb sit directly on the scene rather than
 * carrying the original icon's square background into the menu.
 */
function MenuBrand({ orbSize }: { orbSize: number }) {
  const height = orbSize * 1.48 * (660 / 560);
  const width = height * (1200 / 660);
  return (
    <img
      src={asset('assets/branding/runechess-logo.png')}
      alt="RuneChess"
      style={{
        display: 'block',
        width,
        height,
        margin: '0 auto',
        pointerEvents: 'none',
      }}
      draggable={false}
    />
  );
}

export function MenuActionButton({
  label,
  onClick,
  prominent = false,
  fontSize,
  letterSpacing,
  backgroundAsset: backgroundAssetOverride,
  badge,
}: {
  label: string;
  onClick: () => void;
  prominent?: boolean;
  /** Overrides the default size — used where the button is narrower than
   * the main menu's (e.g. side-by-side in a landscape two-button row), so
   * a longer label like "ПРОДОЛЖИТЬ" doesn't spill past the frame art. */
  fontSize?: number;
  letterSpacing?: number;
  /** Overrides the default play/levels-style artwork — used by "ЗАДАНИЕ
   * ДНЯ", whose distinct purple frame sets it apart from the other menu
   * entries. Given as a `public/`-relative path, resolved via `asset()`. */
  backgroundAsset?: string;
  /** A small status indicator rendered in the button's corner — e.g.
   * "ЗАДАНИЕ ДНЯ"'s solved-today checkmark. */
  badge?: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const backgroundAsset = asset(
    backgroundAssetOverride ?? (prominent ? 'assets/images/menu-button-play.webp' : 'assets/images/menu-button-levels.webp'),
  );
  return (
    <button
      type="button"
      onPointerDown={() => {
        setPressed(true);
        playNavigationPress();
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => {
        playNavigationRelease();
        onClick();
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: 'transparent',
        transform: pressed ? 'scale(0.965)' : 'scale(1)',
        transition: 'transform 110ms cubic-bezier(0.33,1,0.68,1)',
      }}
    >
      <img src={backgroundAsset} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} draggable={false} />
      <span
        style={{
          position: 'relative',
          fontFamily: 'var(--font-body)',
          color: 'var(--gold-bright)',
          fontSize: fontSize ?? (prominent ? 26 : 19),
          fontWeight: 900,
          letterSpacing: letterSpacing ?? (prominent ? 2.7 : 2.1),
          textShadow: '0 2px 3px rgba(0,0,0,0.66)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {badge && (
        // Right inset is a percentage, not px: "ЗАДАНИЕ ДНЯ"'s frame art has
        // a diagonally chamfered top-right corner (measured ~8% of the
        // button's width), so a fixed-pixel offset sits half outside the
        // drawn frame at some box sizes — a plain px inset only worked by
        // coincidence at one particular button width. A percentage tracks
        // the frame's own corner cut correctly at both the portrait and
        // landscape button sizes, since the art is stretched to the box
        // uniformly per axis (independent x/y scaling preserves fractional
        // position). Vertically centered (not just inset from the top) so
        // it lines up with the label text, which is itself vertically
        // centered in the button — measured clear of the corner cut at this
        // horizontal inset regardless of button height.
        <div style={{ position: 'absolute', top: '50%', right: '9%', transform: 'translateY(-50%)' }}>{badge}</div>
      )}
    </button>
  );
}

/** The small ring-and-checkmark status shown on "ЗАДАНИЕ ДНЯ" — always
 * present, so its state (grey ring vs. gold checkmark) is the only signal
 * for whether today's puzzle is already solved. */
function DailyChallengeSolvedBadge({ solved, small = false }: { solved: boolean; small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.6px solid ${solved ? '#ffd77a' : 'rgba(214,224,255,0.4)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,16,34,0.55)',
      }}
    >
      {solved && <span style={{ fontSize: size * 0.62, color: '#ffd77a', lineHeight: 1 }}>✓</span>}
    </div>
  );
}

function MenuSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={playNavigationPress}
      onClick={() => {
        playNavigationRelease();
        onClick();
      }}
      aria-label="Настройки"
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'rgba(18,32,68,0.85)',
        border: '1.7px solid rgba(216,165,55,0.85)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.53)',
        color: 'var(--gold)',
        fontSize: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      ⚙
    </button>
  );
}
