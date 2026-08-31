export function ResetConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '22px 22px 14px',
          borderRadius: 18,
          background: 'linear-gradient(to bottom, rgba(30,48,104,0.94), rgba(15,26,60,0.94))',
          border: '2px solid var(--gold-border)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold-bright)' }}>Начать уровень заново?</div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'rgba(206,225,255,0.78)' }}>
          Все поставленные фигуры вернутся в панель.
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-evenly' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'rgba(255,231,178,0.62)', fontWeight: 800, cursor: 'pointer', padding: 8 }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 900, cursor: 'pointer', padding: 8 }}
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
