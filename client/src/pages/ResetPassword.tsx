// pages/ResetPassword.tsx


import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      notifyError("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      notifyError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        notifyError(error.message);
      } else {
        notifySuccess("Senha atualizada com sucesso!");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    } catch (err) {
      notifyError("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E1C] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[32px] backdrop-blur-2xl relative z-10 shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-blue-500" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Nova Senha</h1>
          <p className="text-zinc-400 text-sm">Escolha uma senha forte para proteger sua conta.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Confirmar Senha</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Salvando...
              </>
            ) : (
              "Alterar Senha"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <button 
            onClick={() => window.location.href = "/"}
            className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all text-sm w-full"
          >
            <ArrowLeft size={16} />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
}