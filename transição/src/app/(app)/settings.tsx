import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { updateUserName } from "@/lib/store";
import {
  cancelCancellationRequest,
  createCancellationRequest,
  getPendingCancellationRequest,
  type CancellationRequest,
} from "@/lib/cancellation";
import { deleteAccount } from "@/lib/account";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeCard } from "@/components/ProGate";
import { Badge, Button, Card, Divider, Input, Screen, SectionTitle, Sheet, Txt } from "@/components/ui";
import { useTheme } from "@/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = "ascendprod1@gmail.com";

// Porta de pages/Settings.tsx.
export default function SettingsScreen() {
  const theme = useTheme();
  const data = useStore();
  const { user, isPro, signOut } = useAuth();
  const [name, setName] = useState(data.user.name);
  const [pending, setPending] = useState<CancellationRequest | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPro && !IS_DEMO) void getPendingCancellationRequest().then(setPending);
  }, [isPro]);

  const saveName = () => {
    if (!name.trim() || name.trim() === data.user.name) return;
    updateUserName(name.trim());
    notifySuccess("Nome atualizado");
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

  return (
    <Screen title="Configurações">
      <SectionTitle>Perfil</SectionTitle>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt muted>{user?.email}</Txt>
          <Badge label={isPro ? "Ascend PRO" : "Ascend Free"} solid={isPro} />
        </View>
        <Input label="Nome" value={name} onChangeText={setName} onSubmitEditing={saveName} />
        <Button label="Salvar nome" variant="ghost" compact onPress={saveName} />
      </Card>

      <SectionTitle>Plano</SectionTitle>
      {isPro ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt variant="h3">Ascend PRO</Txt>
            <Badge label="Ativo" solid color={theme.success} />
          </View>
          {pending ? (
            <>
              <Txt variant="label" color={theme.warning}>
                Cancelamento solicitado em {new Date(pending.created_at).toLocaleDateString("pt-BR")}. Aguardando processamento.
              </Txt>
              <Button label="Desfazer solicitação" variant="ghost" compact onPress={undoCancel} />
            </>
          ) : (
            <Button label="Solicitar cancelamento" variant="ghost" compact onPress={() => setShowCancel(true)} />
          )}
        </Card>
      ) : (
        <UpgradeCard />
      )}

      <SectionTitle>Conta e suporte</SectionTitle>
      <Card style={{ gap: 0 }}>
        {link("Fale conosco", SUPPORT_EMAIL, "mail-outline", () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`))}
        <Divider />
        {link("Política de Privacidade", "Como protegemos seus dados", "shield-checkmark-outline", () =>
          WEB_URL ? void Linking.openURL(`${WEB_URL}/privacy`) : undefined
        )}
        <Divider />
        {link("Termos de Uso", "Regras para utilização do app", "document-outline", () =>
          WEB_URL ? void Linking.openURL(`${WEB_URL}/terms`) : undefined
        )}
        <Divider />
        {link("Solicitar meus dados", "LGPD — enviaremos por e-mail", "download-outline", () =>
          void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Solicitação de dados (LGPD)`)
        )}
      </Card>

      <Button label="Sair da conta" variant="ghost" icon="log-out-outline" onPress={confirmSignOut} />
      <Button label="Excluir conta" variant="danger" icon="trash-outline" onPress={() => setShowDelete(true)} />
      <Txt variant="caption" muted style={{ textAlign: "center" }}>
        Versão do app {Constants.expoConfig?.version ?? "1.0.0"}
      </Txt>

      <Sheet visible={showCancel} onClose={() => setShowCancel(false)} title="Cancelar assinatura">
        <Txt muted>Conte o motivo (opcional). Sua solicitação será processada pela equipe.</Txt>
        <Input value={reason} onChangeText={setReason} placeholder="Motivo" multiline />
        <Button label="Enviar solicitação" variant="danger" onPress={requestCancel} loading={busy} />
      </Sheet>

      <Sheet visible={showDelete} onClose={() => setShowDelete(false)} title="Excluir conta">
        <Txt muted>Todos os seus dados serão removidos de forma permanente. Confirme sua senha antes de excluir.</Txt>
        <Input value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry autoComplete="current-password" />
        <Button label="Excluir minha conta" variant="danger" onPress={confirmDelete} loading={busy} />
      </Sheet>
    </Screen>
  );
}
