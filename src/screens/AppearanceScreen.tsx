/**
 * Where the player changes how the game looks. Port of the Flutter app's
 * `AppearanceScreen`.
 *
 * Its own screen rather than a card in settings: a set is a picture, and a
 * picture needs room. Each one is shown as the board it actually produces —
 * same table art, same squares, same sprites, laid out by the same
 * projection the game plays on — so what is on the card is what the player
 * gets, and a set added later cannot quietly disagree with its own preview.
 */
import { DesignCanvas } from '../components/shared/DesignCanvas';
import { useViewportSize } from '../components/game/useViewportSize';
import { RoundControl } from '../components/shared/RoundControl';
import { BoardPerspective, BOARD_LEFT, BOARD_TOP } from '../components/board/boardPerspective';
import { CosmeticSkinContext } from '../game/cosmeticSkinContext';
import { coinAsset, cosmeticSkins, uprightRotationOf, type CosmeticSkin } from '../game/cosmeticSkins';
import { pieceSkins, type PieceType } from '../game/pieceTypes';
import {
  FOOT_DROP_IN_CELLS,
  pieceDrawBox,
  pieceFigureWidth,
} from '../game/pieceMetrics';
import { BOARD_N } from '../game/attackRules';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';

export function AppearanceScreen({
  selectedSkinId,
  unlockedSkinIds,
  starsAvailable,
  onSkinChosen,
  onSkinUnlocked,
  onBack,
}: {
  selectedSkinId: string;
  /** The sets the player owns. Everything else shows its price instead of
   * a "выбрать" button. */
  unlockedSkinIds: ReadonlySet<string>;
  /** Stars earned and not yet spent — the number the header shows and the
   * one every price is measured against. */
  starsAvailable: number;
  onSkinChosen: (skin: CosmeticSkin) => void;
  onSkinUnlocked: (skin: CosmeticSkin) => void;
  onBack: () => void;
}) {
  const skin = useCosmeticSkin();
  const viewport = useViewportSize();

  // Buying is a one-way spend of something slow to earn, so it asks first —
  // and says what will be left afterwards, which is the number the player is
  // really deciding on.
  const confirmUnlock = (entry: CosmeticSkin) => {
    if (starsAvailable < entry.price) return;
    const left = starsAvailable - entry.price;
    if (
      window.confirm(
        `Открыть «${entry.name}» за ${entry.price}★?\nОстанется ${left}★.`,
      )
    ) {
      onSkinUnlocked(entry);
    }
  };

  /** One card, wired to this screen's purse. */
  const cardProps = (entry: CosmeticSkin) => ({
    skin: entry,
    selected: entry.id === selectedSkinId,
    unlocked: unlockedSkinIds.has(entry.id),
    starsAvailable,
    onChosen: () => onSkinChosen(entry),
    onUnlock: () => confirmUnlock(entry),
  });

  const isLandscape = viewport.width > viewport.height;
  // A desktop window or a tablet gets a grid: every set fully visible,
  // nothing clipped, nothing to scroll sideways for. Almost any window
  // qualifies — a browser window even half the height of a screen has room
  // to stack two rows of cards — while a phone held sideways, some 400
  // pixels tall, does not and keeps the single row below. A very wide but
  // short window is a desktop too, and earns the grid on width alone.
  const roomForGrid =
    isLandscape && (viewport.height >= 480 || viewport.width >= 1200);

  if (roomForGrid) {
    const gap = 22;
    const padding = { x: 40, top: 16, bottom: 24 };
    const usable = viewport.width - padding.x * 2;
    // Smaller cards, more of them across: the page fills up instead of
    // showing three big blocks and a lot of floor.
    const columns = Math.max(2, Math.min(5, Math.floor((usable + gap) / (280 + gap))));
    const cardWidth = Math.min(
      340,
      Math.max(240, (usable - gap * (columns - 1)) / columns),
    );
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#05091a' }}>
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
            background: 'linear-gradient(rgba(3,7,20,0.55), rgba(3,7,20,0.78))',
          }}
        />
        <div
          className="dozor-scroll-panel"
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            padding: `${padding.top}px ${padding.x}px ${padding.bottom}px`,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              letterSpacing: 2.4,
              color: 'var(--gold-bright)',
            }}
          >
            ВНЕШНИЙ ВИД
          </div>
          <p
            style={{
              margin: '10px 0 24px',
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#b9c6e6',
            }}
          >
            Оформление доски, фигур и монет. На сложность и прогресс не влияет.
          </p>
          <StarBalance stars={starsAvailable} />
          <div
            style={{
              display: 'grid',
              marginTop: 22,
              gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
              gridAutoRows: '1fr',
              justifyContent: 'center',
              gap,
            }}
          >
            {cosmeticSkins.map((entry) => (
              <SkinCard key={entry.id} {...cardProps(entry)} width={cardWidth} />
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 24, top: 20 }}>
          <RoundControl onClick={onBack} label="Назад">
            ‹
          </RoundControl>
        </div>
      </div>
    );
  }

  // A phone held sideways: the width is there, the height is not, so the
  // sets go in one row with the board beside the name rather than above it.
  if (isLandscape) {
    const gap = 20;
    const padding = { left: 76, right: 28, top: 14, bottom: 16 };
    const available =
      viewport.width - padding.left - padding.right - gap * (cosmeticSkins.length - 1);
    const cardWidth = Math.min(
      460,
      Math.max(300, available / cosmeticSkins.length),
    );
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#05091a' }}>
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
            padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                letterSpacing: 2,
                color: 'var(--gold-bright)',
              }}
            >
              ВНЕШНИЙ ВИД
            </div>
            <StarBalance stars={starsAvailable} inline />
          </div>
          <div
            className="dozor-scroll-panel"
            style={{ display: 'flex', gap, overflowX: 'auto', alignItems: 'flex-start' }}
          >
            {cosmeticSkins.map((entry) => (
              <SkinCard key={entry.id} {...cardProps(entry)} width={cardWidth} compact />
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 20, top: 14 }}>
          <RoundControl onClick={onBack} label="Назад">
            ‹
          </RoundControl>
        </div>
      </div>
    );
  }

  return (
    <DesignCanvas background="#05091a">
      <div style={{ position: 'relative', width: 430, height: 932, overflow: 'hidden' }}>
        <img
          src={skin.menuBackground}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          draggable={false}
        />
        <div
          className="dozor-scroll-panel"
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '78px 28px 32px' }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 23,
              letterSpacing: 2.1,
              color: 'var(--gold-bright)',
            }}
          >
            ВНЕШНИЙ ВИД
          </div>
          <p
            style={{
              margin: '8px 0 22px',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.4,
              color: '#b9c6e6',
            }}
          >
            Оформление доски, фигур и монет. На сложность и прогресс не влияет.
          </p>
          <StarBalance stars={starsAvailable} />
          {cosmeticSkins.map((entry) => (
            <div key={entry.id} style={{ marginTop: 18 }}>
              <SkinCard {...cardProps(entry)} />
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 20, top: 22 }}>
          <RoundControl onClick={onBack} label="Назад">
            ‹
          </RoundControl>
        </div>
      </div>
    </DesignCanvas>
  );
}

/** One set: what it looks like, what it is called, and whether it is on. */
function SkinCard({
  skin,
  selected,
  onChosen,
  unlocked = true,
  starsAvailable = 0,
  onUnlock,
  width = PREVIEW_CARD_WIDTH,
  compact = false,
}: {
  skin: CosmeticSkin;
  selected: boolean;
  onChosen: () => void;
  /** Whether the player owns this set. A locked card still shows its board
   * in full — the point of a price is that you can see what it buys. */
  unlocked?: boolean;
  starsAvailable?: number;
  onUnlock?: () => void;
  /** Outer width of the card; the preview scales itself to fit inside it. */
  width?: number;
  /** Landscape has width to spare and no height: the board goes beside the
   * name rather than above it. */
  compact?: boolean;
}) {
  const previewWidth = compact ? Math.round((width - 32) * 0.5) : width - 32;
  // Every block is the same size, whatever its name and description happen
  // to be: a row of cards each a different height reads as a mistake, and
  // the eye has nothing to compare the boards against.
  const previewHeight = (PREVIEW_HEIGHT * previewWidth) / PREVIEW_WIDTH;
  const affordable = starsAvailable >= skin.price;
  const preview = (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        flex: 'none',
        width: previewWidth,
        height: previewHeight,
      }}
    >
      {/* A locked set is dimmed, not hidden: the player is being sold this
          picture, and a padlock over a grey box sells nothing. But it has to
          read as locked at a glance in a grid of eight — the veil was so
          thin that the lock, gold on gold, was the only clue and it was easy
          to miss. */}
      <div style={unlocked ? undefined : { filter: 'saturate(0.45) brightness(0.5)' }}>
        <SkinPreview skin={skin} width={previewWidth} />
      </div>
      {unlocked ? null : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              background: 'rgba(4,13,39,0.82)',
              border: '1.6px solid rgba(255,215,122,0.8)',
              boxShadow: '0 0 12px rgba(0,0,0,0.55)',
            }}
          >
            🔒
          </span>
        </div>
      )}
    </div>
  );
  const details = (
    <>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          // A narrow card has room for "ОБСИДИАНОВЫЙ" on one line at this
          // size and not at the full one, and a name split mid-word looks
          // like a mistake.
          fontSize: compact ? 12.5 : 15,
          letterSpacing: compact ? 0.2 : 0.8,
          color: '#f4d8a1',
        }}
      >
        {skin.name.toUpperCase()}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: compact ? 11.5 : 12.5,
          fontWeight: 700,
          lineHeight: 1.25,
          color: '#c6d3ed',
          // Three lines for every set, however long its own description is.
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
        }}
      >
        {skin.tagline}
      </div>
    </>
  );
  return (
    <div
      role="button"
      aria-pressed={selected}
      aria-label={
        unlocked
          ? `${skin.name}${selected ? ', выбрано' : ''}`
          : `${skin.name}, закрыто, ${skin.price} звёзд`
      }
      onClick={unlocked ? (selected ? undefined : onChosen) : affordable ? onUnlock : undefined}
      style={{
        padding: '16px 16px 18px',
        width,
        // The grid gives every row the same height and every card fills it,
        // so the blocks are identical whatever their names and descriptions
        // happen to be — and no taller than the wordiest of them needs.
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 'none',
        boxSizing: 'border-box',
        borderRadius: 22,
        background: 'linear-gradient(to bottom, rgba(29,49,103,0.96), rgba(12,23,52,0.96))',
        border: selected ? '2.5px solid #ffd77a' : '1.5px solid rgba(207,162,68,0.4)',
        boxShadow: selected ? '0 12px 22px rgba(255,215,122,0.35)' : '0 12px 26px rgba(0,0,0,0.57)',
        cursor: unlocked ? (selected ? 'default' : 'pointer') : affordable ? 'pointer' : 'default',
        transition: 'border-color 180ms, box-shadow 180ms',
      }}
    >
      {compact ? null : preview}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: compact ? 'center' : 'stretch',
          flexDirection: compact ? 'row' : 'column',
          gap: 14,
          marginTop: compact ? 0 : 14,
        }}
      >
        {compact ? preview : null}
        <div
          style={{
            flex: 1,
            // Without this a long set name ("Обсидиановый астрал") refuses
            // to wrap and pushes itself out through the card's edge.
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              // Break a word only when it genuinely cannot fit; a name that
              // fits on two lines should read as two words, not as
              // "ОБСИДИА / НОВЫЙ".
              overflowWrap: 'break-word',
            }}
          >
            {details}
          </div>
          {unlocked ? (
            <ChooseButton selected={selected} onChosen={onChosen} fill />
          ) : (
            <PriceButton price={skin.price} starsAvailable={starsAvailable} onUnlock={onUnlock} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChooseButton({
  selected,
  onChosen,
  fill = false,
}: {
  selected: boolean;
  onChosen: () => void;
  /** In a narrow column the label needs the whole width rather than its own
   * natural one, which used to push it out through the card's edge. */
  fill?: boolean;
}) {
  if (selected) {
    return (
      <div
        style={{
          padding: '10px 14px',
          width: fill ? '100%' : undefined,
          boxSizing: 'border-box',
          textAlign: 'center',
          borderRadius: 12,
          background: 'rgba(255,215,122,0.2)',
          border: '1.5px solid #ffd77a',
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          letterSpacing: 0.8,
          color: '#ffe2a4',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ ВЫБРАНО
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onChosen}
      style={{
        minHeight: 40,
        padding: fill ? '0 10px' : '0 16px',
        width: fill ? '100%' : undefined,
        boxSizing: 'border-box',
        borderRadius: 12,
        border: '1.5px solid rgba(207,162,68,0.86)',
        background: 'rgba(27,46,99,0.67)',
        color: '#ffe9c4',
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        letterSpacing: 0.8,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      ВЫБРАТЬ
    </button>
  );
}

/**
 * What a locked set costs, or how far off it still is.
 *
 * The two states are one control on purpose: the player who cannot afford a
 * set yet should be looking at the same button they will eventually press,
 * with the gap written on it, rather than at a different widget saying "нет".
 */
function PriceButton({
  price,
  starsAvailable,
  onUnlock,
}: {
  price: number;
  starsAvailable: number;
  onUnlock?: () => void;
}) {
  const affordable = starsAvailable >= price;
  return (
    <button
      type="button"
      disabled={!affordable}
      onClick={onUnlock}
      style={{
        minHeight: 40,
        padding: '0 10px',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 12,
        border: affordable ? '1.5px solid #ffd77a' : '1.5px solid rgba(207,162,68,0.33)',
        background: affordable ? '#ffd77a' : 'rgba(27,46,99,0.33)',
        color: affordable ? '#06122e' : '#9fb0d8',
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        letterSpacing: 0.8,
        cursor: affordable ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {affordable ? `ОТКРЫТЬ ЗА ${price}★` : `${starsAvailable} / ${price}★`}
    </button>
  );
}

/** The purse, at the top of the picker. Without it a price is a number the
 * player has no way to measure themselves against. */
function StarBalance({ stars, inline = false }: { stars: number; inline?: boolean }) {
  return (
    <div
      aria-label={`Доступно ${stars} звёзд`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: inline ? 0 : '0 auto',
        width: 'fit-content',
        padding: '8px 16px',
        borderRadius: 999,
        background: 'rgba(16,32,67,0.4)',
        border: '1.2px solid rgba(207,162,68,0.4)',
      }}
    >
      <span style={{ fontSize: 15, color: '#ffd77a' }}>★</span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          letterSpacing: 0.6,
          color: '#ffe2a4',
        }}
      >
        {stars}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#b9c6e6' }}>звёзд свободно</span>
    </div>
  );
}

/** How much table to keep around the playable field, so the card shows a
 * framed board rather than a crop of squares. */
const PREVIEW_MARGIN = { left: 30, top: 26, right: 30, bottom: 30 };
const PREVIEW_WIDTH = BoardPerspective.width + PREVIEW_MARGIN.left + PREVIEW_MARGIN.right;
const PREVIEW_HEIGHT = BoardPerspective.height + PREVIEW_MARGIN.top + PREVIEW_MARGIN.bottom;
/** 430 design px, less the screen's 28px padding and the card's 16px, both
 * sides — see `AppearanceScreen` and `SkinCard`. */
const PREVIEW_CARD_WIDTH = 430 - 28 * 2 - 16 * 2;


/** Enough of a position to read as a game: three figures, three coins, and
 * the squares between them. */
const PREVIEW_PIECES: [PieceType, number, number][] = [
  ['rook', 0, 1],
  ['knight', 3, 3],
  ['queen', 4, 5],
];
const PREVIEW_COINS: [number, number, number][] = [
  [1, 1, 0],
  [3, 4, 2],
  [5, 2, 4],
];

/**
 * The board a set produces, drawn small — the set's own table art, squares
 * in the set's own colours, and figures and coins placed by the same
 * geometry the board uses. A preview that shared none of that machinery
 * would be a promise the game has no obligation to keep.
 */
export function SkinPreview({
  skin,
  width = PREVIEW_CARD_WIDTH,
}: {
  skin: CosmeticSkin;
  /** What the preview has to fit into; it is laid out at design size and
   * scaled down to that. */
  width?: number;
}) {
  const scale = width / PREVIEW_WIDTH;
  const cells = [];
  for (let r = 0; r < BOARD_N; r++) {
    for (let c = 0; c < BOARD_N; c++) {
      cells.push(
        <polygon
          key={`${c}-${r}`}
          points={BoardPerspective.cellCorners(c, r)
            .map((p) => `${p.x},${p.y}`)
            .join(' ')}
          fill={(r + c) % 2 === 0 ? skin.lightCell : skin.darkCell}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={1.1}
        />,
      );
    }
  }

  return (
    <CosmeticSkinContext.Provider value={skin}>
      <div
        style={{
          position: 'relative',
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          overflow: 'hidden',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {/* The table art, shifted so the board area it frames lands where
            the cells are drawn — the same relationship as on the game
            screen, where the board sits at (BOARD_LEFT, BOARD_TOP) of the
            430×764 art. */}
        <img
          src={skin.boardAsset}
          alt=""
          style={{
            position: 'absolute',
            left: PREVIEW_MARGIN.left - BOARD_LEFT,
            top: PREVIEW_MARGIN.top - BOARD_TOP,
            width: 430,
            height: 764,
            objectFit: 'fill',
          }}
          draggable={false}
        />
        <div
          style={{
            position: 'absolute',
            left: PREVIEW_MARGIN.left,
            top: PREVIEW_MARGIN.top,
            width: BoardPerspective.width,
            height: BoardPerspective.height,
          }}
        >
          <svg
            width={BoardPerspective.width}
            height={BoardPerspective.height}
            style={{ position: 'absolute', inset: 0 }}
          >
            {cells}
          </svg>
          {/* Same layering as the board itself: whatever of the frame leans
              in over the squares is drawn back on top of them. */}
          {skin.boardFrameAsset && (
            <img
              src={skin.boardFrameAsset}
              alt=""
              style={{
                position: 'absolute',
                left: -BOARD_LEFT,
                top: -BOARD_TOP,
                width: 430,
                height: 764,
                objectFit: 'fill',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          )}
          {PREVIEW_COINS.map(([target, c, r]) => (
            <PreviewCoin key={`coin-${c}-${r}`} skin={skin} target={target} c={c} r={r} />
          ))}
          {PREVIEW_PIECES.map(([type, c, r]) => (
            <PreviewPiece key={`piece-${c}-${r}`} skin={skin} type={type} c={c} r={r} />
          ))}
        </div>
      </div>
    </CosmeticSkinContext.Provider>
  );
}

/** The board's own piece geometry, minus everything that needs a game
 * running behind it (drag, taps, the held glow). */
function PreviewPiece({
  skin,
  type,
  c,
  r,
}: {
  skin: CosmeticSkin;
  type: PieceType;
  c: number;
  r: number;
}) {
  const unit = BoardPerspective.sourceSize / BOARD_N;
  const source = { x: c * unit + unit / 2, y: r * unit + unit / 2 };
  const center = BoardPerspective.project(source);
  const scale = 0.94 + (0.18 * source.y) / BoardPerspective.sourceSize;
  // The same geometry the board itself uses — the preview is a promise the
  // game has to keep, sizes included.
  const cellHeight = BoardPerspective.height / BOARD_N;
  const art = pieceDrawBox(type, cellHeight, scale);
  const feet = FOOT_DROP_IN_CELLS * cellHeight * scale;
  const glow = Math.round(skin.pieceAmbientGlow * 255)
    .toString(16)
    .padStart(2, '0');
  return (
    <div
      style={{
        position: 'absolute',
        left: center.x - art.width / 2,
        top: center.y + feet + art.footInset - art.height,
        width: art.width,
        height: art.height,
      }}
    >
      {skin.pieceAmbientGlow > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: art.footInset - 0.06 * cellHeight * scale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0.78 * cellHeight * scale,
            height: 0.9 * cellHeight * scale,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${pieceSkins[type].color}${glow} 0%, transparent 70%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: art.footInset - pieceFigureWidth(type, cellHeight, scale) * 1.5 * 0.34 * 0.48,
          left: '50%',
          transform: 'translateX(-50%)',
          width: pieceFigureWidth(type, cellHeight, scale) * 1.5,
          height: pieceFigureWidth(type, cellHeight, scale) * 1.5 * 0.34,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,0,0,0.56) 0%, rgba(0,0,0,0.44) 58%, transparent 100%)',
        }}
      />
      <img
        src={skin.pieceAssets[type]}
        alt=""
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: art.width,
          height: art.height,
          objectFit: 'contain',
          transform: `translateX(-50%) rotate(${uprightRotationOf(skin, type)}deg)`,
          transformOrigin: 'bottom center',
        }}
        draggable={false}
      />
    </div>
  );
}

function PreviewCoin({
  skin,
  target,
  c,
  r,
}: {
  skin: CosmeticSkin;
  target: number;
  c: number;
  r: number;
}) {
  const unit = BoardPerspective.sourceSize / BOARD_N;
  const source = { x: c * unit + unit / 2, y: r * unit + unit / 2 };
  const center = BoardPerspective.project(source);
  const scale = 0.88 + (0.16 * source.y) / BoardPerspective.sourceSize;
  const size = 46 * scale;
  return (
    <img
      src={coinAsset(skin, target)}
      alt=""
      style={{
        position: 'absolute',
        left: center.x - size / 2,
        top: center.y - size * 0.56,
        width: size,
        height: size,
        objectFit: 'contain',
      }}
      draggable={false}
    />
  );
}
