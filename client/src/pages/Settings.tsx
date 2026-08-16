import React, { useEffect, useState } from "react";
import {
 User,
 Palette,
 Sun,
 Moon,
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
 Download,
 Trash2,
 FileText,
 ExternalLink,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useTheme } from "@/contexts/ThemeContext";

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
 const [deletingAccount, setDeletingAccount] = useState(false);
 const [exportingData, setExportingData] = useState(false);
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
 "ledger-paper !rounded-md";

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

 const [reauthPassword, setReauthPassword] = useState("");
 const [showReauthDialog, setShowReauthDialog] = useState(false);

 async function handleDeleteAccount() {
 if (!reauthPassword.trim()) {
 notifyError("Confirme sua senha antes de excluir a conta.");
 setShowReauthDialog(true);
 return;
 }

 setShowReauthDialog(false);
 setDeletingAccount(true);
 try {
 const {
 data: { session },
 } = await supabase.auth.getSession();
 if (!session) {
 notifyError("Sessão expirada. Faça login novamente.");
 setDeletingAccount(false);
 return;
 }

 const url = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "");
 const projectRef = url.replace("https://", "").split(".")[0];
 const res = await fetch(
 `https://${projectRef}.functions.${url
 .replace("https://", "")
 .split(".")
 .slice(1)
 .join(".")}/delete-account`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${session.access_token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({ password: reauthPassword.trim() }),
 }
 );

 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 const msg =
 (err as { error?: string }).error ===
 "Re-authentication failed; account not deleted"
 ? "Senha incorreta. A conta não foi excluída."
 : "Erro ao excluir conta. Tente novamente.";
 notifyError(msg);
 setDeletingAccount(false);
 return;
 }

 localStorage.removeItem("flowzone_data");
 localStorage.removeItem("ascend_app_state");
 localStorage.removeItem("ascend_schema_version");

 await supabase.auth.signOut();
 notifySuccess("Conta excluída com sucesso. Seus dados foram removidos.");
 setTimeout(() => {
 window.location.href = "/";
 }, 1000);
 } catch (error) {
 console.error("Erro ao excluir conta:", error);
 notifyError("Erro ao excluir conta. Tente novamente.");
 } finally {
 setDeletingAccount(false);
 }
 }

 async function handleExportData() {
 setExportingData(true);
 try {
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 notifyError("Usuário não encontrado.");
 setExportingData(false);
 return;
 }
 const userId = user.id;

 const [profileResult, tasksResult, goalsResult, habitsResult, workoutsResult, sessionsResult, mealsResult, hydrationResult, dietResult, financialResult, notesResult, foldersResult] = await Promise.all([
 supabase.from("profiles").select("*").eq("id", userId).single(),
 supabase.from("tasks").select("*").eq("user_id", userId),
 supabase.from("goals").select("*").eq("user_id", userId),
 supabase.from("habits").select("*").eq("user_id", userId),
 supabase.from("workouts").select("*").eq("user_id", userId),
 supabase.from("workout_sessions").select("*").eq("user_id", userId),
 supabase.from("meals").select("*").eq("user_id", userId),
 supabase.from("hydration_logs").select("*").eq("user_id", userId),
 supabase.from("diet_settings").select("*").eq("user_id", userId).maybeSingle(),
 supabase.from("financial_transactions").select("*").eq("user_id", userId),
 supabase.from("notes").select("*").eq("user_id", userId),
 supabase.from("note_folders").select("*").eq("user_id", userId),
 ]);

 const exportData = {
 exportDate: new Date().toISOString(),
 userInfo: {
 id: user.id,
 email: user.email,
 createdAt: user.created_at,
 },
 profile: profileResult.data,
 tasks: tasksResult.data || [],
 goals: goalsResult.data || [],
 habits: habitsResult.data || [],
 workouts: workoutsResult.data || [],
 workoutSessions: sessionsResult.data || [],
 meals: mealsResult.data || [],
 hydration: hydrationResult.data || [],
 dietSettings: dietResult.data,
 financialTransactions: financialResult.data || [],
 notes: notesResult.data || [],
 noteFolders: foldersResult.data || [],
 };

 const blob = new Blob([JSON.stringify(exportData, null, 2)], {
 type: "application/json",
 });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `ascend-dados-${new Date().toISOString().split("T")[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);

 notifySuccess("Dados exportados com sucesso!");
 } catch (error) {
 console.error("Erro ao exportar dados:", error);
 notifyError("Erro ao exportar dados. Tente novamente.");
 } finally {
 setExportingData(false);
 }
 }

 const { theme, toggleTheme } = useTheme();

 return (
 <div className="min-h-screen bg-background text-white"><div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-12">
 {/* HEADER — folha solta de caderno */}
 <div className="notebook-sheet notebook-sheet--margined mb-8"><div className="ledger-marginalia mb-2">14 — Ajustes</div><h1 className="text-3xl font-bold mb-2" style={{ color: "var(--ink)", fontFamily: "Space Grotesk", letterSpacing: "-0.03em" }}> Configurações</h1><p style={{ fontFamily: "DM Sans", fontSize: 13 }}>
 Ajuste o caderno ao seu jeito.
 </p></div>

 {/* PERFIL TOP */}
 <div
 className={`rounded-md p-6 mb-8 border ${
 profile.isPro
 ? "border-[var(--primary)]/50"
 : "border-[var(--ledger-paper-border)]"
 }`} style={{ background: "var(--ledger-paper-bg)", boxShadow: "var(--ledger-paper-shadow, 4px 4px 0 rgba(0,0,0,0.35))" }}
 ><div className="flex items-center gap-5"><img
 src={profile.avatar}
 className="w-24 h-24 rounded-full border-2" style={{ borderColor: "var(--ledger-paper-border)" }}
 /><div><h2 className="text-2xl font-bold">
 {profile.name || "Usuário"}
 </h2><p className="mt-1" style={{ color: "var(--ink-muted)" }}>
 {profile.bio || "Sem bio definida"}
 </p><div
 className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border uppercase ${
 profile.isPro
 ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--ink)]"
 : "text-[var(--ink-muted)] border-[var(--ledger-paper-border)]"
 }`}
 >
 {profile.isPro && <Sparkles size={12} className="mr-1" />}
 {profile.isPro ? "Ascend PRO" : "Ascend Free"}
 </div></div></div></div><div className="space-y-6">
 {/* PERFIL */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><User className="text-[var(--primary)]" /><h2 className="text-2xl font-bold"> Perfil</h2></div><div className="space-y-4"><input
 type="text"
 placeholder="Nome"
 value={profile.name}
 onChange={e =>
 setProfile({
 ...profile,
 name: e.target.value,
 })
 }
 className="w-full rounded-md px-4 py-3 ledger-input-field"
 /><div className="space-y-4"><div className="flex items-center gap-4"><img
 src={profile.avatar}
 className="w-24 h-24 rounded-full object-cover border-4 border-[var(--primary)]"
 /><label className="cursor-pointer bg-[var(--primary)] hover:bg-[#7C3AED] transition-all px-5 py-3 rounded-md font-semibold text-white">
 Escolher Foto
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleImageUpload}
 /></label></div><p className="text-sm text-[var(--ink-muted)]">PNG, JPG ou WEBP</p></div><textarea
 rows={4}
 placeholder="Sua bio"
 value={profile.bio}
 onChange={e =>
 setProfile({
 ...profile,
 bio: e.target.value,
 })
 }
 className="w-full rounded-md px-4 py-3 resize-none ledger-input-field"
 /><button
 onClick={saveProfile}
 className="bg-[var(--primary)] hover:bg-[#7C3AED] text-white font-bold px-5 py-3 rounded-md flex items-center gap-2 transition-all  "
 ><Save size={18} />
 Salvar Perfil
 </button></div></motion.div>

 {/* APARÊNCIA */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Palette className="text-pink-400" /><h2 className="text-2xl font-bold"> Aparência</h2></div><div className="space-y-4"><div className="flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><div><p className="font-medium" style={{ color: "var(--ink)" }}>Tema do caderno</p><p className="text-sm" style={{ color: "var(--ink-muted)" }}>{theme === "dark" ? "Ledger Noturno — papel escuro" : "Day Ledger — papel diurno"}</p></div><button
 onClick={toggleTheme}
 className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
 style={{
 background: theme === "dark" ? "var(--primary)" : "var(--muted)",
 color: theme === "dark" ? "#fff" : "var(--ink)",
 border: theme === "dark" ? "none" : "1px solid var(--ledger-paper-border)",
 }}
 >
 {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
 {theme === "dark" ? "Day Ledger" : "Ledger Noturno"}
 </button></div><div className="flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><div><p className="font-medium" style={{ color: "var(--ink)" }}>Animações</p><p className="text-sm" style={{ color: "var(--ink-muted)" }}>Ativar efeitos visuais</p></div><button
 onClick={toggleAnimations}
 className="px-4 py-2 rounded-xl font-medium transition-all"
 style={{
 background: animationsEnabled ? "var(--primary)" : "var(--muted)",
 color: animationsEnabled ? "#fff" : "var(--ink)",
 border: animationsEnabled ? "none" : "1px solid var(--ledger-paper-border)",
 }}
 >
 {animationsEnabled ? "Ativado" : "Desativado"}
 </button></div></div></motion.div>

 {/* NOTIFICAÇÕES */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Bell className="text-[var(--primary)]" /><h2 className="text-2xl font-bold"> Notificações</h2></div><div className="space-y-3">
 {[
 { key: "habits", label: "Hábitos" },
 { key: "tasks", label: "Tarefas" },
 { key: "academy", label: "Academia" },
 ].map(item => (
 <div
 key={item.key}
 className="flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"
 ><span>{item.label}</span><button
 onClick={() =>
 toggleNotification(item.key as keyof typeof notifications)
 }
 className={`w-14 h-7 rounded-full relative transition-all ${
 notifications[item.key as keyof typeof notifications]
 ? "bg-[var(--primary)] shadow-lg "
 : "bg-[var(--ledger-paper-border)]"
 }`}
 ><div
 className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
 notifications[item.key as keyof typeof notifications]
 ? "right-1"
 : "left-1"
 }`}
 /></button></div>
 ))}
 </div></motion.div>

 {/* PRIVACIDADE E DADOS */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Shield className="text-violet-400" /><h2 className="text-2xl font-bold"> Privacidade e Dados</h2></div><div className="space-y-3"><a
 href="/privacy"
 target="_blank"
 rel="noopener noreferrer"
 className="w-full flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-all group"
 ><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center"><FileText size={18} className="text-violet-400" /></div><div className="text-left"><p className="font-medium" style={{ color: "var(--ink)" }}>Política de Privacidade</p><p className="text-xs text-[var(--ink-muted)]">Como protegemos seus dados</p></div></div><ExternalLink size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] transition-all" /></a><a
 href="/terms"
 target="_blank"
 rel="noopener noreferrer"
 className="w-full flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-all group"
 ><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center"><FileText size={18} className="text-violet-400" /></div><div className="text-left"><p className="font-medium" style={{ color: "var(--ink)" }}>Termos de Uso</p><p className="text-xs text-[var(--ink-muted)]">Regras para utilização do app</p></div></div><ExternalLink size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] transition-all" /></a><button
 onClick={handleExportData}
 disabled={exportingData}
 className="w-full flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-all group disabled:opacity-50"
 ><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-[var(--primary-dark, var(--primary-dark, #7c3aed))]/10 border border-[var(--primary-dark, var(--primary-dark, #7c3aed))]/30 flex items-center justify-center"><Download size={18} className="text-[var(--primary)]" /></div><div className="text-left"><p className="font-medium" style={{ color: "var(--ink)" }}>Solicitar meus dados</p><p className="text-xs" style={{ color: "var(--ink-muted)" }}>
 {exportingData ? "Gerando exportação..." : "Baixar cópia de todos os seus dados"}
 </p></div></div><Download size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--primary)] transition-all" /></button>
 {showReauthDialog && (
 <div className="border border-red-500/30 bg-red-500/5 rounded-md p-4 space-y-3"><p className="text-sm" style={{ color: "oklch(0.55 0.18 25)" }}>Confirme sua senha antes de excluir.</p><input
 type="password"
 autoFocus
 placeholder="Sua senha"
 value={reauthPassword}
 onChange={e => setReauthPassword(e.target.value)}
 onKeyDown={e => e.key === "Enter" && handleDeleteAccount()}
 className="w-full rounded-md px-4 py-3 ledger-input-field"
 /><div className="flex gap-2"><button
 onClick={handleDeleteAccount}
 disabled={deletingAccount || !reauthPassword.trim()}
 className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md px-4 py-3 disabled:opacity-50 transition-all"
 >
 Confirmar exclusão
 </button><button
 onClick={() => { setShowReauthDialog(false); setReauthPassword(""); }}
 className="flex-1 font-bold rounded-md px-4 py-3 transition-all" style={{ background: "var(--muted)", color: "var(--ink)", border: "1px solid var(--ledger-paper-border)" }}
 >
 Cancelar
 </button></div></div>
 )}
 <button
 onClick={() => {
 if (window.confirm("ATENÇÃO: Esta ação é irreversível.\n\nDeseja continuar?")) {
 handleDeleteAccount();
 }
 }}
 disabled={deletingAccount}
 className="w-full flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md p-4 hover:bg-red-500/20 transition-all font-bold disabled:opacity-50"
 ><Trash2 size={18} />
 {deletingAccount ? "Excluindo conta..." : "Excluir Conta"}
 </button></div></motion.div>

 {/* CONTA */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Shield className="text-red-400" /><h2 className="text-2xl font-bold"> Conta</h2></div><div className="space-y-4"><button
 onClick={resetPassword}
 className="w-full flex items-center gap-3 rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-all"
 ><Lock />
 Alterar senha
 </button><button
 onClick={logout}
 className="w-full flex items-center gap-3 rounded-md p-4" style={{ background: "oklch(0.45 0.15 25 / 0.15)", color: "oklch(0.55 0.18 25)", border: "1px solid oklch(0.55 0.18 25 / 0.25)" }}
 ><LogOut />
 Sair da conta
 </button></div></motion.div>

 {/* CONTA E SUPORTE */}
 <div className="pt-4 mb-2"><h2 className="text-sm font-bold uppercase tracking-widest ml-1" style={{ color: "var(--ink-muted)" }}>Conta e Suporte</h2></div>

 {/* CONTATO */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Mail className="text-[var(--primary)]" /><h2 className="text-2xl font-bold"> Contato</h2></div><div className="space-y-4"><p className="text-sm" style={{ color: "var(--ink-muted)" }}>Entre em contato caso tenha dúvidas ou sugestões.</p><button
 onClick={handleSupportContact}
 className="w-full flex items-center justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 transition-all group"
 ><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-[var(--primary-dark, var(--primary-dark, #7c3aed))]/10 border border-[var(--primary-dark, var(--primary-dark, #7c3aed))]/30 flex items-center justify-center"><Mail size={18} className="text-[var(--primary)]" /></div><div className="text-left"><p className="font-medium" style={{ color: "var(--ink)" }}>ascendprod1@gmail.com</p><p className="text-xs" style={{ color: "var(--ink-muted)" }}>Clique para enviar um e-mail</p></div></div><div className="bg-[var(--primary-dark, var(--primary-dark, #7c3aed))] px-4 py-2 rounded-md text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all">
 Enviar e-mail
 </div></button></div></motion.div>

 {/* ASSINATURA (Apenas PRO) */}
 {profile.isPro && (
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><CreditCard className="text-emerald-400" /><h2 className="text-2xl font-bold"> Assinatura</h2></div><div className="space-y-3"><div className="flex justify-between items-center rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><span className="text-[var(--ink-muted)]">Plano</span><span className="font-bold text-emerald-400">Ascend PRO</span></div><div className="flex justify-between items-center rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><span className="text-[var(--ink-muted)]">Status</span><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="font-bold text-emerald-500">Ativo</span></div></div></div></motion.div>
 )}

 {/* SOLICITAR CANCELAMENTO (Apenas PRO) */}
 {profile.isPro && (
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><XCircle className="text-red-400" /><h2 className="text-2xl font-bold"> Cancelamento</h2></div><div className="space-y-4">
 {pendingRequest ? (
 <CancellationStatusCard 
 request={pendingRequest} 
 onCancelSuccess={loadPendingCancellation} 
 />
 ) : (
 <><p className="text-sm" style={{ color: "var(--ink-muted)" }}>
 Seu acesso ao Ascend PRO continuará disponível até o final do período já pago.
 </p><button
 onClick={handleCancellationRequest}
 className="w-full flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md p-4 hover:bg-red-500/20 transition-all font-bold justify-center"
 ><XCircle size={18} />
 Solicitar cancelamento
 </button></>
 )}
 </div></motion.div>
 )}

 {/* SOBRE */}
 <motion.div whileHover={{ scale: 1.01 }} className={cardClass}><div className="flex items-center gap-3 mb-5"><Info className="text-[var(--ink)]" /><h2 className="text-2xl font-bold"> Sobre</h2></div><div className="space-y-3"><div className="flex justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><span>Versão do app</span><span className="text-[var(--ink-muted)]">1.0.0</span></div><div className="flex justify-between rounded-md p-4 border border-[var(--ledger-paper-border)] bg-[var(--muted)]"><span>Status</span><span className="font-semibold" style={{ color: "var(--primary)" }}>Online</span></div></div></motion.div></div></div><CancellationModal
 isOpen={isCancellationModalOpen}
 onClose={() => setIsCancellationModalOpen(false)}
 onSuccess={loadPendingCancellation}
 /></div>
 );
}
