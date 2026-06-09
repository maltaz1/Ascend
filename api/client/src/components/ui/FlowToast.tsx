import { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'xp' | 'achievement' | 'info';
  emoji?: string;
}

let toastListeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: Toast['type'] = 'success', emoji?: string) {
  const toast: Toast = {
    id: Math.random().toString(36).slice(2),
    message,
    type,
    emoji,
  };
  toastListeners.forEach(l => l(toast));
}

export function FlowToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const colors: Record<Toast['type'], string> = {
    success: '#10B981',
    xp: '#F59E0B',
    achievement: '#A855F7',
    info: '#60A5FA',
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map((toast, i) => {
        const isInfo = toast.type === 'info';
        const bg = isInfo
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.94))'
          : 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(24, 24, 38, 0.92))';

        return (
          <div
            key={toast.id}
            className="fz-toast"
            style={{
              borderColor: isInfo ? 'rgba(96, 165, 250, 0.35)' : `${colors[toast.type]}55`,
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 18,
              padding: '12px 14px',
              minWidth: 280,
              maxWidth: 340,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: bg,
              backdropFilter: 'blur(18px)',
              boxShadow: '0 14px 40px rgba(15, 23, 42, 0.35)',
              animationDelay: `${i * 50}ms`,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isInfo
                  ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(59, 130, 246, 0.18))'
                  : 'rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}
            >
              {toast.emoji ? (
                <span style={{ fontSize: 18 }}>{toast.emoji}</span>
              ) : (
                <span style={{ fontSize: 18, color: colors[toast.type] }}>●</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.96)',
                  lineHeight: 1.35,
                }}
              >
                {toast.message}
              </p>
            </div>

            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: colors[toast.type],
                boxShadow: `0 0 14px ${colors[toast.type]}`,
                flexShrink: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
