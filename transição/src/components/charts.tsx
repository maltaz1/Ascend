import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

// Gráficos simples em SVG — substituem o recharts usado no web.

type Series = { key: string; color: string; label: string };

export function BarChart({
  data,
  series,
  height = 160,
  width = 320,
}: {
  data: ({ label: string } & Record<string, number | string>)[];
  series: Series[];
  height?: number;
  width?: number;
}) {
  const theme = useTheme();
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0)));
  const chartH = height - 22;
  const groupW = width / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(18, (groupW - 8) / series.length));

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <Line key={f} x1={0} x2={width} y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke={theme.border} strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const groupX = i * groupW + (groupW - barW * series.length) / 2;
          return (
            <G key={`${d.label}-${i}`}>
              {series.map((s, j) => {
                const value = Number(d[s.key]) || 0;
                const h = (value / max) * (chartH - 4);
                return (
                  <Rect
                    key={s.key}
                    x={groupX + j * barW}
                    y={chartH - h}
                    width={barW - 2}
                    height={Math.max(h, value > 0 ? 2 : 0)}
                    rx={3}
                    fill={s.color}
                  />
                );
              })}
              <SvgText
                x={i * groupW + groupW / 2}
                y={height - 4}
                fontSize={10}
                fill={theme.inkMuted}
                textAnchor="middle"
                fontFamily={fonts.body}
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {series.length > 1 ? <Legend series={series} /> : null}
    </View>
  );
}

export function LineChart({
  data,
  series,
  height = 160,
  width = 320,
}: {
  data: ({ label: string } & Record<string, number | string>)[];
  series: Series[];
  height?: number;
  width?: number;
}) {
  const theme = useTheme();
  const values = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const chartH = height - 22;
  const stepX = data.length > 1 ? (width - 16) / (data.length - 1) : 0;
  const y = (v: number) => chartH - ((v - min) / (max - min || 1)) * (chartH - 8) - 4;
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <Line key={f} x1={0} x2={width} y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke={theme.border} strokeDasharray="3 4" />
        ))}
        {series.map(s => {
          const path = data
            .map((d, i) => `${i === 0 ? "M" : "L"} ${8 + i * stepX} ${y(Number(d[s.key]) || 0)}`)
            .join(" ");
          return (
            <G key={s.key}>
              <Path d={path} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {data.map((d, i) => (
                <Circle key={i} cx={8 + i * stepX} cy={y(Number(d[s.key]) || 0)} r={2.5} fill={s.color} />
              ))}
            </G>
          );
        })}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <SvgText key={i} x={8 + i * stepX} y={height - 4} fontSize={10} fill={theme.inkMuted} textAnchor="middle" fontFamily={fonts.body}>
              {d.label}
            </SvgText>
          ) : null
        )}
      </Svg>
      {series.length > 1 ? <Legend series={series} /> : null}
    </View>
  );
}

// Rosca para distribuição (categorias de gasto, macros etc.).
export function DonutChart({
  slices,
  size = 140,
  stroke = 22,
  center,
}: {
  slices: { value: number; color: string; label: string }[];
  size?: number;
  stroke?: number;
  center?: string;
}) {
  const theme = useTheme();
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.primarySoft} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </Svg>
      {center ? <Txt variant="h3">{center}</Txt> : null}
    </View>
  );
}

export function Legend({ series }: { series: { color: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {series.map(s => (
        <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
          <Txt variant="caption" muted>
            {s.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}
