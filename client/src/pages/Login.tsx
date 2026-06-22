import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notifications";

type Tab = "login" | "signup";

export default function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(30px, -20px) scale(1.1); }
        }

        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-20px, 30px) scale(0.95); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
          50%       { transform: translateY(-14px) rotate(-1.5deg); }
        }

        @keyframes floatBadgeA {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50%       { transform: translateY(-10px) rotate(3deg); }
        }

        @keyframes floatBadgeB {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-8px) rotate(-2deg); }
        }

        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 72%; }
        }

        @keyframes checkPop1 { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes checkPop2 { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes checkPop3 { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }

        .asc-root {
          height: 100vh;
          min-height: 600px;
          display: flex;
          font-family: 'Sora', sans-serif;
          background: #07080f;
          position: relative;
          overflow: hidden;
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
          overflow: hidden;
        }

        .asc-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 55% at 30% 20%, rgba(99, 70, 220, 0.22) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(255, 140, 50, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .asc-orb1 {
          position: absolute;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 70, 220, 0.18) 0%, transparent 70%);
          top: -60px; left: -60px;
          animation: orb1 12s ease-in-out infinite;
          pointer-events: none;
        }

        .asc-orb2 {
          position: absolute;
          width: 250px; height: 250px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 140, 50, 0.1) 0%, transparent 70%);
          bottom: 80px; right: 40px;
          animation: orb2 15s ease-in-out infinite;
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
          padding-top: 28px;
        }

        .asc-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99, 70, 220, 0.12);
          border: 1px solid rgba(99, 70, 220, 0.25);
          border-radius: 20px;
          padding: 5px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #a78bfa;
          margin-bottom: 20px;
        }

        .asc-hero-tag::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.8);
        }

        .asc-hero-title {
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #fff;
          margin: 0 0 14px;
        }

        .asc-hero-title span {
          background: linear-gradient(135deg, #a78bfa 0%, #6346dc 50%, #ff8c32 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .asc-hero-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          font-weight: 300;
          max-width: 360px;
          margin: 0;
        }

        /* ── Mock card scene ─────────────────────────────────── */
        .asc-mock-scene {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          padding: 28px 0;
          width: 100%;
        }

        .asc-mock-card {
          width: min(40vw, 520px);
          max-width: 520px;
          background: rgba(13, 14, 28, 0.95);
          backdrop-filter: blur(26px);
          border: 1px solid rgba(99, 70, 220, 0.25);
          border-radius: 22px;
          padding: 26px;
          animation: floatCard 10s ease-in-out infinite;
          box-shadow:
            0 28px 70px rgba(0,0,0,0.55),
            0 0 0 1px rgba(99,70,220,0.08),
            inset 0 1px 0 rgba(255,255,255,0.05);
          position: relative;
        }

        .asc-mock-card::before {
          content: '';
          position: absolute;
          top: 0; left: 24px; right: 24px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,70,220,0.6), transparent);
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
        }

        .asc-mock-level {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(99, 70, 220, 0.15);
          border: 1px solid rgba(99, 70, 220, 0.25);
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #a78bfa;
          font-family: 'JetBrains Mono', monospace;
        }

        .asc-mock-ring-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
          padding: 12px;
          background: rgba(255,255,255,0.025);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05);
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
          font-family: 'JetBrains Mono', monospace;
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
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          margin-top: 7px;
          overflow: hidden;
        }

        .asc-xp-mini-fill {
          height: 100%;
          background: linear-gradient(90deg, #6346dc, #a78bfa);
          border-radius: 99px;
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
          background: rgba(255,255,255,0.025);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.04);
        }

        .asc-habit-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
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
          background: rgba(74,222,128,0.12);
          border: 1px solid rgba(74,222,128,0.3);
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
          border: 1px solid rgba(255,255,255,0.1);
        }

        .asc-mock-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .asc-streak-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #ff8c32;
          font-family: 'JetBrains Mono', monospace;
        }

        .asc-xp-gained {
          font-size: 11px;
          color: #a78bfa;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          background: rgba(99,70,220,0.1);
          border: 1px solid rgba(99,70,220,0.2);
          border-radius: 12px;
          padding: 3px 9px;
        }

        /* floating badges */
        .asc-badge-streak {
          position: absolute;
          top: -18px; right: -20px;
          background: rgba(15, 14, 22, 0.92);
          border: 1px solid rgba(255,140,50,0.35);
          border-radius: 12px;
          padding: 7px 13px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          color: #ff8c32;
          font-family: 'JetBrains Mono', monospace;
          backdrop-filter: blur(12px);
          animation: floatBadgeA 6s 1s ease-in-out infinite;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .asc-badge-xp {
          position: absolute;
          bottom: 0px; left: -36px;
          background: rgba(15, 14, 22, 0.92);
          border: 1px solid rgba(99,70,220,0.35);
          border-radius: 12px;
          padding: 7px 13px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: #a78bfa;
          font-family: 'Sora', sans-serif;
          backdrop-filter: blur(12px);
          animation: floatBadgeB 7s 2.5s ease-in-out infinite;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }

        /* ── Stats strip ─────────────────────────────────── */
        .asc-stats {
          display: flex;
          gap: 32px;
          position: relative;
          z-index: 2;
          animation: fadeUp 0.6s 0.2s ease both;
        }

        .asc-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .asc-stat-num {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: -0.02em;
        }

        .asc-stat-num.orange { color: #ff8c32; }
        .asc-stat-num.purple { color: #a78bfa; }

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

        /* ── Right panel (form — now on left visually via order) ─── */
        .asc-right {
          width: 480px;
          flex-shrink: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          overflow-y: auto;
          background: rgba(10, 11, 20, 0.9);
          border-right: none;
          border-left: 1px solid rgba(99, 70, 220, 0.1);
          position: relative;
        }

        .asc-right::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99, 70, 220, 0.6), rgba(255, 140, 50, 0.4), transparent);
        }

        .asc-form-wrap {
          width: 100%;
          max-width: 360px;
          animation: fadeUp 0.5s 0.1s ease both;
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

        /* ── Tab switcher ─────────────────────────────────── */
        .asc-tabs {
          display: flex;
          gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(99, 70, 220, 0.12);
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 36px;
        }

        .asc-tab {
          flex: 1;
          padding: 9px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 7px;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }

        .asc-tab:hover { color: rgba(255,255,255,0.7); }

        .asc-tab.active {
          background: linear-gradient(135deg, rgba(99, 70, 220, 0.3) 0%, rgba(99, 70, 220, 0.15) 100%);
          color: #fff;
          border: 1px solid rgba(99, 70, 220, 0.3);
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
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 7px;
        }

        .asc-field-wrap {
          position: relative;
        }

        .asc-field-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(99, 70, 220, 0.5);
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
          padding: 11px 12px 11px 40px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(99, 70, 220, 0.15);
          border-radius: 8px;
          color: rgba(255,255,255,0.9);
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 400;
          outline: none;
          transition: all 0.2s;
          -webkit-text-fill-color: rgba(255,255,255,0.9);
        }

        .asc-input::placeholder { color: rgba(255,255,255,0.2); }

        .asc-input:focus {
          border-color: rgba(99, 70, 220, 0.45);
          background: rgba(99, 70, 220, 0.07);
          box-shadow: 0 0 0 3px rgba(99, 70, 220, 0.08);
        }

        .asc-input:-webkit-autofill,
        .asc-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0c0d1a inset;
          -webkit-text-fill-color: rgba(255,255,255,0.9);
          caret-color: rgba(255,255,255,0.9);
        }

        .asc-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(99, 70, 220, 0.4);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .asc-eye-btn:hover { color: rgba(99, 70, 220, 0.8); }

        .asc-eye-btn svg {
          width: 15px; height: 15px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .asc-input.has-eye { padding-right: 40px; }

        .asc-forgot {
          display: block;
          text-align: right;
          margin-top: 7px;
          font-size: 11px;
          color: rgba(99, 70, 220, 0.8);
          cursor: pointer;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }

        .asc-forgot:hover { color: #a78bfa; }

        /* ── CTA button ─────────────────────────────────── */
        .asc-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #6346dc 0%, #4f35b8 100%);
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(99, 70, 220, 0.25);
        }

        .asc-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99, 70, 220, 0.38);
        }

        .asc-btn:active:not(:disabled) { transform: translateY(0); }
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
          color: rgba(255,255,255,0.4);
        }

        .asc-switch button {
          background: none;
          border: none;
          color: #a78bfa;
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          transition: color 0.2s;
        }

        .asc-switch button:hover { color: #c4b5fd; }

        /* ── XP bar decoration ─────────────────────────────────── */
        .asc-xp-bar {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .asc-xp-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .asc-xp-label span {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .asc-xp-label .l { color: rgba(255,255,255,0.3); }
        .asc-xp-label .r { color: #ff8c32; }

        .asc-xp-track {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }

        .asc-xp-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #6346dc, #ff8c32);
          border-radius: 99px;
          transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ── Responsive ─────────────────────────────────── */
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
            border-bottom: 1px solid rgba(99, 70, 220, 0.1);
            padding: 40px 28px 36px;
            overflow-y: auto;
          }
          .asc-right::before { top: auto; bottom: 0; background: linear-gradient(90deg, transparent, rgba(99, 70, 220, 0.4), transparent); }
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
            <div className="asc-hero-tag">Produtividade gamificada</div>
            <h1 className="asc-hero-title">
              Evolua
              <br />
              <span>todo dia.</span>
            </h1>
            <p className="asc-hero-sub">
              Transforme hábitos, tarefas e metas em progresso real — com XP,
              streaks e conquistas que te mantêm no ritmo.
            </p>
          </div>

          {/* Mock app card */}
          <div className="asc-mock-scene">
            <div className="asc-mock-card">
              {/* Floating badges */}
              <div className="asc-badge-streak">
                🔥 <span>12 dias</span>
              </div>
              <div className="asc-badge-xp">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#a78bfa",
                    display: "inline-block",
                    boxShadow: "0 0 6px #a78bfa",
                  }}
                />
                +240 XP hoje
              </div>

              {/* Card header */}
              <div className="asc-mock-header">
                <span className="asc-mock-title">Progresso do Dia</span>
                <span className="asc-mock-level">Nv 4</span>
              </div>

              {/* Progress ring row */}
              <div className="asc-mock-ring-row">
                <div className="asc-ring-wrap">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <defs>
                      <linearGradient
                        id="ringGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#6346dc" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="26"
                      cy="26"
                      r="22"
                      fill="none"
                      stroke="url(#ringGrad)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="138"
                      strokeDashoffset="35"
                    />
                  </svg>
                  <div className="asc-ring-label">75%</div>
                </div>
                <div className="asc-progress-info">
                  <p className="pi-label">Dia quase perfeito</p>
                  <p className="pi-sub">3 hábitos restantes</p>
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
                    style={{ background: "#a78bfa" }}
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
                    style={{ background: "#ff8c32" }}
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
                <div className="asc-streak-pill">🔥 12 dias</div>
                <span className="asc-xp-gained">+240 XP</span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="asc-stats">
            <div className="asc-stat">
              <span className="asc-stat-num purple">XP</span>
              <span className="asc-stat-label">Sistema de níveis</span>
            </div>
            <div className="asc-divider-v" />
            <div className="asc-stat">
              <span className="asc-stat-num orange">🔥</span>
              <span className="asc-stat-label">Streaks diários</span>
            </div>
            <div className="asc-divider-v" />
            <div className="asc-stat">
              <span className="asc-stat-num" style={{ color: "#4ade80" }}>
                ∞
              </span>
              <span className="asc-stat-label">Hábitos & Metas</span>
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
