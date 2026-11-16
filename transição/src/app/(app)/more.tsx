import { Image, Pressable, Switch, View } from "react-native";
import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/hooks/useStore";
import { isProSection, type Section } from "@/navigation";
import { Card, Screen, Txt } from "@/components/ui";
import { Corv } from "@/components/Corv";
import { replayCorvIntro } from "@/components/CorvMoments";
import { fonts, useTheme, useThemeToggle, withAlpha } from "@/theme";

const logo = require("../../../assets/logo-mark.png");

type IconName = keyof typeof Ionicons.glyphMap;

const ITEMS: { section: Section; href: string; title: string; caption: string; icon: IconName; color: string }[] = [
  { section: "academy", href: "/academy", title: "Saúde", caption: "Treino e alimentação", icon: "heart-outline", color: "#9333ea" },
  { section: "financial", href: "/financial", title: "Financeiro", caption: "Entradas e gastos", icon: "wallet-outline", color: "#a78bfa" },
  { section: "notes", href: "/notes", title: "Notas", caption: "Ideias e pastas", icon: "document-text-outline", color: "#818cf8" },
  { section: "calendar", href: "/calendar", title: "Calendário", caption: "Compromissos", icon: "calendar-outline", color: "#8b5cf6" },
  { section: "dashboard", href: "/dashboard", title: "Dashboard", caption: "Seu desempenho", icon: "bar-chart-outline", color: "#c084fc" },
  { section: "evolution", href: "/evolution", title: "Evolução", caption: "Carga e volume", icon: "trending-up-outline", color: "#ddd6fe" },
  { section: "achievements", href: "/achievements", title: "Conquistas", caption: "Suas medalhas", icon: "trophy-outline", color: "#c4b5fd" },
];

// Aba "Mais": tudo o que não cabe na barra inferior.
export default function MoreScreen() {
  const theme = useTheme();
  const toggleTheme = useThemeToggle();
  const { isPro, founder } = useAuth();
  const data = useStore();
  const name = data.user.name?.split(" ")[0] || "Você";

  return (
    <Screen title="Mais" subtitle="Tudo o que o Ascend faz por você">
      <Card onPress={() => router.push("/settings")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
          <Image source={logo} style={{ width: 34, height: 34, tintColor: "#fff" }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="h2">{name}</Txt>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {founder ? <Pill label="Fundador" color={theme.accent} icon="star" /> : null}
            <Pill label={isPro ? "Pro" : "Grátis"} color={theme.primary} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.inkMuted} />
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {ITEMS.map(item => {
          const locked = !isPro && isProSection(item.section);
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              accessibilityRole="button"
              accessibilityLabel={locked ? `${item.title}, recurso Pro` : item.title}
              style={({ pressed }) => ({
                width: "48%",
                flexGrow: 1,
                minHeight: 124,
                justifyContent: "space-between",
                gap: 22,
                padding: 16,
                borderRadius: 24,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: withAlpha(item.color, 0.18), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={21} color={item.color} />
                </View>
                {locked ? <Ionicons name="lock-closed-outline" size={16} color={theme.inkMuted} /> : null}
              </View>
              <View>
                <Txt variant="h3" style={{ fontSize: 16.5 }}>
                  {item.title}
                </Txt>
                <Txt variant="caption" muted>
                  {item.caption}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card padded={false}>
        <Pressable onPress={toggleTheme} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }} accessibilityRole="switch" accessibilityState={{ checked: theme.mode === "dark" }}>
          <IconTile icon="moon-outline" color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Tema escuro</Txt>
            <Txt variant="caption" muted>
              Claro ou escuro, como preferir
            </Txt>
          </View>
          <Switch
            value={theme.mode === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ true: theme.primary, false: theme.track }}
            thumbColor="#fff"
            {...({ activeThumbColor: "#fff" } as object)}
          />
        </Pressable>
        <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 16 }} />
        <Pressable onPress={replayCorvIntro} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }} accessibilityRole="button">
          <Corv pose="joinha" size={38} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Conhecer o Corv</Txt>
            <Txt variant="caption" muted>
              Rever a apresentação do app
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.inkMuted} />
        </Pressable>
        <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 16 }} />
        <Pressable onPress={() => router.push("/settings")} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }} accessibilityRole="button">
          <IconTile icon="options-outline" color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Configurações</Txt>
            <Txt variant="caption" muted>
              Conta, plano e assinatura
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.inkMuted} />
        </Pressable>
      </Card>
    </Screen>
  );
}

function IconTile({ icon, color }: { icon: IconName; color: string }) {
  return (
    <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: withAlpha(color, 0.18), alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={19} color={color} />
    </View>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: withAlpha(color, 0.16),
        borderWidth: 1,
        borderColor: withAlpha(color, 0.4),
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }} color={color}>
        {label}
      </Txt>
    </View>
  );
}
