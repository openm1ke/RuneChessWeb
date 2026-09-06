import { useEffect } from 'react';

/**
 * A short, self-dismissing message over whatever is on screen — the web's
 * answer to the mobile app's `SnackBar`, used so far only to say that the
 * daily-challenge freeze covered a missed day.
 *
 * It is deliberately not interactive: it reports something that already
 * happened, so there is nothing to confirm or undo, and a control would only
 * invite a tap that does nothing.
 */
export function Toast({
  message,
  onDone,
  durationMs = 5000,
}: {
  message: string;
  onDone: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDone]);

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        zIndex: 40,
        left: '50%',
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        maxWidth: 'min(360px, calc(100vw - 32px))',
        padding: '10px 16px',
        borderRadius: 12,
        border: '1px solid rgba(127,224,255,0.4)',
        background: 'rgba(15,26,60,0.96)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        color: '#dff4ff',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
}
