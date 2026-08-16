import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notifications";

type Tab = "login" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      notifyWarning("Digite seu e-mail primeiro.");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      notifyError(error.message);
    } else {
      notifySuccess("E-mail de recuperação enviado!");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!acceptTerms) {
      notifyWarning("Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.");
      return;
    }
    const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;

    if (!strongPassword.test(password)) {
      notifyError(
        "Senha inválida",
        "Use pelo menos 8 caracteres, 1 letra maiúscula, 1 minúscula e 1 número."
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      notifyError(error.message);
      setLoading(false);
      return;
    }

    notifySuccess("Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.");

    setTab("login");
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      notifyError(error.message);
      setLoading(false);
      return;
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();

      notifyWarning("Você precisa confirmar seu e-mail antes de entrar.");

      setLoading(false);
      return;
    }

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);

    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 72%; }
        }

        /* ── LEDGER NOTURNO — tinta sobre papel, sem glow ── */
        .asc-root {
          height: 100vh;
          min-height: 600px;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #111118;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Left panel ─────────────────────────────────── */
        .asc-left {
          flex: 1;
          min-width: 0;
          height: 100%;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          padding: 48px 56px;
          position: relative;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.35) transparent;
        }
        .asc-left::-webkit-scrollbar { width: 6px; }
        .asc-left::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.35); border-radius: 3px; }

        /* Textura de pauta: linhas horizontais finas, como caderno */
        .asc-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 47px,
            rgba(255, 255, 255, 0.028) 47px,
            rgba(255, 255, 255, 0.028) 48px
          );
          pointer-events: none;
        }

        /* Margem vertical âmbar — a margem vermelha do caderno, aqui em tinta âmbar */
        .asc-left::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: 40px;
          width: 1px;
          background: rgba(245, 158, 11, 0.28);
          pointer-events: none;
        }

        .asc-left-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          z-index: 2;
        }

        .asc-left-logo img {
          height: 96px;
          width: auto;
          filter: brightness(1.1);
        }

        .asc-left-hero {
          position: relative;
          z-index: 2;
          animation: fadeUp 0.6s ease both;
          padding-top: 36px;
          border-left: 2px solid var(--primary);
          padding-left: 22px;
        }

        .asc-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: 1px solid rgba(139, 92, 246, 0.5);
          border-radius: 3px;
          padding: 5px 12px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 18px;
        }

        .asc-hero-tag::before {
          content: '§';
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
        }

        .asc-hero-title {
          font-size: clamp(30px, 3.2vw, 44px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.035em;
          color: var(--ink);
          margin: 0 0 16px;
          font-family: 'Space Grotesk', sans-serif;
        }

        .asc-hero-title span {
          color: var(--primary);
        }

        .asc-hero-sub {
          font-size: 14.5px;
          color: var(--ink-muted);
          line-height: 1.65;
          font-weight: 400;
          max-width: 380px;
          margin: 0;
        }

        /* ── Mock card scene ─────────────────────────────────── */
        .asc-mock-scene {
          display: flex;
          align-items: center;
          position: relative;
          z-index: 2;
          padding: 28px 0;
          width: 100%;
        }

        /* Ficha de caderno: papel opaco, borda superior violeta, sombra dura */
        .asc-mock-card {
          width: min(42vw, 520px);
          min-width: 264px;
          max-width: 520px;
          background: var(--ledger-paper-bg);
          border: 1px solid var(--ledger-paper-border);
          border-top: 2px solid var(--primary);
          border-radius: 6px;
          padding: 26px;
          box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.4);
          position: relative;
          margin-left: 26px; /* sangra para além da margem âmbar */
        }

        .asc-mock-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .asc-mock-title {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .asc-mock-level {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid rgba(139, 92, 246, 0.5);
          border-radius: 3px;
          padding: 3px 9px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--primary);
          font-family: 'DM Sans', sans-serif;
        }

        .asc-mock-ring-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          padding: 12px;
          background: #111118;
          border: 1px solid var(--ledger-paper-border);
          border-radius: 4px;
        }

        .asc-ring-wrap {
          position: relative;
          width: 52px; height: 52px;
          flex-shrink: 0;
        }

        .asc-ring-wrap svg {
          transform: rotate(-90deg);
          overflow: visible;
        }

        .asc-ring-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
        }

        .asc-progress-info { flex: 1; }

        .asc-progress-info .pi-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          margin: 0 0 4px;
        }

        .asc-progress-info .pi-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin: 0;
        }

        .asc-xp-mini-track {
          height: 4px;
          background: var(--ledger-paper-border);
          border-radius: 2px;
          margin-top: 7px;
          overflow: hidden;
        }

        .asc-xp-mini-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          animation: progressFill 1.8s 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .asc-mock-habits {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .asc-habit-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          background: transparent;
          border-bottom: 1px solid var(--ledger-paper-border);
        }

        .asc-habit-row:last-child { border-bottom: none; }

        .asc-habit-dot {
          width: 7px; height: 14px;
          border-radius: 1px;
          flex-shrink: 0;
        }

        .asc-habit-name {
          flex: 1;
          font-size: 12px;
          color: rgba(255,255,255,0.6);
        }

        .asc-habit-check {
          width: 16px; height: 16px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .asc-habit-check.done {
          background: #10b981;
          border: 1px solid #10b981;
        }

        .asc-habit-check.done svg {
          width: 9px; height: 9px;
          stroke: #4ade80;
          stroke-width: 2.5;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .asc-habit-row:nth-child(1) .asc-habit-check.done { animation: checkPop1 0.4s 0.6s ease both; }
        .asc-habit-row:nth-child(2) .asc-habit-check.done { animation: checkPop2 0.4s 0.9s ease both; }
        .asc-habit-row:nth-child(3) .asc-habit-check.done { animation: checkPop3 0.4s 1.2s ease both; }

        .asc-habit-check.pending {
          border: 1.5px solid #3f3f4c;
          border-radius: 2px;
        }

        .asc-mock-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid var(--ledger-paper-border);
        }

        .asc-streak-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--primary);
          font-family: 'Space Grotesk', sans-serif;
        }

        .asc-xp-gained {
          font-size: 10.5px;
          color: var(--primary);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: 'DM Sans', sans-serif;
          background: transparent;
          border: 1px solid rgba(139,92,246,0.5);
          border-radius: 3px;
          padding: 3px 9px;
        }

        /* carimbos flutuantes — canto vivo, sem pill */
        .asc-badge-streak {
          position: absolute;
          top: 14px; right: 14px;
          background: var(--ledger-paper-bg);
          border: 1px solid rgba(245,158,11,0.55);
          white-space: nowrap;
          border-radius: 3px;
          padding: 6px 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary);
          font-family: 'DM Sans', sans-serif;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
          transform: rotate(1.5deg);
          z-index: 3;
        }

        .asc-badge-xp {
          position: absolute;
          bottom: 14px; left: 14px;
          background: var(--ledger-paper-bg);
          border: 1px solid rgba(139,92,246,0.55);
          white-space: nowrap;
          border-radius: 3px;
          padding: 6px 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary);
          font-family: 'DM Sans', sans-serif;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
          transform: rotate(-1.5deg);
          z-index: 3;
        }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }

        /* ── Stats strip ─────────────────────────────────── */
        .asc-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 28px 36px;
          position: relative;
          z-index: 2;
          animation: fadeUp 0.6s 0.2s ease both;
          border-top: 1px solid var(--ledger-paper-border);
          padding-top: 22px;
        }

        .asc-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
          flex-shrink: 0;
        }

        .asc-stat-num {
          font-size: 19px;
          font-weight: 800;
          color: var(--ink);
          font-family: 'Space Grotesk', sans-serif;
          letter-spacing: -0.03em;
        }

        .asc-stat-num.orange { color: var(--primary); }
        .asc-stat-num.purple { color: var(--primary); }

        .asc-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }

        .asc-divider-v {
          width: 1px;
          background: rgba(255,255,255,0.08);
          align-self: stretch;
        }

        /* ── Right panel (form) ─── */
        .asc-right {
          width: 480px;
          flex-shrink: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          overflow-y: auto;
          background: #16161d;
          border-left: 1px solid var(--ledger-paper-border);
          position: relative;
        }

        /* Pauta fina também no lado do formulário */
        .asc-right::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 47px,
            rgba(255, 255, 255, 0.022) 47px,
            rgba(255, 255, 255, 0.022) 48px
          );
          pointer-events: none;
        }

        .asc-form-wrap {
          width: 100%;
          max-width: 360px;
          animation: fadeUp 0.5s 0.1s ease both;
          position: relative;
          z-index: 2;
        }

        .asc-form-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }

        .asc-form-logo img {
          height: 80px;
          width: auto;
          filter: brightness(1.1);
        }

        /* ── Tab switcher — dois selos lado a lado ── */
        .asc-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 34px;
        }

        .asc-tab {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--ledger-paper-border);
          background: transparent;
          color: #8a8a98;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.15s;
        }

        .asc-tab:hover { border-color: #46465a; color: #d4d4dc; }

        .asc-tab.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
        }

        /* ── Greeting ─────────────────────────────────── */
        .asc-greeting {
          margin-bottom: 28px;
        }

        .asc-greeting h2 {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }

        .asc-greeting p {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          font-weight: 300;
        }

        /* ── Fields ─────────────────────────────────── */
        .asc-fields {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }

        .asc-label {
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-muted);
          margin-bottom: 7px;
        }

        .asc-field-wrap {
          position: relative;
        }

        .asc-field-icon {
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary);
          pointer-events: none;
          display: flex;
        }

        .asc-field-icon svg {
          width: 15px; height: 15px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .asc-input {
          width: 100%;
          padding: 11px 40px 9px 26px;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--ledger-paper-border);
          border-radius: 0;
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.15s;
          -webkit-text-fill-color: var(--ink);
        }

        .asc-input::placeholder { color: #4a4a57; }

        .asc-input:focus { border-bottom-color: var(--primary); }

        .asc-input:-webkit-autofill,
        .asc-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #16161d inset;
          -webkit-text-fill-color: var(--ink);
          caret-color: var(--ink);
        }

        .asc-eye-btn {
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #4a4a57;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .asc-eye-btn:hover { color: var(--primary); }

        .asc-eye-btn svg {
          width: 15px; height: 15px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .asc-input.has-eye { padding-right: 32px; }

        .asc-forgot {
          display: block;
          text-align: right;
          margin-top: 8px;
          font-size: 11px;
          color: var(--primary);
          cursor: pointer;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }

        .asc-forgot:hover { color: var(--primary); }

        /* ── CTA button — tinta sólida com sombra dura ── */
        .asc-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 5px;
          background: var(--primary-dark, #7c3aed);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
        }

        .asc-btn:hover:not(:disabled) {
          background: #6d28d9;
          transform: translate(0, -2px);
          box-shadow: 3px 5px 0 rgba(0,0,0,0.4);
        }

        .asc-btn:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.4); }
        .asc-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .asc-btn svg {
          width: 15px; height: 15px;
          fill: none;
          stroke: #fff;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* ── Switch link ─────────────────────────────────── */
        .asc-switch {
          margin-top: 18px;
          text-align: center;
          font-size: 12px;
          color: var(--ink-muted);
        }

        .asc-switch button {
          background: none;
          border: none;
          color: var(--primary);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          transition: color 0.2s;
        }

        .asc-switch button:hover { color: var(--primary); }

        /* ── XP bar decoration ─────────────────────────────────── */
        .asc-xp-bar {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid var(--ledger-paper-border);
        }

        .asc-xp-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .asc-xp-label span {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .asc-xp-label .l { color: var(--ink-muted); }
        .asc-xp-label .r { color: var(--primary); }

        .asc-xp-track {
          height: 5px;
          background: var(--ledger-paper-border);
          border-radius: 2px;
          overflow: hidden;
        }

        .asc-xp-fill {
          height: 100%;
          width: 0%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ── Responsive ─────────────────────────────────── */
        /* Ajustes para telas de desktop baixas/estreitas */
        @media (max-width: 1280px) and (max-height: 820px) {
          .asc-left-logo img { height: 64px; }
          .asc-left-hero { padding-top: 20px; }
          .asc-mock-scene { padding-top: 20px; }
          .asc-stats { padding-top: 16px; }
        }
        @media (max-width: 920px) {
          .asc-root {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
          .asc-right {
            width: 100%;
            height: 90vh;
            min-height: 90vh;
            order: -1;
            border-left: none;
            border-bottom: 1px solid rgba(139, 92, 246, 0.08);
            padding: 40px 28px 36px;
            overflow-y: auto;
          }
          .asc-right::before { inset: 0; background-image: repeating-linear-gradient(to bottom, transparent, transparent 47px, rgba(255,255,255,0.022) 47px, rgba(255,255,255,0.022) 48px); }
          .asc-left {
            display: flex;
            flex-direction: column;
            height: auto;
            width: 100%;
            padding: 32px 28px 48px;
            grid-template-rows: none;
            order: 0;
          }
          .asc-left-logo { display: none; }
          .asc-left-hero { padding-top: 0; }
          .asc-mock-scene {
            justify-content: center;
            padding: 28px 0 16px;
          }
          .asc-stats { display: none; }
        }

        /* ── Largura estreita (mobile / tela dividida) ── */
        @media (max-width: 768px) {
          .asc-root {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
          .asc-right {
            width: 100%;
            height: 90vh;
            min-height: 90vh;
            order: -1;
            border-left: none;
            border-bottom: 1px solid rgba(139, 92, 246, 0.08);
            padding: 40px 24px 36px;
            overflow-y: auto;
          }
          .asc-left {
            display: flex;
            flex-direction: column;
            height: auto;
            width: 100%;
            padding: 28px 24px 48px;
            grid-template-rows: none;
            order: 0;
            min-width: 0;
          }
          .asc-left-logo { display: none; }
          .asc-left-hero { padding-top: 0; }
          .asc-mock-scene {
            justify-content: center;
            padding: 24px 0 16px;
          }
          .asc-mock-card {
            width: min(86vw, 420px);
            margin-left: 0;
          }
          .asc-badge-streak,
          .asc-badge-xp { display: none; }
          .asc-stats { display: none; }
        }

        @media (min-width: 921px) {
          .asc-mock-scene {
            justify-content: center;
          }
        }
      `}</style>

      <div className="asc-root">
        {/* ── Left decorative panel ── */}
        <div className="asc-left">
          <div className="asc-orb1" />
          <div className="asc-orb2" />

          {/* Logo */}
          <div className="asc-left-logo">
            <img src="/Logo-TaskBar.png" alt="ASCEND" />
          </div>

          {/* Hero text */}
          <div className="asc-left-hero">
            <div className="asc-hero-tag">O caderno de níveis</div>
            <h1 className="asc-hero-title">
              Suba um nível
              <br />
              <span>por dia.</span>
            </h1>
            <p className="asc-hero-sub">
              Tarefas, hábitos e metas anotadas a cada dia — e convertidas em
              XP, sequências e registros que você pode ler de verdade.
            </p>
          </div>

          {/* Mock app card */}
          <div className="asc-mock-scene">
            <div className="asc-mock-card">
              {/* Floating badges */}
              <div className="asc-badge-streak">
                Seq · 12 dias
              </div>
              <div className="asc-badge-xp">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 0,
                    background: "var(--primary)",
                    display: "inline-block",
                  }}
                />
                +240 XP hoje
              </div>

              {/* Card header */}
              <div className="asc-mock-header">
                <span className="asc-mock-title">REGISTRO DO DIA</span>
                <span className="asc-mock-level">Nv 4</span>
              </div>

              {/* Progress ring row */}
              <div className="asc-mock-ring-row">
                <div className="asc-ring-wrap">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke="var(--ledger-paper-border)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="5"
                      strokeLinecap="butt"
                      strokeDasharray="138"
                      strokeDashoffset="35"
                    />
                  </svg>
                  <div className="asc-ring-label">75%</div>
                </div>
                <div className="asc-progress-info">
                  <p className="pi-label">Faltam 3 anotações</p>
                  <p className="pi-sub">4 hábitos no caderno</p>
                  <div className="asc-xp-mini-track">
                    <div className="asc-xp-mini-fill" />
                  </div>
                </div>
              </div>

              {/* Habits */}
              <div className="asc-mock-habits">
                <div className="asc-habit-row">
                  <div
                    className="asc-habit-dot"
                    style={{ background: "var(--primary)" }}
                  />
                  <span className="asc-habit-name">Treinar</span>
                  <div className="asc-habit-check done">
                    <svg viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                </div>
                <div className="asc-habit-row">
                  <div
                    className="asc-habit-dot"
                    style={{ background: "var(--primary)" }}
                  />
                  <span className="asc-habit-name">Estudar</span>
                  <div className="asc-habit-check done">
                    <svg viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                </div>
                <div className="asc-habit-row">
                  <div
                    className="asc-habit-dot"
                    style={{ background: "#4ade80" }}
                  />
                  <span className="asc-habit-name">Orar</span>
                  <div className="asc-habit-check done">
                    <svg viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                </div>
                <div className="asc-habit-row">
                  <div
                    className="asc-habit-dot"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  />
                  <span className="asc-habit-name">Correr</span>
                  <div className="asc-habit-check pending" />
                </div>
              </div>

              {/* Footer */}
              <div className="asc-mock-footer">
                <div className="asc-streak-pill">Seq · 12 dias</div>
                <span className="asc-xp-gained">+240 XP</span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="asc-stats">
            <div className="asc-stat">
              <span className="asc-stat-num purple">XP</span>
              <span className="asc-stat-label">Níveis que somam</span>
            </div>
            <div className="asc-divider-v" />
            <div className="asc-stat">
              <span className="asc-stat-num orange">Seq</span>
              <span className="asc-stat-label">Sequências diárias</span>
            </div>
            <div className="asc-divider-v" />
            <div className="asc-stat">
              <span className="asc-stat-num" style={{ color: "#4ade80" }}>
                ∞
              </span>
              <span className="asc-stat-label">Hábitos & metas</span>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="asc-right">
          <div className="asc-form-wrap">
            {/* Logo */}
            <div className="asc-form-logo">
              <img src="/Logo-TaskBar.png" alt="ASCEND" />
            </div>

            {/* Tabs */}
            <div className="asc-tabs">
              <button
                className={`asc-tab ${tab === "login" ? "active" : ""}`}
                onClick={() => setTab("login")}
              >
                Entrar
              </button>
              <button
                className={`asc-tab ${tab === "signup" ? "active" : ""}`}
                onClick={() => setTab("signup")}
              >
                Criar conta
              </button>
            </div>

            {/* Login */}
            {tab === "login" && (
              <>
                <div className="asc-greeting">
                  <h2>Bem-vindo de volta</h2>
                  <p>Continue de onde parou</p>
                </div>

                <div className="asc-fields">
                  <div>
                    <label className="asc-label">Email</label>
                    <div className="asc-field-wrap">
                      <span className="asc-field-icon">
                        <svg viewBox="0 0 24 24">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <polyline points="2,4 12,13 22,4" />
                        </svg>
                      </span>
                      <input
                        className="asc-input"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="asc-label">Senha</label>
                    <div className="asc-field-wrap">
                      <span className="asc-field-icon">
                        <svg viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <input
                        className="asc-input has-eye"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        className="asc-eye-btn"
                        onClick={() => setShowPassword(v => !v)}
                        type="button"
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <button type="button" onClick={handleForgotPassword} className="asc-forgot bg-transparent border-none cursor-pointer hover:underline p-0">Esqueci a senha</button>
                  </div>
                </div>

                <button
                  className="asc-btn"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                  {!loading && (
                    <svg viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>

                <div className="asc-switch">
                  Não tem uma conta?
                  <button onClick={() => setTab("signup")}>Criar conta</button>
                </div>
              </>
            )}

            {/* Signup */}
            {tab === "signup" && (
              <>
                <div className="asc-greeting">
                  <h2>Comece agora</h2>
                  <p>Crie sua conta e evolua todo dia</p>
                </div>

                <div className="asc-fields">
                  <div>
                    <label className="asc-label">Nome</label>
                    <div className="asc-field-wrap">
                      <span className="asc-field-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <input
                        className="asc-input"
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="asc-label">Email</label>
                    <div className="asc-field-wrap">
                      <span className="asc-field-icon">
                        <svg viewBox="0 0 24 24">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <polyline points="2,4 12,13 22,4" />
                        </svg>
                      </span>
                      <input
                        className="asc-input"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="asc-label">Senha</label>
                    <div className="asc-field-wrap">
                      <span className="asc-field-icon">
                        <svg viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <input
                        className="asc-input has-eye"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        className="asc-eye-btn"
                        onClick={() => setShowPassword(v => !v)}
                        type="button"
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                                        <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      • 8 caracteres
                      <br />
                      • 1 letra maiúscula
                      <br />
                      • 1 letra minúscula
                      <br />• 1 número
                    </div>
                  </div>
                </div>
                {/* Termos de Uso e Privacidade */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={acceptTerms}
                    onChange={e => setAcceptTerms(e.target.checked)}
                    style={{
                      marginTop: 2,
                      width: 16,
                      height: 16,
                      accentColor: "var(--primary)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <label
                    htmlFor="accept-terms"
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    Li e aceito os{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary)", textDecoration: "underline" }}
                    >
                      Termos de Uso
                    </a>{" "}
                    e a{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary)", textDecoration: "underline" }}
                    >
                      Política de Privacidade
                    </a>{" "}
                    do Ascend.
                  </label>
                </div>
                <button
                  className="asc-btn"
                  onClick={handleSignup}
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                  {!loading && (
                    <svg viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>

                <div className="asc-switch">
                  Já tem uma conta?
                  <button onClick={() => setTab("login")}>Entrar</button>
                </div>
              </>
            )}

            {/* XP bar decoration */}
            <div className="asc-xp-bar">
              <div className="asc-xp-label">
                <span className="l">Progresso de hoje</span>
                <span className="r">0 XP</span>
              </div>
              <div className="asc-xp-track">
                <div className="asc-xp-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
