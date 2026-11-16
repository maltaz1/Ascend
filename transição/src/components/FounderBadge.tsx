import { useId } from "react";
import Svg, { Defs, G, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { founderLabel } from "@/lib/founder";
import { fonts } from "@/theme";

// Selo "Fundador" da lista de espera. Porta de client/src/components/FounderBadge.tsx
// (mesmo desenho da página /lista e do e-mail); as cores são do selo, não do tema.
export function FounderBadge({ number, size = 120 }: { number: number; size?: number }) {
  const id = useId().replace(/:/g, "");
  const label = founderLabel(number);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel={`Selo Fundador ${label}`}>
      <Defs>
        <LinearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#c4b5fd" />
          <Stop offset="45%" stopColor="#8b5cf6" />
          <Stop offset="100%" stopColor="#7c3aed" />
        </LinearGradient>
        <RadialGradient id={`${id}-core`} cx="50%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#241d38" />
          <Stop offset="100%" stopColor="#12111a" />
        </RadialGradient>
      </Defs>
      <Polygon points="100,10 178,55 178,145 100,190 22,145 22,55" fill={`url(#${id}-rim)`} />
      <Polygon points="100,24 166,62 166,138 100,176 34,138 34,62" fill={`url(#${id}-core)`} />
      <Polygon
        points="100,24 166,62 166,138 100,176 34,138 34,62"
        fill="none"
        stroke="#8b5cf6"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
      <G fill="none" stroke={`url(#${id}-rim)`} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M72 96 L100 68 L128 96" />
        <Path d="M72 120 L100 92 L128 120" strokeOpacity={0.45} />
      </G>
      <SvgText x="100" y="145" textAnchor="middle" fill="#f5f5f5" fontFamily={fonts.display} fontSize={15} letterSpacing={3}>
        FUNDADOR
      </SvgText>
      <SvgText x="100" y="163" textAnchor="middle" fill="#c4b5fd" fontFamily={fonts.displaySemi} fontSize={13} letterSpacing={1}>
        {label}
      </SvgText>
    </Svg>
  );
}
