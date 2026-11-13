import type { ReactNode } from "react";
import { Animated, Image, View, type StyleProp, type ViewStyle } from "react-native";
import { useCheckPop } from "@/lib/motion";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

// Corv, o corvo do Ascend. Cada pose combina com um momento do app.
const POSES = {
  bracos: require("../../assets/corv/bracos.png"), // sério, cobrando
  bolso: require("../../assets/corv/bolso.png"), // de boa, tudo em dia
  apontando: require("../../assets/corv/apontando.png"), // dica, chamada para ação
  cafe: require("../../assets/corv/cafe.png"), // manhã, carregando
  caderno: require("../../assets/corv/caderno.png"), // planejar, telas vazias
  joinha: require("../../assets/corv/joinha.png"), // parabéns, conquista
};

export type CorvPose = keyof typeof POSES;

export function Corv({ pose, size = 72, pop }: { pose: CorvPose; size?: number; pop?: boolean }) {
  // Quando `pop` vira true, ele dá o mesmo pulinho das marcações.
  const scale = useCheckPop(!!pop);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Image source={POSES[pose]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}

// Corv falando: a imagem ao lado de um balão com a frase dele.
export function CorvSays({
  pose,
  title,
  children,
  size = 84,
  action,
  style,
  pop,
}: {
  pose: CorvPose;
  title?: string;
  children?: ReactNode;
  size?: number;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  pop?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 8 }, style]}>
      <Corv pose={pose} size={size} pop={pop} />
      <View
        style={{
          flex: 1,
          gap: 4,
          padding: 14,
          borderRadius: 20,
          borderBottomLeftRadius: 6,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: size * 0.25,
        }}
      >
        {title ? (
          <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 15 }} numberOfLines={2}>
            {title}
          </Txt>
        ) : null}
        {typeof children === "string" ? (
          <Txt variant="label" muted>
            {children}
          </Txt>
        ) : (
          children
        )}
        {action ? <View style={{ marginTop: 6, alignSelf: "flex-start" }}>{action}</View> : null}
      </View>
    </View>
  );
}
