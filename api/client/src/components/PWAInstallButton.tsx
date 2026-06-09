import { Download } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallButton() {
  const { isInstallable, isOnline, installApp } = usePWA();

  if (!isInstallable || !isOnline) {
    return null;
  }

  return (
    <button
      onClick={installApp}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #A855F7, #C084FC)',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(168,85,247,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Download size={16} />
      Instalar App
    </button>
  );
}
