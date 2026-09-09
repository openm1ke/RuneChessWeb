import { useState, type ReactNode } from 'react';
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { artForCanvas } from '../game/cosmeticSkins';
import { useViewportSize } from '../components/game/useViewportSize';
import { asset } from '../lib/assetUrl';
import { RulesIcon, SettingsIcon } from '../components/shared/MenuIcons';
import { playNavigationPress, playNavigationRelease } from '../services/musicService';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';
import { StarCounter } from '../components/shared/StarCounter';

export function MenuScreen({
  onPlay,
  onLevels,
  onSettings,
  onAchievements,
  onDailyChallenge,
  dailyChallengeSolvedToday = false,
  currentLevel,
  onRulesOpened,
  onAppearance,
  starsAvailable = 0,
  starsEarned = 0,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onAchievements: () => void;
  onDailyChallenge: () => void;
  /** 1-based number of the level "ИГРАТЬ" opens, shown under it. */
  currentLevel: number;
  /** Reports the rules being opened and then calls back to navigate — the
   * rules are a separate static page, so the reporting click is the one that
   * leaves. See `AnalyticsService.rulesOpened`. */
  onRulesOpened?: (proceed: () => void) => void;
  /** Whether today's daily challenge already has a saved result — shows a
   * small checkmark badge on the button instead of a plain empty ring. */
  dailyChallengeSolvedToday?: boolean;
  /** Opens the appearance picker — where the stars are spent, and where the
   * counter's explainer offers to go. */
  onAppearance: () => void;
  /** Stars earned and not yet spent, and everything ever earned. */
  starsAvailable?: number;
  starsEarned?: number;
}) {
  const skin = useCosmeticSkin();
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
        currentLevel={currentLevel}
        onRulesOpened={onRulesOpened}
        onAppearance={onAppearance}
        starsAvailable={starsAvailable}
        starsEarned={starsEarned}
      />
    );
  }

  return (
    <DesignCanvas>
      {(canvas) => {
        // What keeps the width it was drawn at, centred on the canvas: a
        // button is a button however much room the screen has, and a menu of
        // four bars across a desktop window is not a wider menu.
        const buttonInset = (canvas.width - 274) / 2;
        const wideButtonInset = (canvas.width - 246) / 2;
        return (
      <div
        style={{
          position: 'relative',
          width: canvas.width,
          height: canvas.height,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
        <img
          src={artForCanvas(skin.adaptiveMenu, canvas)}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
        <div
          style={{
            position: 'absolute',
            top: 366,
            left: buttonInset,
            right: buttonInset,
            height: 72,
          }}
        >
          <MenuActionButton
            label="ЗАДАНИЕ ДНЯ"
            onClick={onDailyChallenge}
            backgroundAsset="assets/images/menu-button-daily.webp"
            fontSize={17}
            letterSpacing={1.8}
            badge={<DailyChallengeSolvedBadge solved={dailyChallengeSolvedToday} />}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 450,
            left: buttonInset,
            right: buttonInset,
            height: 104,
          }}
        >
          <MenuActionButton
            label="ИГРАТЬ"
            subtitle={`УРОВЕНЬ ${currentLevel}`}
            onClick={onPlay}
            prominent
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 566,
            left: wideButtonInset,
            right: wideButtonInset,
            height: 72,
          }}
        >
          <MenuActionButton label="УРОВНИ" onClick={onLevels} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 650,
            left: wideButtonInset,
            right: wideButtonInset,
            height: 72,
          }}
        >
          <MenuActionButton label="ДОСТИЖЕНИЯ" onClick={onAchievements} fontSize={17} letterSpacing={1.8} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center' }}>
          <MenuFooterLinks />
        </div>
        {/* Rules are read once, so they sit with settings rather than
            taking a slot equal to the sections a player comes back to. */}
        <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* The purse sits with the two panels a player reaches for rather
              than in the button stack: it is a number to notice, not a
              section. */}
          <StarCounter
            available={starsAvailable}
            earned={starsEarned}
            onAppearance={onAppearance}
          />
          <MenuIconButton
            label="Правила"
            href="how-to-play.html"
            glyph={<RulesIcon />}
            onActivate={onRulesOpened}
          />
          <MenuIconButton label="Настройки" onClick={onSettings} glyph={<SettingsIcon />} />
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
        );
      }}
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
  currentLevel,
  onRulesOpened,
  onAppearance,
  starsAvailable,
  starsEarned,
}: {
  onPlay: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onAchievements: () => void;
  onDailyChallenge: () => void;
  dailyChallengeSolvedToday: boolean;
  currentLevel: number;
  onRulesOpened?: (proceed: () => void) => void;
  onAppearance: () => void;
  starsAvailable: number;
  starsEarned: number;
}) {
  const skin = useCosmeticSkin();
  const { width, height } = useViewportSize();
  // One centred column while the height allows it, two when it does not.
  //
  // The mark above the buttons, both centred, is the composition this menu
  // is drawn for, and a wide window has room for it. A phone held sideways
  // does not: at about 411 logical pixels of height the stack ran off the
  // bottom, and the footer link, pinned to that bottom, was drawn over the
  // play button's own subtitle. So below the height the centred column
  // needs, the layout uses the width it does have instead — mark and footer
  // in one column, buttons in the other. Mirrors `LandscapeMenuScene` in the
  // Flutter app.
  const gap = 14;
  const buttonHeights = [62, 82, 62, 62];
  const naturalHeight =
    buttonHeights.reduce((sum, h) => sum + h, 0) + gap * (buttonHeights.length - 1);
  // The rules and settings icons live in the top-right corner; a column of
  // buttons on that side has to start below them.
  const stackCeiling = 72;
  const footerRoom = 56;

  const centredBrandOrb = Math.min(138, Math.max(96, height * 0.16));
  const centredBrandHeight = centredBrandOrb * 1.48 * (660 / 560);
  const centred = height >= centredBrandHeight + 20 + naturalHeight + footerRoom + 24;

  const buttonWidth = centred
    ? Math.min(290, Math.max(210, width * 0.27))
    : Math.min(320, Math.max(220, width * 0.3));
  const columnRight = Math.min(120, Math.max(28, width * 0.09));
  const columnLeft = centred
    ? (width - buttonWidth) / 2
    : width - columnRight - buttonWidth;

  const room = centred
    ? height - footerRoom - centredBrandHeight - 20 - 24
    : height - 16 - stackCeiling;
  // Shrink the whole stack rather than let any of it leave the screen.
  const scale = Math.min(1, Math.max(0.68, room / naturalHeight));
  const stackTop = centred
    ? 24 + (room - naturalHeight * scale) / 2 + centredBrandHeight + 20
    : stackCeiling + (room - naturalHeight * scale) / 2;
  const topOf = (index: number) =>
    stackTop +
    (buttonHeights.slice(0, index).reduce((sum, h) => sum + h, 0) + gap * index) *
      scale;
  const slot = (index: number, widthFactor: number) => ({
    position: 'absolute' as const,
    top: topOf(index),
    left: columnLeft + (buttonWidth * (1 - widthFactor)) / 2,
    width: buttonWidth * widthFactor,
    height: buttonHeights[index] * scale,
  });
  const brandOrbSize = centred
    ? centredBrandOrb
    : Math.min(150, Math.max(84, Math.min(height * 0.34, (columnLeft - 48) * 0.52)));
  const brandHeight = brandOrbSize * 1.48 * (660 / 560);
  // Centred, the mark sits above the buttons and the footer spans the
  // screen; in two columns both live in the mark's own column.
  const brandColumn = centred
    ? { left: 0, width, textAlign: 'center' as const }
    : { left: 24, width: Math.max(160, columnLeft - 48), textAlign: 'center' as const };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={skin.wideMenuBackground}
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
          top: centred
            ? Math.max(16, stackTop - brandHeight - 20)
            : Math.max(16, (height - brandHeight) / 2 - 18),
          left: 0,
          width: centred ? width : columnLeft,
        }}
      >
        <MenuBrand orbSize={brandOrbSize} />
      </div>
      <div style={slot(0, 0.92)}>
        <MenuActionButton
          label="ЗАДАНИЕ ДНЯ"
          onClick={onDailyChallenge}
          backgroundAsset="assets/images/menu-button-daily.webp"
          fontSize={13}
          letterSpacing={1.4}
          badge={<DailyChallengeSolvedBadge solved={dailyChallengeSolvedToday} small />}
        />
      </div>
      <div style={slot(1, 1)}>
        <MenuActionButton
          label="ИГРАТЬ"
          subtitle={`УРОВЕНЬ ${currentLevel}`}
          onClick={onPlay}
          prominent
        />
      </div>
      <div style={slot(2, 0.84)}>
        <MenuActionButton label="УРОВНИ" onClick={onLevels} />
      </div>
      <div style={slot(3, 0.84)}>
        <MenuActionButton label="ДОСТИЖЕНИЯ" onClick={onAchievements} fontSize={16} letterSpacing={1.4} />
      </div>
      <div style={{ position: 'absolute', top: 18, right: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <StarCounter
          available={starsAvailable}
          earned={starsEarned}
          onAppearance={onAppearance}
        />
        <MenuIconButton
          label="Правила"
          href="how-to-play.html"
          glyph={<RulesIcon />}
          onActivate={onRulesOpened}
        />
        <MenuIconButton label="Настройки" onClick={onSettings} glyph={<SettingsIcon />} />
      </div>
      {/* Under the mark, in its own column: the button stack owns the other
          one all the way down. */}
      <div style={{ position: 'absolute', ...brandColumn, bottom: 28 }}>
        <MenuFooterLinks />
      </div>
      <div
        style={{
          position: 'absolute',
          ...brandColumn,
          bottom: 8,
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
  subtitle,
  onClick,
  prominent = false,
  fontSize,
  letterSpacing,
  backgroundAsset: backgroundAssetOverride,
  badge,
}: {
  label: string;
  /** A quiet second line under the label. "ИГРАТЬ" alone never said what it
   * would open — the one button the whole screen is built around was the
   * only one that did not answer "what happens next". */
  subtitle?: string;
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
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
        {subtitle && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'rgba(255,226,164,0.78)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              textShadow: '0 2px 3px rgba(0,0,0,0.66)',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </span>
        )}
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

/** Shown on "ЗАДАНИЕ ДНЯ" only once today is solved. It used to be one
 * ring-and-checkmark in two opacities, and the dim one read as a disabled
 * control rather than "today is still open" — nothing at all says that
 * better, and a gold tick then reads as an answer rather than a state. */
function DailyChallengeSolvedBadge({ solved, small = false }: { solved: boolean; small?: boolean }) {
  if (!solved) return null;
  const size = small ? 16 : 20;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1.6px solid #ffd77a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,16,34,0.55)',
        color: '#ffd77a',
        fontSize: size * 0.62,
        lineHeight: 1,
      }}
    >
      ✓
    </div>
  );
}

function MenuIconButton({
  label,
  glyph,
  onClick,
  href,
  onActivate,
}: {
  label: string;
  glyph: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Given the navigation as a callback, so a goal reported on this click
   * is not cut off by the page unloading. */
  onActivate?: (proceed: () => void) => void;
}) {
  const style = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(18,32,68,0.85)',
    border: '1.7px solid rgba(216,165,55,0.85)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.53)',
    color: 'var(--gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
  } as const;

  if (href) {
    return (
      <a
        href={asset(href)}
        aria-label={label}
        onPointerDown={playNavigationPress}
        onClick={(event) => {
          playNavigationRelease();
          if (!onActivate) return;
          event.preventDefault();
          onActivate(() => {
            window.location.href = asset(href);
          });
        }}
        style={style}
      >
        {glyph}
      </a>
    );
  }
  return (
    <button
      type="button"
      onPointerDown={playNavigationPress}
      onClick={() => {
        playNavigationRelease();
        onClick?.();
      }}
      aria-label={label}
      style={style}
    >
      {glyph}
    </button>
  );
}

