import { useEffect, useState } from "react";
import { Image, Linking, Pressable, Switch, View } from "react-native";
import { Alert } from "@/lib/alert";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { updateUserName } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { AVATAR_MAX_BYTES, avatarPath, sniffImageType } from "@/lib/avatar";
import {
  cancelCancellationRequest,
  createCancellationRequest,
  getPendingCancellationRequest,
  type CancellationRequest,
} from "@/lib/cancellation";
import { deleteAccount } from "@/lib/account";
import { manageStoreSubscription } from "@/lib/purchases";
import { exportJson } from "@/lib/exportData";
import { animationsEnabled, setAnimationsEnabled } from "@/lib/motion";
import { notifyError, notifySuccess } from "@/lib/notifications";
import {
  askReminderPermission,
  formatTime,
  loadReminderPrefs,
  REMINDER_INFO,
  REMINDER_KINDS,
  remindersSupported,
  setTaskAlerts,
  syncTaskReminders,
  taskAlertsOn,
  updateReminder,
  type ReminderKind,
} from "@/lib/reminders";
import { IS_DEMO } from "@/demo";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeCard } from "@/components/ProGate";
import { FounderBadge } from "@/components/FounderBadge";
import { founderLabel } from "@/lib/founder";
import { Badge, Button, Card, Divider, Input, Marginalia, Screen, SectionTitle, Sheet, Txt } from "@/components/ui";
import { useTheme, useThemeToggle } from "@/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = "ascendprod1@gmail.com";


// Porta de pages/Settings.tsx.
export default function SettingsScreen() {
  const theme = useTheme();
  const toggleTheme = useThemeToggle();
  const mode = theme.mode;
  const data = useStore();
  const { user, isPro, proSource, founder, signOut } = useAuth();
  const [name, setName] = useState(data.user.name);
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [animations, setAnimations] = useState(animationsEnabled());
  const [reminders, setReminders] = useState(loadReminderPrefs);
  const [taskAlerts, setTaskAlertsState] = useState(taskAlertsOn);
  const [pending, setPending] = useState<CancellationRequest | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isPro && proSource === "cakto" && !IS_DEMO) void getPendingCancellationRequest().then(setPending);
  }, [isPro, proSource]);

  // Carrega nome, bio e foto do perfil (tabela profiles), como o web.
  useEffect(() => {
    if (IS_DEMO || !user) return;
    void supabase
      .from("profiles")
      .select("name, bio, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data: row }) => {
        if (!row) return;
        if (row.name) setName(row.name);
        setBio(row.bio || "");
        setAvatar(row.avatar_url || null);
      });
  }, [user]);

  // "Escolher Foto" do web: envia para o bucket Avatars e usa a URL pública.
  const pickPhoto = async () => {
    if (!user) {
      notifyError("Usuário não encontrado");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const body = await (await fetch(asset.uri)).arrayBuffer();
      if (body.byteLength > AVATAR_MAX_BYTES) {
        notifyError("Imagem muito grande", "Use uma foto de até 2 MB.");
        return;
      }
      // Tipo pelo conteúdo do arquivo, não pela extensão.
      const contentType = sniffImageType(new Uint8Array(body));
      if (!contentType) {
        notifyError("Formato não suportado", "Use uma foto JPG, PNG ou WebP.");
        return;
      }
      const filePath = avatarPath(user.id, contentType);
      const { error } = await supabase.storage.from("Avatars").upload(filePath, body, { upsert: false, contentType });
      if (error) {
        notifyError("Erro ao enviar imagem", "Tente novamente mais tarde.");
        return;
      }
      setAvatar(supabase.storage.from("Avatars").getPublicUrl(filePath).data.publicUrl);
      notifySuccess("Imagem enviada!");
    } catch {
      notifyError("Erro ao enviar imagem", "Tente novamente mais tarde.");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (name.trim() && name.trim() !== data.user.name) updateUserName(name.trim());
    const { error } = await supabase.from("profiles").upsert({ id: user.id, name, bio, avatar_url: avatar });
    if (error) notifyError("Erro ao salvar perfil", error.message);
    else notifySuccess("Perfil salvo!");
  };

  const toggleAnimations = (value: boolean) => {
    setAnimationsEnabled(value);
    setAnimations(value);
  };

  // Liga/desliga um lembrete. Ao ligar, pede a permissão de notificação ao sistema.
  const toggleReminder = async (kind: ReminderKind) => {
    const turningOn = !reminders[kind].on;
    if (turningOn && remindersSupported() && !(await askReminderPermission())) {
      notifyError("Notificações bloqueadas", "Libere as notificações do Ascend nos ajustes do celular.");
      void Linking.openSettings();
      return;
    }
    setReminders(await updateReminder(kind, { on: turningOn }));
  };

  const toggleTaskAlerts = async (value: boolean) => {
    if (value && remindersSupported() && !(await askReminderPermission())) {
      notifyError("Notificações bloqueadas", "Libere as notificações do Ascend nos ajustes do celular.");
      void Linking.openSettings();
      return;
    }
    setTaskAlerts(value);
    setTaskAlertsState(value);
    void syncTaskReminders(data.tasks);
  };

  // Muda o horário em passos de 30 minutos.
  const shiftReminder = async (kind: ReminderKind, minutes: number) => {
    const { hour, minute } = reminders[kind];
    const total = (hour * 60 + minute + minutes + 1440) % 1440;
    setReminders(await updateReminder(kind, { hour: Math.floor(total / 60), minute: total % 60 }));
  };

  const resetPassword = async () => {
    if (!user?.email) {
      notifyError("Usuário não encontrado");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, WEB_URL ? { redirectTo: `${WEB_URL}/reset-password` } : undefined);
    if (error) notifyError("Erro ao enviar e-mail", "Tente novamente mais tarde.");
    else notifySuccess("E-mail de redefinição enviado!");
  };

  // "Solicitar meus dados": junta todas as tabelas do usuário num JSON (como o web).
  const exportData = async () => {
    if (!user) {
      notifyError("Usuário não encontrado.");
      return;
    }
    setExporting(true);
    try {
      const id = user.id;
      const [profile, tasks, goals, habits, workouts, sessions, meals, hydration, diet, financial, notes, folders] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("user_id", id),
        supabase.from("goals").select("*").eq("user_id", id),
        supabase.from("habits").select("*").eq("user_id", id),
        supabase.from("workouts").select("*").eq("user_id", id),
        supabase.from("workout_sessions").select("*").eq("user_id", id),
        supabase.from("meals").select("*").eq("user_id", id),
        supabase.from("hydration_logs").select("*").eq("user_id", id),
        supabase.from("diet_settings").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("financial_transactions").select("*").eq("user_id", id),
        supabase.from("notes").select("*").eq("user_id", id),
        supabase.from("note_folders").select("*").eq("user_id", id),
      ]);
      await exportJson(`ascend-dados-${new Date().toISOString().split("T")[0]}.json`, {
        exportDate: new Date().toISOString(),
        userInfo: { id: user.id, email: user.email, createdAt: user.created_at },
        profile: profile.data,
        tasks: tasks.data || [],
        goals: goals.data || [],
        habits: habits.data || [],
        workouts: workouts.data || [],
        workoutSessions: sessions.data || [],
        meals: meals.data || [],
        hydration: hydration.data || [],
        dietSettings: diet.data,
        financialTransactions: financial.data || [],
        notes: notes.data || [],
        noteFolders: folders.data || [],
      });
      notifySuccess("Dados exportados com sucesso!");
    } catch {
      notifyError("Erro ao exportar dados. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const requestCancel = async () => {
    setBusy(true);
    const { error } = await createCancellationRequest(reason);
    setBusy(false);
    if (error) {
      notifyError("Erro ao enviar solicitação", error.message);
      return;
    }
    notifySuccess("Solicitação de cancelamento enviada");
    setShowCancel(false);
    setPending(await getPendingCancellationRequest());
  };

  const undoCancel = async () => {
    if (!pending) return;
    const { error } = await cancelCancellationRequest(pending.id);
    if (error) notifyError("Erro ao desfazer", error.message);
    else setPending(null);
  };

  const confirmDelete = async () => {
    if (!password.trim()) {
      notifyError("Confirme sua senha antes de excluir a conta.");
      return;
    }
    setBusy(true);
    const { error } = await deleteAccount(password);
    setBusy(false);
    if (error) {
      notifyError(error);
      return;
    }
    notifySuccess("Conta excluída com sucesso. Seus dados foram removidos.");
  };

  const askDelete = () =>
    Alert.alert("Excluir Conta", "ATENÇÃO: Esta ação é irreversível.\n\nDeseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Continuar", style: "destructive", onPress: () => setShowDelete(true) },
    ]);

  const confirmSignOut = () =>
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);

  const link = (label: string, sub: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{label}</Txt>
        <Txt variant="caption" muted>
          {sub}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.inkMuted} />
    </Pressable>
  );

  const toggleRow = (label: string, sub: string | undefined, value: boolean, onChange: (v: boolean) => void) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{label}</Txt>
        {sub ? (
          <Txt variant="caption" muted>
            {sub}
          </Txt>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary, false: theme.track }} thumbColor="#fff" {...({ activeThumbColor: "#fff" } as object)} />
    </View>
  );

  return (
    <Screen title="Configurações">
      <Marginalia index="14">Ajustes</Marginalia>
      <Txt muted>Ajuste o caderno ao seu jeito.</Txt>

      <Card tone={isPro ? "violet" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: theme.border }} />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
              <Txt variant="h1" color="#fff">
                {(name || "U").charAt(0).toUpperCase()}
              </Txt>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="h2">{name || "Usuário"}</Txt>
            <Txt variant="caption" muted numberOfLines={2}>
              {bio || "Sem bio definida"}
            </Txt>
            <View style={{ alignSelf: "flex-start" }}>
              <Badge label={isPro ? "Ascend PRO" : "Ascend Free"} solid={isPro} />
            </View>
          </View>
        </View>
      </Card>

      <SectionTitle>Perfil</SectionTitle>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: theme.primary }} />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: theme.primary, backgroundColor: theme.raised }} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Button label="Escolher Foto" icon="image-outline" compact onPress={() => void pickPhoto()} loading={uploading} />
            <Txt variant="caption" muted>
              PNG, JPG ou WEBP
            </Txt>
          </View>
        </View>
        <Txt muted>{user?.email}</Txt>
        <Input label="Nome" placeholder="Nome" value={name} onChangeText={setName} />
        <Input label="Bio" placeholder="Sua bio" value={bio} onChangeText={setBio} multiline />
        <Button label="Salvar Perfil" icon="save-outline" onPress={saveProfile} />
      </Card>

      {founder ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <FounderBadge number={founder.number} size={88} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">Fundador {founderLabel(founder.number)}</Txt>
              <Txt variant="caption" muted>
                Você estava na lista de espera do lançamento. Esse selo é seu pra sempre.
              </Txt>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionTitle>Aparência</SectionTitle>
      <Card style={{ gap: 4 }}>
        {toggleRow("Tema do caderno", mode === "dark" ? "Ledger Noturno — papel escuro" : "Day Ledger — papel diurno", mode === "dark", () => toggleTheme())}
        <Divider />
        {toggleRow("Animações", "Ativar efeitos visuais", animations, toggleAnimations)}
      </Card>

      <SectionTitle>Lembretes</SectionTitle>
      <Card style={{ gap: 4 }}>
        <Txt variant="caption" muted style={{ paddingBottom: 6 }}>
          {remindersSupported()
            ? "Aparecem só na bandeja de notificações do celular, sem som e sem vibrar."
            : "Os lembretes funcionam no app instalado no celular."}
        </Txt>
        {toggleRow("Tarefas com horário", "Avisa na hora marcada de cada tarefa", taskAlerts, value => void toggleTaskAlerts(value))}
        <Divider />
        {REMINDER_KINDS.map((kind, index) => {
          const setting = reminders[kind];
          return (
            <View key={kind}>
              {index > 0 ? <Divider /> : null}
              {toggleRow(REMINDER_INFO[kind].label, REMINDER_INFO[kind].sub, setting.on, () => void toggleReminder(kind))}
              {setting.on ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 8 }}>
                  <Txt variant="caption" muted style={{ flex: 1 }}>
                    Todo dia às
                  </Txt>
                  <Pressable accessibilityLabel="Antecipar 30 minutos" onPress={() => void shiftReminder(kind, -30)} hitSlop={8}>
                    <Ionicons name="remove-circle-outline" size={26} color={theme.primary} />
                  </Pressable>
                  <Txt variant="bodyStrong" style={{ minWidth: 52, textAlign: "center" }}>
                    {formatTime(setting.hour, setting.minute)}
                  </Txt>
                  <Pressable accessibilityLabel="Adiar 30 minutos" onPress={() => void shiftReminder(kind, 30)} hitSlop={8}>
                    <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionTitle>Privacidade e Dados</SectionTitle>
      <Card style={{ gap: 0 }}>
        {link("Política de Privacidade", "Como protegemos seus dados", "shield-checkmark-outline", () =>
          WEB_URL ? void Linking.openURL(`${WEB_URL}/privacy`) : undefined
        )}
        <Divider />
        {link("Termos de Uso", "Regras para utilização do app", "document-outline", () =>
          WEB_URL ? void Linking.openURL(`${WEB_URL}/terms`) : undefined
        )}
        <Divider />
        {link("Solicitar meus dados", exporting ? "Gerando exportação..." : "Baixar cópia de todos os seus dados", "download-outline", () => {
          if (!exporting) void exportData();
        })}
      </Card>
      <Button label="Excluir Conta" variant="danger" icon="trash-outline" onPress={askDelete} />

      <SectionTitle>Conta</SectionTitle>
      <Card style={{ gap: 0 }}>
        {link("Alterar senha", "Enviamos um link para o seu e-mail", "lock-closed-outline", () => void resetPassword())}
        <Divider />
        {link("Conquistas", "Suas medalhas e XP total", "trophy-outline", () => router.push("/achievements"))}
      </Card>
      <Button label="Sair da conta" variant="ghost" icon="log-out-outline" onPress={confirmSignOut} />

      <SectionTitle>Conta e Suporte</SectionTitle>
      <Card style={{ gap: 0 }}>
        <Txt variant="caption" muted style={{ paddingBottom: 6 }}>
          Entre em contato caso tenha dúvidas ou sugestões.
        </Txt>
        {link(SUPPORT_EMAIL, "Toque para enviar um e-mail", "mail-outline", () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`))}
      </Card>

      <SectionTitle>Assinatura</SectionTitle>
      {isPro ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt muted>Plano</Txt>
            <Txt variant="bodyStrong" color={theme.success}>
              {proSource === "founder" ? "PRO de Fundador" : "Ascend PRO"}
            </Txt>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Txt muted>Status</Txt>
            <Badge label="Ativo" solid color={theme.success} />
          </View>
          {proSource === "founder" ? (
            <Txt variant="caption" muted>
              {founder?.proUntil
                ? `Grátis até ${new Date(founder.proUntil).toLocaleDateString("pt-BR")}. Depois disso, você pode assinar e continua com o selo.`
                : "Presente de quem estava na lista de espera."}
            </Txt>
          ) : proSource === "store" ? (
            <Button
              label="Gerenciar assinatura"
              variant="ghost"
              compact
              onPress={() => void manageStoreSubscription().catch(() => notifyError("Não foi possível abrir as assinaturas da loja"))}
            />
          ) : pending ? (
            <>
              <Txt variant="label" color={theme.warning}>
                Cancelamento solicitado em {new Date(pending.created_at).toLocaleDateString("pt-BR")}. Aguardando processamento.
              </Txt>
              <Button label="Desfazer solicitação" variant="ghost" compact onPress={undoCancel} />
            </>
          ) : (
            <>
              <Txt variant="caption" muted>
                Seu acesso ao Ascend PRO continuará disponível até o final do período já pago.
              </Txt>
              <Button label="Solicitar cancelamento" variant="ghost" icon="close-circle-outline" compact onPress={() => setShowCancel(true)} />
            </>
          )}
        </Card>
      ) : (
        <UpgradeCard />
      )}

      <SectionTitle>Sobre</SectionTitle>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt>Versão do app</Txt>
          <Txt muted>{Constants.expoConfig?.version ?? "1.0.0"}</Txt>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt>Status</Txt>
          <Txt variant="bodyStrong" color={theme.primary}>
            Online
          </Txt>
        </View>
      </Card>

      <Sheet visible={showCancel} onClose={() => setShowCancel(false)} title="Cancelar assinatura">
        <Txt muted>Conte o motivo (opcional). Sua solicitação será processada pela equipe.</Txt>
        <Input value={reason} onChangeText={setReason} placeholder="Motivo" multiline />
        <Button label="Enviar solicitação" variant="danger" onPress={requestCancel} loading={busy} />
      </Sheet>

      <Sheet visible={showDelete} onClose={() => setShowDelete(false)} title="Excluir conta">
        <Txt muted>Confirme sua senha antes de excluir.</Txt>
        <Input value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry autoComplete="current-password" />
        <Button label="Confirmar exclusão" variant="danger" onPress={confirmDelete} loading={busy} disabled={!password.trim()} />
        <Button
          label="Cancelar"
          variant="ghost"
          onPress={() => {
            setShowDelete(false);
            setPassword("");
          }}
        />
      </Sheet>
    </Screen>
  );
}
