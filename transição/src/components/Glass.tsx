import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useTheme, withAlpha } from "@/theme";

// Liquid Glass de verdade só existe no iOS 26+. A checagem da API evita o crash
// de algumas betas do iOS 26 (expo/expo#40911).
export const hasNativeGlass = Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const REFRACTION_FILTER_ID = "ascend-liquid-glass";

// Na web o vidro distorce o que passa por baixo com um filtro SVG (mesmo do protótipo).
// O filtro é criado uma vez no documento e referenciado pelo backdrop-filter.
function ensureRefractionFilter() {
  if (Platform.OS !== "web" || typeof document === "undefined" || document.getElementById(REFRACTION_FILTER_ID)) return;
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  holder.innerHTML = `<svg width="0" height="0"><filter id="${REFRACTION_FILTER_ID}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="4" result="noise"/>
    <feGaussianBlur in="noise" stdDeviation="2" result="soft"/>
    <feDisplacementMap in="SourceGraphic" in2="soft" scale="14" xChannelSelector="R" yChannelSelector="G"/>
  </filter></svg>`;
  document.body.appendChild(holder);
}

type GlassProps = ViewProps & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Cor do vidro (tintColor do GlassView). Sem tint, o vidro é neutro.
  tint?: string;
  interactive?: boolean;
  // Distorção do conteúdo por baixo, como na barra inferior do protótipo.
  refract?: boolean;
};

// Superfície de vidro para a barra inferior e os botões. No iOS 26 usa o GlassView do
// expo-glass-effect; no Android e na web, onde o pacote vira uma View comum, reproduz o
// vidro do protótipo: quase transparente, borda clara que pega a luz e leve distorção.
export function Glass({ children, style, tint, interactive, refract, ...props }: GlassProps) {
  const theme = useTheme();
  const dark = theme.mode === "dark";

  if (hasNativeGlass) {
    return (
      <GlassView
        {...props}
        glassEffectStyle={tint ? "regular" : "clear"}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme={theme.mode}
        style={style}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === "web") {
    if (refract) ensureRefractionFilter();
    const web = {
      backgroundColor: tint ? withAlpha(tint, dark ? 0.55 : 0.75) : dark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.22)",
      borderWidth: 1,
      borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(28,25,23,0.10)",
      overflow: "hidden",
    } as ViewStyle;
    const material = {
      backdropFilter: refract ? `blur(3px) saturate(180%) url(#${REFRACTION_FILTER_ID})` : "blur(5px) saturate(170%)",
      WebkitBackdropFilter: "blur(5px) saturate(170%)",
      boxShadow: [
        `inset 1.5px 1.5px 0 -0.5px ${dark ? "rgba(255,255,255,0.55)" : "#ffffff"}`,
        "inset -1px -1px 0 -0.5px rgba(255,255,255,0.28)",
        "inset 0 0 18px rgba(255,255,255,0.06)",
        "0 8px 24px -10px rgba(0,0,0,0.45)",
      ].join(", "),
    } as unknown as ViewStyle;
    return (
      <View {...props} style={[web, style, material]}>
        {children}
      </View>
    );
  }

  // Android: sem desfoque de fundo nativo, fica translúcido com a borda clara.
  const android: ViewStyle = {
    backgroundColor: tint ? withAlpha(tint, 0.82) : dark ? "rgba(34, 31, 52, 0.80)" : "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: dark ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.95)",
    overflow: "hidden",
  };
  return (
    <View {...props} style={[android, style]}>
      {children}
    </View>
  );
}
