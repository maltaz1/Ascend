// pages/ResetPassword.tsx


import { useState } from "react";
import { supabase } from "../lib/supabase";
import { notifyError, notifySuccess } from "@/lib/notifications";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const matched = confirm === "" ? null : password === confirm;

  async function updatePassword() {
    if (!password || password !== confirm) return;

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      notifyError(error.message);
    } else {
      notifySuccess("Senha alterada com sucesso");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d12",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "2rem 1rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `
          radial-gradient(ellipse 60% 40% at 80% 20%, rgba(88,66,220,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 20% 80%, rgba(32,178,170,0.12) 0%, transparent 60%)
        `,
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 400,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "2.5rem 2rem",
        boxShadow: "0 0 0 1px rgba(88,66,220,0.1), 0 24px 48px rgba(0,0,0,0.4)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "2rem" }}>
          <img src="/Logo-TaskBar.png" alt="Logo" style={{ width: 128, height: 90 }} />
        </div>  

        <h1 style={{ color: "#f0eeff", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
          Nova senha
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 2rem", lineHeight: 1.5 }}>
          Escolha uma senha forte para proteger sua conta.
        </p>

        {/* Campo senha */}
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
          Nova senha
        </label>
        <div style={{ position: "relative", marginBottom: "1.25rem" }}>
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#f0eeff",
              fontSize: 14, padding: "12px 42px 12px 14px",
              outline: "none", fontFamily: "inherit",
            }}
          />
          <span
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 17 }}
          >
            {showPass ? "🙈" : "👁"}
          </span>
        </div>

        {/* Campo confirmar */}
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
          Confirmar senha
        </label>
        <div style={{ position: "relative", marginBottom: 6 }}>
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#f0eeff",
              fontSize: 14, padding: "12px 42px 12px 14px",
              outline: "none", fontFamily: "inherit",
            }}
          />
          <span
            onClick={() => setShowConfirm(!showConfirm)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 17 }}
          >
            {showConfirm ? "🙈" : "👁"}
          </span>
        </div>

        <div style={{ fontSize: 12, minHeight: 18, marginBottom: 14, color: matched === true ? "#20b2aa" : matched === false ? "#e05c5c" : "transparent" }}>
          {matched === true ? "✓ Senhas coincidem" : matched === false ? "✗ Senhas não coincidem" : "·"}
        </div>

        <button
          onClick={updatePassword}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #5842dc 0%, #20b2aa 100%)",
            border: "none", borderRadius: 10, color: "white",
            fontSize: 14, fontWeight: 600, padding: 13,
            cursor: "pointer", letterSpacing: "0.3px", fontFamily: "inherit",
          }}
        >
          Alterar senha
        </button>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "1.5rem 0 1.25rem" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
          ← Voltar para o login
        </div>
      </div>
    </div>
  );
}