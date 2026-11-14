import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile (CAPTCHA invisível na maioria dos casos).
// Só aparece se VITE_TURNSTILE_SITE_KEY estiver definida; sem ela o
// componente não renderiza nada e o login funciona como antes.
//
// O token vai no captchaToken do Supabase Auth. A validação de verdade
// é feita pelo Supabase quando "Enable Captcha protection" está ligado
// (Authentication > Attack Protection) com a chave secreta do Turnstile.

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("turnstile_load_failed"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

type Props = {
  onToken: (token: string | null) => void;
  action?: string;
};

export const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile({ onToken, action }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !container.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "auto",
          language: "pt-br",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={container} style={{ margin: "12px 0", minHeight: 65 }} />;
});
