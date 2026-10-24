import type { ReactNode } from "react";
import { Linking, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";
import { notifyError } from "@/lib/notifications";
import { isProSection, SECTIONS, type Section } from "@/navigation";
import { useTheme } from "@/theme";
import { Button, Card, Screen, Txt } from "./ui";

// Mesma lista do UpgradeModal do web.
const BENEFITS = [
  "Tarefas ilimitadas",
  "Hábitos ilimitados",
  "Metas ilimitadas",
  "Todas as áreas desbloqueadas",
  "Futuras funcionalidades premium",
  "Sincronização avançada",
  "Analytics avançado",
];

export function openCheckout(email?: string | null) {
  const checkoutUrl = process.env.EXPO_PUBLIC_CAKTO_CHECKOUT_URL;
  if (!checkoutUrl) {
    notifyError("Checkout indisponível", "EXPO_PUBLIC_CAKTO_CHECKOUT_URL não configurada.");
    return;
  }
  const url = new URL(checkoutUrl);
  if (email) url.searchParams.set("email", email);
  void Linking.openURL(url.toString());
}

export function UpgradeCard() {
  const theme = useTheme();
  const { user } = useAuth();
  return (
    <Card tone="violet" style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name="flash" size={22} color={theme.primary} />
        <Txt variant="h2">
          Ascend <Txt variant="h2" color={theme.primary}>PRO</Txt>
        </Txt>
      </View>
      <View style={{ gap: 8 }}>
        {BENEFITS.map(benefit => (
          <View key={benefit} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
            <Txt variant="body">{benefit}</Txt>
          </View>
        ))}
      </View>
      <Button label="Assinar Pro agora" icon="flash" onPress={() => openCheckout(user?.email)} />
    </Card>
  );
}

// Envolve uma tela PRO: usuários Free veem o convite de upgrade (ProAccessGate do web).
export function ProGate({ section, children }: { section: Section; children: ReactNode }) {
  const { isPro } = useAuth();
  const theme = useTheme();
  if (isPro || !isProSection(section)) return <>{children}</>;

  const label = SECTIONS.find(item => item.id === section)?.label ?? "Este recurso";
  return (
    <Screen title={label}>
      <View style={{ alignItems: "center", gap: 12, marginVertical: 24 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primarySoft,
            borderWidth: 1,
            borderColor: theme.primary,
          }}
        >
          <Ionicons name="lock-closed" size={36} color={theme.primary} />
        </View>
        <Txt variant="h2" style={{ textAlign: "center" }}>
          {label} é um recurso Pro
        </Txt>
        <Txt muted style={{ textAlign: "center" }}>
          Faça o upgrade para o Pro para desbloquear este recurso.
        </Txt>
      </View>
      <UpgradeCard />
    </Screen>
  );
}
