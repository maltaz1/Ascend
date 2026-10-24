import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { fonts, useTheme } from "@/theme";
import { Txt } from "./ui";

// Gráficos em SVG no estilo do recharts do web: curvas suaves (monotone),
// área em degradê, grade tracejada e eixos com números.

type Series = { key: string; color: string; label: string };
type Datum = { label: string } & Record<string, number | string>;

const PAD = { top: 10, right: 8, bottom: 22, left: 30 };

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, e => setWidth(Math.round(e.nativeEvent.layout.width))];
}

function niceMax(value: number): number {
  if (value <= 4) return Math.max(1, Math.ceil(value));
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

// Curva monotone (mesmo tipo do recharts type="monotone").
function monotonePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = (points[i + 1].y - points[i].y) / (dx[i] || 1);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  m[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (m[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
}

function Grid({ width, height, max, ticks = 4 }: { width: number; height: number; max: number; ticks?: number }) {
  const theme = useTheme();
  const chartH = height - PAD.top - PAD.bottom;
  return (
    <G>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        const y = PAD.top + chartH - (v / max) * chartH;
        return (
          <G key={i}>
            <Line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={theme.border} strokeDasharray="3 3" />
            <SvgText x={PAD.left - 6} y={y + 3} fontSize={10} fill={theme.inkMuted} textAnchor="end" fontFamily={fonts.body}>
              {formatTick(v)}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

export function AreaChart({
  data,
  series,
  height = 200,
  dots = false,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  dots?: boolean;
}) {
  const theme = useTheme();
  const [width, onLayout] = useWidth();
  const max = niceMax(Math.max(0, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0))));
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const step = data.length > 1 ? chartW / (data.length - 1) : 0;
  const x = (i: number) => PAD.left + i * step;
  const y = (v: number) => PAD.top + chartH - (v / max) * chartH;
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <View style={{ gap: 10 }}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              {series.map(s => (
                <LinearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>
            <Grid width={width} height={height} max={max} />
            {series.map(s => {
              const pts = data.map((d, i) => ({ x: x(i), y: y(Number(d[s.key]) || 0) }));
              const line = monotonePath(pts);
              const area = pts.length ? `${line} L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${pts[0].x} ${PAD.top + chartH} Z` : "";
              return (
                <G key={s.key}>
                  <Path d={area} fill={`url(#fill-${s.key})`} />
                  <Path d={line} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  {dots && pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={theme.surface} stroke={s.color} strokeWidth={2} />)}
                </G>
              );
            })}
            {data.map((d, i) =>
              i % labelEvery === 0 || (i === data.length - 1 && i % labelEvery >= labelEvery / 2) ? (
                <SvgText key={i} x={x(i)} y={height - 6} fontSize={10} fill={theme.inkMuted} textAnchor="middle" fontFamily={fonts.body}>
                  {d.label}
                </SvgText>
              ) : null
            )}
          </Svg>
        )}
      </View>
      {series.length > 1 ? <Legend series={series} line /> : null}
    </View>
  );
}

// Mantém o nome antigo usado pelas telas.
export const LineChart = AreaChart;

export function BarChart({
  data,
  series,
  height = 180,
  highlightIndex,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  highlightIndex?: number;
}) {
  const theme = useTheme();
  const [width, onLayout] = useWidth();
  const max = niceMax(Math.max(0, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0))));
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const groupW = chartW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(22, (groupW * 0.7) / series.length));

  return (
    <View style={{ gap: 10 }}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              {series.map(s => (
                <LinearGradient key={s.key} id={`bar-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={1} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0.55} />
                </LinearGradient>
              ))}
            </Defs>
            <Grid width={width} height={height} max={max} />
            {data.map((d, i) => {
              const gx = PAD.left + i * groupW + (groupW - barW * series.length) / 2;
              const dim = highlightIndex !== undefined && highlightIndex !== i;
              return (
                <G key={`${d.label}-${i}`} opacity={dim ? 0.55 : 1}>
                  {series.map((s, j) => {
                    const v = Number(d[s.key]) || 0;
                    const h = (v / max) * chartH;
                    if (h <= 0) return null;
                    const bx = gx + j * barW + 1;
                    const by = PAD.top + chartH - h;
                    const w = barW - 2;
                    const r = Math.min(4, w / 2, h);
                    // retângulo com cantos de cima arredondados (radius [4,4,0,0] do recharts)
                    const path = `M ${bx} ${by + h} L ${bx} ${by + r} Q ${bx} ${by} ${bx + r} ${by} L ${bx + w - r} ${by} Q ${bx + w} ${by} ${bx + w} ${by + r} L ${bx + w} ${by + h} Z`;
                    return <Path key={s.key} d={path} fill={`url(#bar-${s.key})`} />;
                  })}
                  <SvgText
                    x={PAD.left + i * groupW + groupW / 2}
                    y={height - 6}
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
        )}
      </View>
      {series.length > 1 ? <Legend series={series} /> : null}
    </View>
  );
}

// Barras horizontais de distribuição (categorias do Financeiro).
export function HBar({ percent, color }: { percent: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.track, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(2, Math.min(100, percent))}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

// Pizza em rosca.
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
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.track} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * c;
            const gap = slices.length > 1 ? 2 : 0;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, len - gap)} ${c - len + gap}`}
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

// Mini gráfico de linha (consistência da meta semanal).
export function Sparkline({ values, color, width = 140, height = 36 }: { values: number[]; color: string; width?: number; height?: number }) {
  const theme = useTheme();
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (width - 8) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({ x: 4 + i * step, y: height - 4 - (v / max) * (height - 10) }));
  const line = monotonePath(pts);
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Line x1={0} x2={width} y1={height - 4} y2={height - 4} stroke={theme.border} strokeDasharray="2 3" />
      <Path d={`${line} L ${last.x} ${height - 4} L ${pts[0].x} ${height - 4} Z`} fill="url(#spark)" />
      <Path d={line} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );
}

export function Legend({ series, line }: { series: { color: string; label: string }[]; line?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
      {series.map(s => (
        <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {line ? (
            <Svg width={18} height={10}>
              <Line x1={0} x2={18} y1={5} y2={5} stroke={s.color} strokeWidth={2} />
              <Circle cx={9} cy={5} r={3} fill="transparent" stroke={s.color} strokeWidth={2} />
            </Svg>
          ) : (
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
          )}
          <Txt variant="caption" color={s.color}>
            {s.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// Retângulo usado como célula do mapa de calor.
export const HeatCell = Rect;
