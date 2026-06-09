import { useEffect, useState } from 'react';

interface PWAInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installPrompt: PWAInstallPrompt | null;
  beforeInstallPromptReceived: boolean;
  serviceWorkerRegistered: boolean;
  displayModeStandalone: boolean;
}

const pwaState: PWAState = {
  isInstallable: false,
  isInstalled: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  installPrompt: null,
  beforeInstallPromptReceived: false,
  serviceWorkerRegistered: false,
  displayModeStandalone: false,
};

const subscribers = new Set<() => void>();
let hasInitialized = false;

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber());
};

const initializePWA = () => {
  if (hasInitialized || typeof window === 'undefined') {
    return;
  }

  hasInitialized = true;

  console.log('=== PWA DEBUG ===');
  console.log('DISPLAY MODE', window.matchMedia('(display-mode: standalone)').matches);
  console.log('IS SECURE', window.isSecureContext);
  console.log('SERVICE WORKER SUPPORTED', 'serviceWorker' in navigator);
  console.log('USER AGENT', navigator.userAgent);

  pwaState.displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  pwaState.isInstalled = pwaState.displayModeStandalone;

  const handleBeforeInstallPrompt = (e: Event) => {
    console.log('EVENTO beforeinstallprompt RECEBIDO');
    e.preventDefault();

    pwaState.installPrompt = e as PWAInstallPrompt;
    pwaState.isInstallable = true;
    pwaState.beforeInstallPromptReceived = true;
    notifySubscribers();
  };

  const handleAppInstalled = () => {
    console.log('appinstalled event recebido');
    pwaState.isInstalled = true;
    pwaState.isInstallable = false;
    notifySubscribers();
  };

  const handleOnline = () => {
    pwaState.isOnline = true;
    notifySubscribers();
  };

  const handleOffline = () => {
    pwaState.isOnline = false;
    notifySubscribers();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // DEV → remove SWs antigos para evitar cache local
  if (
    import.meta.env.DEV &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  ) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
      console.log('SW removidos (DEV)');
    });
  }

  // PROD → registra normalmente
if (
  import.meta.env.PROD &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator
) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      // Verifica atualizações imediatamente
      registration.update();

      // Verifica atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 60000);

      // Detecta nova versão e recarrega o app
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker?.addEventListener('statechange', () => {
          if (
            newWorker.state === 'activated' &&
            navigator.serviceWorker.controller
          ) {
            console.log('Nova versão detectada, recarregando...');
            window.location.reload();
          }
        });
      });

      console.log('SW registrado');

      pwaState.serviceWorkerRegistered = true;
      notifySubscribers();

      console.log('Service Worker registered:', registration);

      navigator.serviceWorker.ready.then(() => {
        console.log('SW pronto');
      });

      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('SW Registrations:', registrations);
      });
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
};


const installApp = async (): Promise<boolean> => {
  if (!pwaState.installPrompt) {
    return false;
  }

  pwaState.installPrompt.prompt();

  const { outcome } = await pwaState.installPrompt.userChoice;

  console.log(`User response to the install prompt: ${outcome}`);

  if (outcome === 'accepted') {
    pwaState.isInstallable = false;
    pwaState.installPrompt = null;
    pwaState.isInstalled = true;
    notifySubscribers();
    return true;
  }

  return false;
};

const requestBackgroundSync = async () => {
  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-data');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
};

export function usePWA() {
  const [current, setCurrent] = useState<PWAState>({ ...pwaState });

  useEffect(() => {
    initializePWA();

    const subscriber = () => setCurrent({ ...pwaState });

    subscribers.add(subscriber);
    setCurrent({ ...pwaState });

    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  return {
    ...current,
    installApp,
    requestBackgroundSync,
  };
}