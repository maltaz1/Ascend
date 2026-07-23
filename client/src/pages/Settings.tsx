import React, { useEffect, useState } from "react";
import {
  User,
  Palette,
  Bell,
  Cloud,
  Shield,
  Info,
  LogOut,
  Sparkles,
  Database,
  Lock,
  Save,
  Mail,
  CreditCard,
  XCircle,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notifications";

import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { CancellationModal } from "@/components/CancellationModal";
import { CancellationStatusCard } from "@/components/CancellationStatusCard";
import { getPendingCancellationRequest, CancellationRequest } from "@/lib/cancellation";

const defaultAvatar = "/user-anon.jpg";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    avatar: defaultAvatar,
    isPro: false,
  });

  const [notifications, setNotifications] = useState({
    habits: true,
    tasks: true,
    academy: true,
  });

  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<CancellationRequest | null>(null);

  useEffect(() => {
    loadProfile();
    loadPendingCancellation();
  }, []);

  async function loadPendingCancellation() {
    const request = await getPendingCancellationRequest();
    setPendingRequest(request);
  }

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        name: data.name || "",
        bio: data.bio || "",
        avatar: data.avatar_url || defaultAvatar,
        isPro: data.is_pro || false,
      });
    }
  }

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      bio: profile.bio,
      avatar_url: profile.avatar,
    });

    notifySuccess("Perfil salvo!");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  const handleSupportContact = () => {
    window.location.href = "mailto:ascendprod1@gmail.com";
  };

  const handleCancellationRequest = () => {
    setIsCancellationModalOpen(true);
  };

  function toggleNotification(type: keyof typeof notifications) {
    setNotifications({
      ...notifications,
      [type]: !notifications[type],
    });
  }

  function toggleAnimations() {
    setAnimationsEnabled(!animationsEnabled);
  }

  const cardClass =
    "bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 hover:border-[#3B82F6]/40 hover:bg-zinc-800/60 transition-all";

  async function resetPassword() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      notifyError("Usuário não encontrado");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      notifyError("Erro ao enviar e-mail", "Tente novamente mais tarde.");
      return;
    }

    notifySuccess("E-mail de redefinição enviado!");
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0];

      if (!file) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        notifyError("Usuário não encontrado");
        return;
      }

      const fileExt = file.name.split(".").pop();

      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const filePath = `Avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("Avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);

        notifyError(uploadError.message);

        return;
      }

      const { data } = supabase.storage.from("Avatars").getPublicUrl(filePath);

      setProfile(prev => ({
        ...prev,
        avatar: data.publicUrl,
      }));

      notifySuccess("Imagem enviada!");
    } catch (error) {
      console.error(error);

      notifyError("Erro ao enviar imagem", "Tente novamente mais tarde.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">⚙️ Configurações</h1>

          <p className="text-zinc-400">
            Personalize sua experiência no Ascend, gerencie sua conta e aproveite ao máximo nossos recursos!
          </p>
        </div>

        {/* PERFIL TOP */}
        <div
          className={`rounded-3xl p-6 mb-8 border ${
            profile.isPro
              ? "bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700"
              : "bg-zinc-900 border-zinc-800"
          } shadow-xl shadow-black/40`}
        >
          <div className="flex items-center gap-5">
            <img
              src={profile.avatar}
              className="w-24 h-24 rounded-full border-2 border-zinc-700"
            />

            <div>
              <h2 className="text-2xl font-bold">
                🔥 {profile.name || "Usuário"}
              </h2>

              <p className="text-zinc-400 mt-1">
                {profile.bio || "Sem bio definida"}
              </p>

              <div
                className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border uppercase ${
                  profile.isPro
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {profile.isPro && <Sparkles size={12} className="mr-1" />}
                {profile.isPro ? "Ascend PRO" : "Ascend Free"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* PERFIL */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <User className="text-[#3B82F6]" />
              <h2 className="text-2xl font-bold">👤 Perfil</h2>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={profile.name}
                onChange={e =>
                  setProfile({
                    ...profile,
                    name: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3"
              />

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={profile.avatar}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#3B82F6]"
                  />

                  <label className="cursor-pointer bg-[#3B82F6] hover:bg-[#2563EB] transition-all px-5 py-3 rounded-2xl font-semibold text-white">
                    Escolher Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                <p className="text-sm text-zinc-400">PNG, JPG ou WEBP</p>
              </div>

              <textarea
                rows={4}
                placeholder="Sua bio"
                value={profile.bio}
                onChange={e =>
                  setProfile({
                    ...profile,
                    bio: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 resize-none"
              />

              <button
                onClick={saveProfile}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/30"
              >
                <Save size={18} />
                Salvar Perfil
              </button>
            </div>
          </motion.div>

          {/* APARÊNCIA */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <Palette className="text-pink-400" />
              <h2 className="text-2xl font-bold">🎨 Aparência</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                <div>
                  <p className="font-medium">Animações</p>

                  <p className="text-sm text-zinc-400">
                    Ativar efeitos visuais
                  </p>
                </div>

                <button
                  onClick={toggleAnimations}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    animationsEnabled
                      ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20"
                      : "bg-zinc-700"
                  }`}
                >
                  {animationsEnabled ? "Ativado" : "Desativado"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* NOTIFICAÇÕES */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <Bell className="text-blue-400" />
              <h2 className="text-2xl font-bold">🔔 Notificações</h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "habits",
                  label: "Hábitos",
                },
                {
                  key: "tasks",
                  label: "Tarefas",
                },
                {
                  key: "academy",
                  label: "Academia",
                },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
                >
                  <span>{item.label}</span>

                  <button
                    onClick={() =>
                      toggleNotification(item.key as keyof typeof notifications)
                    }
                    className={`w-14 h-7 rounded-full relative transition-all ${
                      notifications[item.key as keyof typeof notifications]
                        ? "bg-[#3B82F6] shadow-lg shadow-[#3B82F6]/30"
                        : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                        notifications[item.key as keyof typeof notifications]
                          ? "right-1"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CONTA */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <Shield className="text-red-400" />
              <h2 className="text-2xl font-bold">🔐 Conta</h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={resetPassword}
                className="w-full flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 hover:border-[#3B82F6]/40 transition-all"
              >
                <Lock />
                Alterar senha
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl p-4"
              >
                <LogOut />
                Sair da conta
              </button>
            </div>
          </motion.div>

          {/* CONTA E SUPORTE */}
          <div className="pt-4 mb-2">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1">Conta e Suporte</h2>
          </div>

          {/* CONTATO */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <Mail className="text-blue-400" />
              <h2 className="text-2xl font-bold">📧 Contato</h2>
            </div>

            <div className="space-y-4">
              <p className="text-zinc-400 text-sm">
                Entre em contato caso tenha dúvidas, sugestões ou precise de ajuda.
              </p>

              <button
                onClick={handleSupportContact}
                className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-4 hover:border-blue-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Mail size={18} className="text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-zinc-200">ascendprod1@gmail.com</p>
                    <p className="text-xs text-zinc-500">Clique para enviar um e-mail</p>
                  </div>
                </div>
                <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all">
                  Enviar e-mail
                </div>
              </button>
            </div>
          </motion.div>

          {/* ASSINATURA (Apenas PRO) */}
          {profile.isPro && (
            <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
              <div className="flex items-center gap-3 mb-5">
                <CreditCard className="text-emerald-400" />
                <h2 className="text-2xl font-bold">💎 Assinatura</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <span className="text-zinc-400">Plano</span>
                  <span className="font-bold text-emerald-400">Ascend PRO</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <span className="text-zinc-400">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-emerald-500">Ativo</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SOLICITAR CANCELAMENTO (Apenas PRO) */}
          {profile.isPro && (
            <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
              <div className="flex items-center gap-3 mb-5">
                <XCircle className="text-red-400" />
                <h2 className="text-2xl font-bold">⚠️ Cancelamento</h2>
              </div>

              <div className="space-y-4">
                {pendingRequest ? (
                  <CancellationStatusCard 
                    request={pendingRequest} 
                    onCancelSuccess={loadPendingCancellation} 
                  />
                ) : (
                  <>
                    <p className="text-zinc-400 text-sm">
                      Seu acesso ao Ascend PRO continuará disponível até o final do período já pago.
                    </p>

                    <button
                      onClick={handleCancellationRequest}
                      className="w-full flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 hover:bg-red-500/20 transition-all font-bold justify-center"
                    >
                      <XCircle size={18} />
                      Solicitar cancelamento
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* SOBRE */}
          <motion.div whileHover={{ scale: 1.01 }} className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <Info className="text-zinc-300" />
              <h2 className="text-2xl font-bold">📱 Sobre</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <span>Versão do app</span>
                <span className="text-zinc-400">1.0.0</span>
              </div>

              <div className="flex justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <span>Status</span>
                <span className="text-[#3B82F6]">Online</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <CancellationModal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onSuccess={loadPendingCancellation}
      />
    </div>
  );
}
