import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'xp' | 'achievement' | 'info' | 'error';
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

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      const duration = toast.type === 'error' ? 5000 : 3000;
      setTimeout(() => {
        removeToast(toast.id);
      }, duration);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const colors: Record<Toast['type'], string> = {
    success: '#10B981',
    xp: 'var(--accent)',
    achievement: 'var(--primary)',
    info: '#60A5FA',
    error: '#EF4444',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      {toasts.map((toast, i) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';
        const bg = isError
          ? 'linear-gradient(135deg, rgba(30, 15, 15, 0.98), rgba(42, 20, 20, 0.94))'
          : isInfo
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.94))'
            : 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(24, 24, 38, 0.92))';

        return (
          <div
            key={toast.id}
            className="fz-toast"
            style={{
              borderColor: isError
                ? 'rgba(239, 68, 68, 0.45)'
                : isInfo
                  ? 'rgba(96, 165, 250, 0.35)'
                  : `${colors[toast.type]}55`,
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '12px 14px',
              minWidth: 280,
              maxWidth: 360,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: bg,
              backdropFilter: 'blur(18px)',
              boxShadow: isError
                ? '0 8px 32px rgba(239, 68, 68, 0.25)'
                : '0 14px 40px rgba(15, 23, 42, 0.35)',
              animationDelay: `${i * 50}ms`,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isError
                  ? 'rgba(239, 68, 68, 0.18)'
                  : isInfo
                    ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(59, 130, 246, 0.18))'
                    : 'rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}
            >
              {toast.emoji ? (
                <span style={{ fontSize: 16 }}>{toast.emoji}</span>
              ) : isError ? (
                <span style={{ fontSize: 16, color: colors[toast.type] }}>!</span>
              ) : (
                <span style={{ fontSize: 16, color: colors[toast.type] }}>●</span>
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

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: 0.6,
                transition: 'opacity 0.2s',
                borderRadius: 6,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.opacity = '0.6';
              }}
            >
              <X size={14} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
