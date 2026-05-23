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
    info: '#3B82F6',
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          className="fz-toast"
          style={{
            borderColor: `${colors[toast.type]}40`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${colors[toast.type]}15`,
            animationDelay: `${i * 50}ms`,
          }}
        >
          {toast.emoji && (
            <span style={{ fontSize: 20 }}>{toast.emoji}</span>
          )}
          <div>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              {toast.message}
            </p>
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: colors[toast.type],
              flexShrink: 0,
              boxShadow: `0 0 8px ${colors[toast.type]}`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
