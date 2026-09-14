import { DesignCanvas } from '../components/shared/DesignCanvas';
import { RoundControl } from '../components/shared/RoundControl';
import { PieceArt } from '../components/board/PieceArt';
import { pieceAttackSummary, pieceNames, type PieceType } from '../game/pieceTypes';
import { useViewportSize } from '../components/game/useViewportSize';
import { useCosmeticSkin } from '../game/cosmeticSkinContext';

/**
 * The rules, inside the game.
 *
 * On runechess.ru the menu's book icon opens `how-to-play.html` — a real
 * page, useful to a search engine. Inside the Yandex Games catalogue that
 * link is forbidden (§8.4.2: no links to any resource, the game's own site
 * included), and moderation rejected the first submission over exactly
 * that. Dropping the button was the quick answer; this is the right one —
 * a player on the platform gets the same explanation without leaving the
 * game.
 *
 * Deliberately built from the same data the tray already uses
 * (`pieceNames`, `pieceAttackSummary`): one wording for a figure's reach,
 * so the rules screen cannot drift from what the game says mid-puzzle.
 */
const PIECE_ORDER: readonly PieceType[] = ['rook', 'bishop', 'knight', 'king', 'queen', 'pawn'];

const STEPS: readonly { n: string; title: string; text: string }[] = [
  { n: '1', title: 'Прочтите руну', text: 'Число на монете — сколько атак ей нужно.' },
  { n: '2', title: 'Выберите фигуру', text: 'Берите фигуры из панели под доской.' },
  { n: '3', title: 'Поставьте её', text: 'Смотрите, куда протянутся лучи атак.' },
  { n: '4', title: 'Закройте уровень', text: 'Все руны получили своё число — задача решена.' },
];

const STARS: readonly { mark: string; title: string; text: string }[] = [
  { mark: '★★★', title: 'Точно', text: 'Без лишних ходов и без подсказок.' },
  { mark: '★★☆', title: 'Хорошо', text: 'Решение без подсказок.' },
  { mark: '★☆☆', title: 'Решено', text: 'Подсказка помогла пройти уровень.' },
];

export function RulesScreen({ onBack }: { onBack: () => void }) {
  const viewport = useViewportSize();
  // A wide screen is the catalogue's main surface — and the television's,
  // later. Squeezing the portrait canvas into it leaves the text tiny in a
  // narrow column, so landscape gets the viewport itself and two columns,
  // the same split the achievements screen already makes.
  return viewport.width > viewport.height ? (
    <LandscapeRules onBack={onBack} />
  ) : (
    <PortraitRules onBack={onBack} />
  );
}

function PortraitRules({ onBack }: { onBack: () => void }) {
  return (
    <DesignCanvas>
      {(canvas) => (
        <div
          style={{
            position: 'relative',
            width: canvas.width,
            height: canvas.height,
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 120,
              background: 'linear-gradient(to bottom, #000, transparent)',
            }}
          />
          <div style={{ position: 'absolute', top: 22, left: 20 }}>
            <RoundControl onClick={onBack} label="Назад в меню">
              ‹
            </RoundControl>
          </div>
          <div style={{ ...titleStyle, top: 98 }}>КАК ИГРАТЬ</div>
          <div
            className="dozor-scroll-panel"
            style={{ ...panelStyle, top: 144, left: 32, right: 32, bottom: 24 }}
          >
            <RulesBody columns={1} />
          </div>
        </div>
      )}
    </DesignCanvas>
  );
}

function LandscapeRules({ onBack }: { onBack: () => void }) {
  const skin = useCosmeticSkin();
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <img
        src={skin.adaptiveMenu.ultrawide}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        draggable={false}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.71)' }} />
      <div style={{ position: 'absolute', top: 22, left: 20 }}>
        <RoundControl onClick={onBack} label="Назад в меню">
          ‹
        </RoundControl>
      </div>
      <div style={{ ...titleStyle, top: 22, left: 96, right: 96 }}>КАК ИГРАТЬ</div>
      <div
        className="dozor-scroll-panel"
        style={{ ...panelStyle, top: 82, left: 52, right: 52, bottom: 16, padding: '14px 20px' }}
      >
        <RulesBody columns={2} />
      </div>
    </div>
  );
}

function RulesBody({ columns }: { columns: 1 | 2 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
        columnGap: 22,
      }}
    >
      <div>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
          Это не партия против соперника. На доске лежат руны-монеты, и каждой нужно ровно
          определённое число атак — ни больше, ни меньше.
        </p>

        <SectionTitle>Четыре шага</SectionTitle>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={rowStyle}>
              <div style={badgeStyle}>{step.n}</div>
              <div>
                <div style={rowTitleStyle}>{step.title}</div>
                <div style={rowTextStyle}>{step.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Как бьют фигуры</SectionTitle>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#a9bbdd' }}>
          По обычным шахматным правилам. Луч атаки останавливается на первой фигуре,
          встреченной по пути, — кроме коня, который прыгает через преграды.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {PIECE_ORDER.map((type) => (
            <div key={type} style={rowStyle}>
              <div
                style={{
                  width: 44,
                  minWidth: 44,
                  height: 52,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <PieceArt type={type} width={38} height={50} />
              </div>
              <div>
                <div style={rowTitleStyle}>{pieceNames[type]}</div>
                <div style={rowTextStyle}>{pieceAttackSummary[type]}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Звёзды</SectionTitle>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {STARS.map((star) => (
            <div key={star.mark} style={rowStyle}>
              <div style={{ ...badgeStyle, width: 58, minWidth: 58, letterSpacing: 1 }}>
                {star.mark}
              </div>
              <div>
                <div style={rowTitleStyle}>{star.title}</div>
                <div style={rowTextStyle}>{star.text}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Уровни</SectionTitle>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>
          165 задач: пять обучающих в «Первых рунах», затем «Лунный сад» и «Звёздная
          обсерватория», где поле больше, а решения многоходовые. Звёзды не тратятся впустую —
          они поднимают звание и открывают оформления.
        </p>      </div>
    </div>
  );
}

const titleStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  textAlign: 'center',
  fontFamily: 'var(--font-body)',
  color: 'var(--gold-bright)',
  fontSize: 25,
  fontWeight: 900,
  letterSpacing: 3.5,
  textShadow: '0 3px 5px rgba(0,0,0,0.8)',
} as const;

const panelStyle = {
  position: 'absolute',
  borderRadius: 14,
  background: 'rgba(11,23,51,0.9)',
  border: '1.5px solid rgba(216,165,55,0.85)',
  boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
  padding: 16,
  overflowY: 'auto',
  color: '#dbe5f7',
  fontFamily: 'var(--font-body)',
} as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      style={{
        margin: '0 0 8px',
        color: 'var(--gold-bright)',
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

const rowStyle = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(4,13,39,0.55)',
  border: '1px solid rgba(203,155,52,0.4)',
} as const;

const badgeStyle = {
  width: 26,
  minWidth: 26,
  height: 26,
  borderRadius: 8,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(216,165,55,0.18)',
  border: '1px solid rgba(216,165,55,0.7)',
  color: 'var(--gold-bright)',
  fontSize: 12,
  fontWeight: 900,
} as const;

const rowTitleStyle = {
  color: '#ffe2a4',
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 2,
} as const;

const rowTextStyle = {
  color: '#c5d4f0',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
} as const;
