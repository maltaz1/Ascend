import { Image, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

const mark = require("../../assets/logo-mark.png");

// Marca do Ascend (mesmo símbolo dos ícones do web) + nome em Space Grotesk.
export function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
      <Image source={mark} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="Ascend" />
      {wordmark ? (
        <Txt
          style={{ fontFamily: fonts.display, fontSize: size * 0.62, letterSpacing: size * 0.08 }}
          color={theme.ink}
        >
          ASCEND
        </Txt>
      ) : null}
    </View>
  );
}
