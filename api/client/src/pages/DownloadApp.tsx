import React, { useState, useEffect } from "react";
import {
  Download,
  Share2,
  Copy,
  Check,
  Smartphone,
  Zap,
  CheckCircle2,
  QrCode,
  ChevronDown,
  Bolt,
} from "lucide-react";
import { showToast } from "@/components/ui/FlowToast";
import { usePWA } from "@/hooks/usePWA";

const APP_URL = "https://ascend-lac-zeta.vercel.app";

type Platform = "android" | "ios" | "desktop" | "unknown";

export default function DownloadApp() {
  const {
    isInstallable,
    isInstalled,
    beforeInstallPromptReceived,
    serviceWorkerRegistered,
    displayModeStandalone,
    isOnline,
    installApp,
  } = usePWA();

  const [platform, setPlatform] = useState<Platform>("unknown");
  const [copied, setCopied] = useState(false);
  const [openPlat, setOpenPlat] = useState<"android" | "ios" | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else setPlatform("desktop");
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(APP_URL);
    setCopied(true);
    showToast("Link copiado! 📋", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ascend", text: "Instale o Ascend.", url: APP_URL });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const ok = await installApp();
      if (ok) showToast("Ascend instalado com sucesso! 🎉", "success");
    } else {
      showToast("Abra este app no Chrome do celular para instalar", "info");
    }
  };

  const togglePlat = (p: "android" | "ios") =>
    setOpenPlat((prev) => (prev === p ? null : p));

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APP_URL)}&bgcolor=08060f&color=a78bfa&margin=10`;

  const androidSteps = [
    { n: "01", title: "Toque em Instalar Agora", sub: "Banner do Chrome aparece automaticamente" },
    { n: "02", title: "Confirme a instalação", sub: "Toque em Instalar na caixa de diálogo" },
    { n: "03", title: "Pronto ✦", sub: "Ícone na tela inicial" },
  ];

  const iosSteps = [
    { n: "01", title: "Toque em Compartilhar ↑", sub: "Barra inferior do Safari" },
    { n: "02", title: "Adicionar à Tela de Início", sub: "Role a lista de ações" },
    { n: "03", title: "Confirme ✦", sub: "Toque em Adicionar" },
  ];

  const benefits = [
    { icon: Zap, label: "Acesso rápido", desc: "Um toque na tela inicial, sem abrir o navegador." },
    { icon: Smartphone, label: "Ícone nativo", desc: "Aparência de app real, integrado ao sistema." },
    { icon: CheckCircle2, label: "Full experience", desc: "Interface completa sem barra de endereços." },
    { icon: Download, label: "Sem loja", desc: "Zero espaço ocupado, zero aprovação." },
  ];

  return (
    <div style={{ fontFamily: "'Sora', sans-serif", maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        .da-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px; border-bottom: 1px solid #18152a;
        }
        .da-topbar-left { display: flex; align-items: center; gap: 10px; }
        .da-topbar-icon {
          width: 32px; height: 32px; border-radius: 9px; background: #2d1f6e;
          display: flex; align-items: center; justify-content: center;
        }
        .da-topbar h1 { font-size: 16px; font-weight: 700; letter-spacing: -.02em; color: #ede8ff; margin: 0; }
        .da-topbar p { font-size: 11px; color: #3d3560; margin: 1px 0 0; }
        .da-share-btn {
          display: flex; align-items: center; gap: 6px;
          font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 500;
          color: #7c6aab; background: transparent; border: 1px solid #221e38;
          border-radius: 8px; padding: 7px 12px; cursor: pointer;
          transition: border-color .18s, color .18s;
        }
        .da-share-btn:hover { border-color: #4a3d80; color: #a78bfa; }

        .da-hero {
          border: 1px solid #1a1628; border-radius: 14px; padding: 24px;
          background: #0d0b18; margin: 16px;
        }
        .da-hero-tag {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          letter-spacing: .12em; color: #5b4db0; margin-bottom: 12px;
          display: flex; align-items: center; gap: 6px;
        }
        .da-hero-tag::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: #6d28d9; display: inline-block;
        }
        .da-hero h2 {
          font-size: 22px; font-weight: 800; letter-spacing: -.04em;
          color: #ede8ff; line-height: 1.1; margin: 0 0 10px;
        }
        .da-hero > p { font-size: 13px; color: #5a5480; line-height: 1.6; max-width: 360px; margin: 0; }
        .da-hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 18px; flex-wrap: wrap; }

        .da-btn-main {
          display: flex; align-items: center; gap: 7px;
          background: #6d28d9; color: #fff; border: none; border-radius: 9px;
          font-family: 'Sora', sans-serif; font-weight: 600; font-size: 13px;
          padding: 10px 18px; cursor: pointer; transition: background .15s;
        }
        .da-btn-main:hover { background: #7c3aed; }
        .da-btn-sec {
          display: flex; align-items: center; gap: 7px;
          background: transparent; color: #7c6aab; border: 1px solid #221e38;
          border-radius: 9px; font-family: 'Sora', sans-serif; font-weight: 500;
          font-size: 13px; padding: 10px 16px; cursor: pointer;
          transition: border-color .15s, color .15s;
        }
        .da-btn-sec:hover { border-color: #4a3d80; color: #a78bfa; }

        .da-label {
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          letter-spacing: .1em; color: #3d3560; text-transform: uppercase;
          padding: 0 16px; margin: 16px 0 8px; display: block;
        }

        .da-plat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 16px 12px; }
        .da-plat-card {
          border: 1px solid #1c1928; border-radius: 12px; background: #111019;
          overflow: hidden; cursor: pointer; transition: border-color .2s;
        }
        .da-plat-card:hover, .da-plat-card.open { border-color: #2d2650; }
        .da-plat-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px; }
        .da-plat-header-left { display: flex; align-items: center; gap: 9px; }
        .da-plat-icon {
          width: 28px; height: 28px; border-radius: 7px; background: #1a1530;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .da-plat-name { font-size: 13px; font-weight: 600; color: #cfc8f0; letter-spacing: -.01em; }
        .da-plat-desc { font-size: 11px; color: #3d3560; margin-top: 2px; }
        .da-plat-arrow { color: #3d3560; font-size: 14px; transition: transform .2s; flex-shrink: 0; }
        .da-plat-arrow.open { transform: rotate(180deg); }
        .da-plat-body { border-top: 1px solid #1c1928; padding: 14px; }

        .da-step {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 9px 11px; border-radius: 8px; background: #0d0b18;
          border: 1px solid #18152a; margin-bottom: 7px; transition: border-color .18s;
        }
        .da-step:last-of-type { margin-bottom: 0; }
        .da-step:hover { border-color: #2d2650; }
        .da-step-n {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600;
          color: #4a3d80; flex-shrink: 0; margin-top: 1px; letter-spacing: .04em;
        }
        .da-step-title { font-size: 12px; font-weight: 600; color: #cfc8f0; line-height: 1.2; }
        .da-step-sub { font-size: 11px; color: #3d3560; margin-top: 2px; line-height: 1.4; }
        .da-note {
          border: 1px solid #2a1f10; border-radius: 8px; padding: 10px 12px;
          background: #100d06; color: #a37c40; font-size: 11px; line-height: 1.5; margin-top: 10px;
        }

        .da-collapse {
          border: 1px solid #18152a; border-radius: 12px;
          margin: 0 16px 12px; overflow: hidden; background: #0c0a17;
        }
        .da-collapse-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; cursor: pointer; user-select: none;
        }
        .da-collapse-left { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #cfc8f0; }
        .da-collapse-dot { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }
        .da-collapse-arrow { color: #3d3560; transition: transform .2s; }
        .da-collapse-arrow.open { transform: rotate(180deg); }
        .da-collapse-body { border-top: 1px solid #18152a; padding: 18px; }
        .da-debug-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .da-debug-item { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #3d3560; }
        .da-debug-item b { color: #4a3d80; font-weight: 400; }
        .da-v-true { color: #4ade80 !important; }
        .da-v-false { color: #f87171 !important; }

        .da-qr-card { border: 1px solid #1a1628; border-radius: 12px; margin: 0 16px 12px; background: #0c0a17; padding: 20px; }
        .da-qr-block { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
        .da-qr-frame { border: 1px solid #221e38; border-radius: 9px; padding: 9px; background: #08060f; flex-shrink: 0; }
        .da-qr-frame img { width: 88px; height: 88px; display: block; border-radius: 4px; }
        .da-qr-info h3 { font-size: 13px; font-weight: 700; color: #ede8ff; margin: 0 0 4px; }
        .da-qr-info p { font-size: 12px; color: #5a5480; line-height: 1.5; margin: 0 0 12px; }
        .da-url-row {
          display: flex; align-items: center; gap: 8px; background: #08060f;
          border: 1px solid #1a1628; border-radius: 7px; padding: 7px 11px; margin-bottom: 10px;
        }
        .da-url-row code { flex: 1; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #6d5ea0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .da-copy-btn { background: transparent; border: none; color: #3d3560; cursor: pointer; display: flex; padding: 2px; transition: color .15s; }
        .da-copy-btn:hover { color: #a78bfa; }
        .da-check-list { display: flex; flex-direction: column; gap: 4px; }
        .da-check-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #5a5480; }
        .da-check-item::before { content: '✓'; color: #6d28d9; font-size: 10px; font-weight: 700; }

        .da-benefits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 16px 14px; }
        .da-ben { border: 1px solid #1a1628; border-radius: 11px; padding: 14px; background: #0d0b18; }
        .da-ben-icon { width: 28px; height: 28px; border-radius: 7px; background: #1a1530; display: flex; align-items: center; justify-content: center; margin-bottom: 9px; }
        .da-ben-title { font-size: 12px; font-weight: 700; color: #cfc8f0; margin-bottom: 2px; }
        .da-ben-sub { font-size: 11px; color: #3d3560; line-height: 1.4; }

        .da-footer {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          border: 1px solid #1a1628; border-radius: 12px; margin: 0 16px 16px;
          padding: 14px 18px; background: #0d0b18; flex-wrap: wrap;
        }
        .da-footer p { font-size: 13px; font-weight: 600; color: #ede8ff; margin: 0; }
        .da-footer code { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #3d3560; margin-top: 2px; display: block; }

        @media (max-width: 520px) {
          .da-plat-row { grid-template-columns: 1fr; }
          .da-benefits { grid-template-columns: 1fr 1fr; }
          .da-qr-block { flex-direction: column; }
          .da-debug-grid { grid-template-columns: 1fr; }
          .da-hero h2 { font-size: 18px; }
        }
      `}</style>

      {/* ── TOPBAR ── */}
      <div className="da-topbar">
        <div className="da-topbar-left">
          <div className="da-topbar-icon">
            <Download size={16} color="#a78bfa" />
          </div>
          <div>
            <h1>Baixar App</h1>
            <p>Instale em qualquer dispositivo</p>
          </div>
        </div>
        <button className="da-share-btn" onClick={shareLink}>
          <Share2 size={12} />
          Compartilhar
        </button>
      </div>

      {/* ── HERO ── */}
      <div className="da-hero">
        <div className="da-hero-tag">PROGRESSIVE WEB APP</div>
        <h2>Acesso instantâneo da tela inicial</h2>
        <p>
          Instale o Ascend como um app nativo. Sem loja, sem downloads pesados —
          funciona em qualquer dispositivo com um toque.
        </p>
        <div className="da-hero-actions">
          <button className="da-btn-main" onClick={handleInstall}>
            <Download size={13} />
            Instalar Agora
          </button>
          <button className="da-btn-sec" onClick={copyToClipboard}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            Copiar link
          </button>
        </div>
      </div>

      {/* ── GUIA DE INSTALAÇÃO (lado a lado) ── */}
      <span className="da-label">Guia de instalação</span>
      <div className="da-plat-row">

        {/* ANDROID */}
        <div
          className={`da-plat-card${openPlat === "android" ? " open" : ""}`}
          onClick={() => togglePlat("android")}
        >
          <div className="da-plat-header">
            <div className="da-plat-header-left">
              <div className="da-plat-icon">
                <Smartphone size={14} color="#a78bfa" />
              </div>
              <div>
                <div className="da-plat-name">Android</div>
                <div className="da-plat-desc">Chrome · instala 1 toque</div>
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`da-plat-arrow${openPlat === "android" ? " open" : ""}`}
              style={{ color: "#3d3560", transition: "transform .2s", transform: openPlat === "android" ? "rotate(180deg)" : "none" }}
            />
          </div>
          {openPlat === "android" && (
            <div className="da-plat-body">
              {isInstallable ? (
                androidSteps.map((s) => (
                  <div className="da-step" key={s.n}>
                    <span className="da-step-n">{s.n}</span>
                    <div>
                      <div className="da-step-title">{s.title}</div>
                      <div className="da-step-sub">{s.sub}</div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {[
                    { n: "01", title: "Abra no Chrome", sub: "Use o navegador Chrome no Android" },
                    { n: "02", title: "Toque em ⋮", sub: "Menu no canto superior direito" },
                    { n: "03", title: "Adicionar à tela inicial", sub: "Escolha esta opção para instalar" },
                  ].map((s) => (
                    <div className="da-step" key={s.n}>
                      <span className="da-step-n">{s.n}</span>
                      <div>
                        <div className="da-step-title">{s.title}</div>
                        <div className="da-step-sub">{s.sub}</div>
                      </div>
                    </div>
                  ))}
                  <div className="da-note">
                    Se o banner não aparecer, abra o link diretamente no Chrome e tente novamente.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* iOS */}
        <div
          className={`da-plat-card${openPlat === "ios" ? " open" : ""}`}
          onClick={() => togglePlat("ios")}
        >
          <div className="da-plat-header">
            <div className="da-plat-header-left">
              <div className="da-plat-icon">
                <QrCode size={14} color="#a78bfa" />
              </div>
              <div>
                <div className="da-plat-name">iPhone / iPad</div>
                <div className="da-plat-desc">Safari · menu compartilhar</div>
              </div>
            </div>
            <ChevronDown
              size={14}
              style={{ color: "#3d3560", transition: "transform .2s", transform: openPlat === "ios" ? "rotate(180deg)" : "none" }}
            />
          </div>
          {openPlat === "ios" && (
            <div className="da-plat-body">
              {iosSteps.map((s) => (
                <div className="da-step" key={s.n}>
                  <span className="da-step-n">{s.n}</span>
                  <div>
                    <div className="da-step-title">{s.title}</div>
                    <div className="da-step-sub">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── STATUS DE INSTALAÇÃO (colapsável) ── */}
      <div className="da-collapse">
        <div className="da-collapse-header" onClick={() => setStatusOpen((p) => !p)}>
          <div className="da-collapse-left">
            <div className="da-collapse-dot" />
            Status de instalação
          </div>
          <ChevronDown
            size={14}
            style={{ color: "#3d3560", transition: "transform .2s", transform: statusOpen ? "rotate(180deg)" : "none" }}
          />
        </div>
        {statusOpen && (
          <div className="da-collapse-body">
            <div className="da-debug-grid">
              <div className="da-debug-item">
                <b>isInstallable </b>
                <span className={isInstallable ? "da-v-true" : "da-v-false"}>{String(isInstallable)}</span>
              </div>
              <div className="da-debug-item">
                <b>isInstalled </b>
                <span className={isInstalled ? "da-v-true" : "da-v-false"}>{String(isInstalled)}</span>
              </div>
              <div className="da-debug-item">
                <b>beforeInstallPrompt </b>
                <span className={beforeInstallPromptReceived ? "da-v-true" : "da-v-false"}>{String(beforeInstallPromptReceived)}</span>
              </div>
              <div className="da-debug-item">
                <b>serviceWorker </b>
                <span className={serviceWorkerRegistered ? "da-v-true" : "da-v-false"}>
                  {serviceWorkerRegistered ? "registrado" : "pendente"}
                </span>
              </div>
              <div className="da-debug-item">
                <b>displayMode </b>
                <span>{displayModeStandalone ? "standalone" : "browser"}</span>
              </div>
              <div className="da-debug-item">
                <b>online </b>
                <span className={isOnline ? "da-v-true" : "da-v-false"}>{String(isOnline)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── QR / CELULAR ── */}
      <span className="da-label">Instalar no celular</span>
      <div className="da-qr-card">
        <div className="da-qr-block">
          <div className="da-qr-frame">
            <img src={qrUrl} alt="QR Code Ascend" />
          </div>
          <div className="da-qr-info">
            <h3>Escaneie para instalar no celular</h3>
            <p>
              Aponte a câmera para o QR ou acesse o link direto no navegador do
              seu dispositivo.
            </p>
            <div className="da-url-row">
              <code>{APP_URL.replace("https://", "")}</code>
              <button className="da-copy-btn" onClick={copyToClipboard} title="Copiar">
                {copied ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="da-check-list">
              <div className="da-check-item">Funciona em qualquer navegador mobile</div>
              <div className="da-check-item">Instala direto da tela inicial sem loja</div>
              <div className="da-check-item">Compartilhe com amigos e família</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── POR QUE INSTALAR ── */}
      <span className="da-label">Por que instalar?</span>
      <div className="da-benefits">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <div className="da-ben" key={i}>
              <div className="da-ben-icon">
                <Icon size={13} color="#a78bfa" />
              </div>
              <div className="da-ben-title">{b.label}</div>
              <div className="da-ben-sub">{b.desc}</div>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <div className="da-footer">
        <div>
          <p>Compartilhe o Ascend</p>
          <code>{APP_URL}</code>
        </div>
        <button className="da-btn-main" onClick={copyToClipboard} style={{ fontSize: 12, padding: "9px 16px" }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiado!" : "Copiar Link"}
        </button>
      </div>
    </div>
  );
}