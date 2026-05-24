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
} from "lucide-react";

import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const defaultAvatar = "/user-anon.jpg";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    avatar: defaultAvatar,
  });

  const [notifications, setNotifications] = useState({
    habits: true,
    tasks: true,
    academy: true,
  });

  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

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
        avatar:
          data.avatar_url ||
          defaultAvatar,
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

    alert("Perfil salvo!");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

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
      alert("Usuário não encontrado");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert("Erro ao enviar email");
      return;
    }

    alert("Email de redefinição enviado!");
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0];

      if (!file) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Usuário não encontrado");
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

        alert(uploadError.message);

        return;
      }

      const { data } = supabase.storage.from("Avatars").getPublicUrl(filePath);

      setProfile(prev => ({
        ...prev,
        avatar: data.publicUrl,
      }));

      alert("Imagem enviada!");
    } catch (error) {
      console.error(error);

      alert("Erro ao enviar imagem");
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">⚙️ Configurações</h1>

          <p className="text-zinc-400">
            Personalize sua experiência no FlowZone
          </p>
        </div>

        {/* PERFIL TOP */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-3xl p-6 mb-8">
          <div className="flex items-center gap-5">
            <img
              src={profile.avatar}
              className="w-24 h-24 rounded-full border-4 border-amber-500"
            />

            <div>
              <h2 className="text-2xl font-bold">
                🔥 {profile.name || "Usuário"}
              </h2>

              <p className="text-zinc-400 mt-1">
                {profile.bio || "Sem bio definida"}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm">
                <Sparkles size={14} />
                Premium Productivity
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
    </div>
  );
}
