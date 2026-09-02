import type { ReactNode } from 'react';
import { playNavigationPress, playNavigationRelease } from '../../services/musicService';

export function RoundControl({
  onClick,
  onLongPress,
  size = 44,
  label,
  disabled = false,
  children,
}: {
  onClick: () => void;
  onLongPress?: () => void;
  size?: number;
  label?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  let pressTimer: number | undefined;
  const handlePointerDown = () => {
    playNavigationPress();
    if (!onLongPress) return;
    pressTimer = window.setTimeout(onLongPress, 550);
  };
  const clearTimer = () => {
    if (pressTimer != null) window.clearTimeout(pressTimer);
  };
  const handleClick = () => {
    playNavigationRelease();
    onClick();
  };
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
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
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}
