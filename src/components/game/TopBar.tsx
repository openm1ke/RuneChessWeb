import { RoundControl } from '../shared/RoundControl';

export function TopControls({
  onBack,
  onHint,
  hintEnabled = true,
}: {
  onBack: () => void;
  onHint: () => void;
  hintEnabled?: boolean;
}) {
  return (
    <div style={{ position: 'absolute', top: 22, left: 20, right: 20, display: 'flex', justifyContent: 'space-between' }}>
      <RoundControl onClick={onBack} label="Назад">
        ‹
      </RoundControl>
      <RoundControl onClick={onHint} disabled={!hintEnabled} label="Подсказка">
        💡
      </RoundControl>
    </div>
  );
}

export function TopStatus({ done, total, level }: { done: number; total: number; level: number }) {
  return (
    <div style={{ position: 'absolute', top: 25, left: 76, right: 76, height: 40, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(9,16,38,0.5)',
          border: '1px solid rgba(224,168,63,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.1, color: 'rgba(206,225,255,0.84)' }}>
          УРОВЕНЬ {level}
        </span>
        <span style={{ width: 1, height: 14, background: 'rgba(224,168,63,0.4)' }} />
        <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>
          {done} / {total}
        </span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: 'rgba(206,225,255,0.78)' }}>
          МОНЕТЫ
        </span>
      </div>
    </div>
  );
}

export function BottomUtilityControls({
  onReset,
  onSkip,
  onResetOnboarding,
  showSkip,
}: {
  onReset: () => void;
  onSkip?: () => void;
  onResetOnboarding?: () => void;
  showSkip: boolean;
}) {
  return (
    <div style={{ position: 'absolute', left: 28, bottom: 122, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {showSkip && onSkip && (
        <RoundControl onClick={onSkip} onLongPress={onResetOnboarding} size={34} label="Пропустить уровень (разработка)">
          ⏭
        </RoundControl>
      )}
      <RoundControl onClick={onReset} size={38} label="Начать уровень заново">
        ↻
      </RoundControl>
    </div>
  );
}
