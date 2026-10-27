// Assinatura PRO pelas lojas (Google Play / App Store) via RevenueCat.
// O comprador é identificado com o id do usuário no Supabase; o webhook
// api/revenuecat/webhook.ts do site usa esse id para ligar o is_pro.
import { Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { IS_DEMO } from "@/demo";
import { logger } from "@/lib/logger";

// Identificador do entitlement criado no painel do RevenueCat.
export const PRO_ENTITLEMENT = "pro";

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

// Sem a chave da loja (ex.: build antigo, navegador, demonstração) o app
// continua como antes: sem botão de compra no celular.
export const STORE_PURCHASES_ENABLED = Platform.OS !== "web" && !IS_DEMO && Boolean(API_KEY);

let configured = false;

const hasPro = (info: CustomerInfo) => PRO_ENTITLEMENT in info.entitlements.active;

// Liga o RevenueCat ao usuário logado. Devolve se a loja já tem PRO ativo
// para ele (cobre o intervalo até o webhook atualizar o Supabase).
export async function identifyPurchaser(userId: string): Promise<boolean> {
  if (!STORE_PURCHASES_ENABLED) return false;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: API_KEY!, appUserID: userId });
      configured = true;
      return hasPro(await Purchases.getCustomerInfo());
    }
    const { customerInfo } = await Purchases.logIn(userId);
    return hasPro(customerInfo);
  } catch (err) {
    logger.error("purchases", "Falha ao identificar comprador", err);
    return false;
  }
}

export async function resetPurchaser(): Promise<void> {
  if (!configured) return;
  try {
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch (err) {
    logger.error("purchases", "Falha ao sair do RevenueCat", err);
  }
}

// Planos da oferta atual (mensal, anual...) com o preço já na moeda da loja.
export async function getProPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

// true = PRO liberado; false = usuário fechou a tela da loja.
export async function buyPro(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPro(customerInfo);
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return false;
    throw err;
  }
}

export async function restorePro(): Promise<boolean> {
  return hasPro(await Purchases.restorePurchases());
}

// Cancelar/trocar plano da loja só pode ser feito na própria loja.
export async function manageStoreSubscription(): Promise<void> {
  await Purchases.showManageSubscriptions();
}
