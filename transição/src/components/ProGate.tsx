import { useEffect, useState, type ReactNode } from "react";
import { Linking, Platform, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { PurchasesPackage } from "react-native-purchases";
import { useAuth } from "@/hooks/useAuth";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { buyPro, getProPackages, restorePro, STORE_PURCHASES_ENABLED } from "@/lib/purchases";
import { logger } from "@/lib/logger";
import { isProSection, SECTIONS, type Section } from "@/navigation";
import { useTheme } from "@/theme";
import { Button, Card, Screen, Txt } from "./ui";
import { Corv } from "./Corv";

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

// As lojas (Google Play / App Store) não permitem levar o usuário a pagar uma
// assinatura digital fora delas. No Android/iOS a compra é pela loja
// (RevenueCat); no navegador continua o checkout da Cakto, como no site.
export const CAN_BUY_IN_APP = Platform.OS === "web" || STORE_PURCHASES_ENABLED;

const PACKAGE_LABELS: Record<string, string> = {
  MONTHLY: "Assinar mensal",
  ANNUAL: "Assinar anual",
  SIX_MONTH: "Assinar semestral",
  THREE_MONTH: "Assinar trimestral",
  WEEKLY: "Assinar semanal",
  LIFETIME: "Comprar vitalício",
};

// Botões de compra pela loja, com o preço que a própria loja informa.
function StorePurchaseButtons() {
  const { unlockStorePro } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getProPackages()
      .then(setPackages)
      .catch(err => {
        logger.error("purchases", "Falha ao carregar planos", err);
        setPackages([]);
      });
  }, []);

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(pkg.identifier);
    try {
      if (await buyPro(pkg)) {
        unlockStorePro();
        notifySuccess("Bem-vindo ao Ascend PRO!");
      }
    } catch (err) {
      logger.error("purchases", "Falha na compra", err);
      notifyError("Não foi possível concluir a assinatura", "Tente novamente em instantes.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      if (await restorePro()) {
        unlockStorePro();
        notifySuccess("Assinatura restaurada");
      } else {
        notifyInfo("Nenhuma assinatura encontrada", "Esta conta da loja não tem o Ascend PRO ativo.");
      }
    } catch (err) {
      logger.error("purchases", "Falha ao restaurar", err);
      notifyError("Não foi possível restaurar as compras");
    } finally {
      setBusy(null);
    }
  };

  if (packages === null) return <Button label="Carregando planos..." loading disabled onPress={() => {}} />;

  return (
    <View style={{ gap: 8 }}>
      {packages.length === 0 ? (
        <Txt variant="label" muted>
          Planos indisponíveis no momento.
        </Txt>
      ) : (
        packages.map(pkg => (
          <Button
            key={pkg.identifier}
            label={`${PACKAGE_LABELS[pkg.packageType] ?? "Assinar"} · ${pkg.product.priceString}`}
            icon="flash"
            loading={busy === pkg.identifier}
            disabled={busy !== null}
            onPress={() => void buy(pkg)}
          />
        ))
      )}
      <Button
        label="Restaurar compras"
        variant="ghost"
        compact
        loading={busy === "restore"}
        disabled={busy !== null}
        onPress={() => void restore()}
      />
      <Txt variant="caption" muted>
        Renovação automática. Cancele quando quiser nas assinaturas da {Platform.OS === "ios" ? "App Store" : "Google Play"}.
      </Txt>
    </View>
  );
}

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
      {STORE_PURCHASES_ENABLED ? (
        <StorePurchaseButtons />
      ) : CAN_BUY_IN_APP ? (
        <Button label="Assinar Pro agora" icon="flash" onPress={() => openCheckout(user?.email)} />
      ) : (
        <Txt variant="label" muted>
          Disponível para assinantes Ascend PRO.
        </Txt>
      )}
    </Card>
  );
}

// Envolve uma tela PRO: usuários Free veem o convite de upgrade (ProAccessGate do web).
export function ProGate({ section, children }: { section: Section; children: ReactNode }) {
  const { isPro } = useAuth();
  if (isPro || !isProSection(section)) return <>{children}</>;

  const label = SECTIONS.find(item => item.id === section)?.label ?? "Este recurso";
  return (
    <Screen title={label}>
      <View style={{ alignItems: "center", gap: 12, marginVertical: 24 }}>
        <Corv pose="apontando" size={130} />
        <Txt variant="h2" style={{ textAlign: "center" }}>
          {label} é um recurso Pro
        </Txt>
        <Txt muted style={{ textAlign: "center" }}>
          {CAN_BUY_IN_APP ? "Faça o upgrade para o Pro para desbloquear este recurso." : "Este recurso faz parte do Ascend PRO."}
        </Txt>
      </View>
      <UpgradeCard />
    </Screen>
  );
}
