import { useRef } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

// Paisagem do Ascend: montanhas roxas com névoa ao entardecer (arte gerada no Canva).
// `retrato` serve para telas altas (entrada e topo da aba Eu); `panorama` para cartões largos.
const ART = {
  retrato: require("../../assets/landscape/retrato.jpg"),
  panorama: require("../../assets/landscape/panorama.jpg"),
};

let counter = 0;

export function Landscape({
  art = "retrato",
  fadeTo,
  dim = 0,
  position = "center",
  style,
}: {
  art?: keyof typeof ART;
  /** Cor do fundo da tela: o pé da paisagem some nela. */
  fadeTo?: string;
  /** 0 a 1: escurece a imagem para o texto branco ficar legível por cima. */
  dim?: number;
  /** Parte da imagem que fica visível quando ela é cortada. */
  position?: "top" | "center" | "bottom";
  style?: StyleProp<ViewStyle>;
}) {
  const id = useRef(`ls${(counter += 1)}`).current;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }, style]}>
      <Image
        source={ART[art]}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }, position === "top" ? { objectPosition: "top" } : position === "bottom" ? { objectPosition: "bottom" } : null] as never}
        accessibilityIgnoresInvertColors
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}dim`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0f0d18" stopOpacity={Math.min(1, dim + 0.2)} />
            <Stop offset="1" stopColor="#0f0d18" stopOpacity={dim} />
          </LinearGradient>
          {fadeTo ? (
            <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fadeTo} stopOpacity={0} />
              <Stop offset="1" stopColor={fadeTo} stopOpacity={1} />
            </LinearGradient>
          ) : null}
        </Defs>
        {dim > 0 ? <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}dim)`} /> : null}
        {fadeTo ? <Rect x="0" y="55%" width="100%" height="46%" fill={`url(#${id}fade)`} /> : null}
      </Svg>
    </View>
  );
}
