import type { ReactNode } from 'react';

export function RoundControl({
  onClick,
  onLongPress,
  size = 44,
  label,
  children,
}: {
  onClick: () => void;
  onLongPress?: () => void;
  size?: number;
  label?: string;
  children: ReactNode;
}) {
  let pressTimer: number | undefined;
  const handlePointerDown = () => {
    if (!onLongPress) return;
    pressTimer = window.setTimeout(onLongPress, 550);
  };
  const clearTimer = () => {
    if (pressTimer != null) window.clearTimeout(pressTimer);
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      style={{
        width: size,
        height: size,
        borderRadius: 15,
        border: '2px solid rgba(224,168,63,0.8)',
        background: 'linear-gradient(to bottom, rgba(58,84,156,0.92), rgba(14,25,60,0.92))',
        boxShadow: '0 5px 16px rgba(0,0,0,0.5)',
        color: 'var(--gold)',
        fontSize: size * 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
