import { memo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { fonts, useTheme, withAlpha } from "@/theme";
import {
  ACTION_LABEL, ATTRS, LAYOUT, PARENTS, TREES, TYPE_LABEL, nodeBonus, nodeCount, nodeDone, nodeHasBoss, nodeProg, nodeState, nodeUnlocked, nodeXP,
  qCurrent, qDone, qTotal, questXP, type Attr, type AttrId, type AttrStat, type Computed,
} from "@/lib/attributes";
import { Button, ProgressBar, Sheet, Txt } from "./ui";

const wrap = (s: string, max = 13): string[] => {
  if (s.length <= max) return [s];
  const mid = s.length / 2;
  let best = -1;
  for (let k = 0; k < s.length; k++) if (s[k] === " " && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
  return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
};
const starPath = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`;
const rng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
};
const fmt = (n: number) => n.toLocaleString("pt-BR");

// ---------------------------------------------------------------------------
// Radar: os atributos se comparam entre si (o que você mais faz aponta mais para lá)
// ---------------------------------------------------------------------------

export const Radar = memo(function Radar({ stats, onPick }: { stats: AttrStat[]; onPick: (id: AttrId) => void }) {
  const theme = useTheme();
  const cx = 195, cy = 165, R = 100;
  const pt = (a: number, v: number) => [cx + R * v * Math.cos((a * Math.PI) / 180), cy + R * v * Math.sin((a * Math.PI) / 180)];
  const radius = (s: AttrStat) => Math.max(s.rel * 0.94, 0.08);
  const top = [...stats].sort((a, b) => b.xp - a.xp)[0];
  return (
    <Svg width="100%" viewBox="0 0 390 330" style={{ aspectRatio: 390 / 330 }}>
      {[0.25, 0.5, 0.75, 1].map(k => (
        <Polygon key={k} points={ATTRS.map(a => pt(a.angle, k).join(",")).join(" ")} fill="none" stroke={theme.border} strokeWidth={1} />
      ))}
      {ATTRS.map(a => {
        const [x, y] = pt(a.angle, 1);
        return <Line key={a.id} x1={cx} y1={cy} x2={x} y2={y} stroke={theme.border} strokeWidth={1} />;
      })}
      <Polygon points={stats.map(s => pt(s.attr.angle, radius(s)).join(",")).join(" ")} fill="rgba(139,92,246,0.28)" stroke={theme.primary} strokeWidth={2.5} strokeLinejoin="round" />
      {stats.map(s => {
        const [x, y] = pt(s.attr.angle, radius(s));
        const [lx, ly] = pt(s.attr.angle, 1.3);
        const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
        const ox = lx + (anchor === "start" ? -4 : anchor === "end" ? 4 : 0);
        return (
          <G key={s.attr.id} onPress={() => onPick(s.attr.id)}>
            <Circle cx={x} cy={y} r={s.attr.id === top.attr.id ? 6.5 : 5} fill={s.attr.color} stroke={theme.surface} strokeWidth={2} />
            <SvgText x={ox} y={ly - 2} textAnchor={anchor} fontSize={11} fontFamily={fonts.bodySemi} fill={theme.inkMuted}>
              {s.attr.name}
            </SvgText>
            <SvgText x={ox} y={ly + 13} textAnchor={anchor} fontSize={12} fontFamily={fonts.display} fill={s.attr.ink}>
              {`${s.share}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
});

// ---------------------------------------------------------------------------
// Visão geral da árvore: 6 ramos em constelação
// ---------------------------------------------------------------------------

const CX = 195, CY = 256;
const hubPos = (a: Attr, i: number) => {
  const [t, lane] = LAYOUT[i];
  const ang = (a.angle * Math.PI) / 180, r = 62 + t * 20, lat = lane * 15;
  return [CX + r * Math.cos(ang) - lat * Math.sin(ang), CY + r * Math.sin(ang) + lat * Math.cos(ang)];
};

export const Hub = memo(function Hub({ comp, onPick }: { comp: Computed; onPick: (id: AttrId) => void }) {
  const theme = useTheme();
  const rnd = rng(11);
  const dots = Array.from({ length: 40 }, () => [rnd() * 390, rnd() * 520, rnd() * 1.1 + 0.4, rnd() * 0.3 + 0.07]);
  return (
    <Svg width="100%" viewBox="0 0 390 520" style={{ aspectRatio: 390 / 520 }}>
      {[62, 102, 142, 182].map(r => (
        <Circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke={theme.border} strokeWidth={1} strokeDasharray="2 5" />
      ))}
      {dots.map(([x, y, r, o], k) => (Math.hypot(x - CX, y - CY) < 40 ? null : <Circle key={k} cx={x} cy={y} r={r} fill={theme.ink} opacity={o} />))}
      {ATTRS.map(a => {
        const ang = (a.angle * Math.PI) / 180;
        const [ex, ey] = [CX + 168 * Math.cos(ang), CY + 168 * Math.sin(ang)];
        const tip = hubPos(a, 11);
        const upper = Math.sin(ang) < 0;
        const ly = upper ? tip[1] - 24 : tip[1] + 28;
        const doneCount = TREES[a.id].filter((_, i) => nodeDone(comp, a.id, i)).length;
        return (
          <G key={a.id} onPress={() => onPick(a.id)}>
            <Line x1={CX} y1={CY} x2={ex} y2={ey} stroke="transparent" strokeWidth={62} strokeLinecap="round" />
            {TREES[a.id].map((_, i) =>
              PARENTS[i].map(p => {
                const [x1, y1] = i === 0 ? [CX, CY] : hubPos(a, p);
                const [x2, y2] = hubPos(a, i);
                const on = nodeDone(comp, a.id, p) && nodeUnlocked(comp, a.id, i);
                return <Line key={`${i}-${p}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? a.color : theme.track} strokeWidth={on ? 2.4 : 1.4} strokeLinecap="round" opacity={on ? 1 : 0.8} />;
              })
            )}
            <Line x1={CX} y1={CY} x2={hubPos(a, 0)[0]} y2={hubPos(a, 0)[1]} stroke={a.color} strokeWidth={2.4} strokeLinecap="round" />
            {TREES[a.id].map((_, i) => {
              const [x, y] = hubPos(a, i);
              const st = nodeState(comp, a.id, i);
              const r = i === 11 ? 7.5 : 5.5;
              if (st === "done") return <Circle key={i} cx={x} cy={y} r={r} fill={a.color} />;
              if (st === "active")
                return (
                  <G key={i}>
                    <Circle cx={x} cy={y} r={r} fill={theme.surface} stroke={a.color} strokeWidth={2} />
                    {nodeProg(comp, a.id, i) > 0 ? <Circle cx={x} cy={y} r={2.4} fill={a.color} /> : null}
                  </G>
                );
              return <Circle key={i} cx={x} cy={y} r={r} fill={theme.surfaceAlt} stroke={theme.inkMuted} strokeWidth={1} strokeDasharray="2 2.5" opacity={0.8} />;
            })}
            <SvgText x={tip[0]} y={ly} textAnchor="middle" fontSize={11} fontFamily={fonts.display} fill={a.ink} letterSpacing={0.6}>
              {a.name.toUpperCase()}
            </SvgText>
            <SvgText x={tip[0]} y={ly + 12} textAnchor="middle" fontSize={10} fontFamily={fonts.bodySemi} fill={theme.inkMuted}>
              {`${doneCount}/12`}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={CX} cy={CY} r={44} fill={theme.primary} opacity={0.16} />
      <Circle cx={CX} cy={CY} r={30} fill={theme.hero} stroke={theme.primary} strokeWidth={3} />
      <SvgText x={CX} y={CY + 6} textAnchor="middle" fontSize={17} fontFamily={fonts.display} fill={theme.ink}>
        Eu
      </SvgText>
    </Svg>
  );
});

// ---------------------------------------------------------------------------
// Árvore de um ramo (constelação)
// ---------------------------------------------------------------------------

const BW = 358, TIER = 120, PADB = 74;
const BH = PADB + 5 * TIER + 80;
const bpos = (i: number): [number, number] => [BW / 2 + LAYOUT[i][1] * 112, BH - PADB - LAYOUT[i][0] * TIER];

export const BranchTree = memo(function BranchTree({ attr, comp, onPick }: { attr: Attr; comp: Computed; onPick: (i: number) => void }) {
  const theme = useTheme();
  const rnd = rng(3 + ATTRS.findIndex(a => a.id === attr.id) * 17);
  const bg = Array.from({ length: 90 }, () => [rnd() * BW, rnd() * BH, rnd() * 1.1 + 0.35, rnd() * 0.3 + 0.07]);
  const tree = TREES[attr.id];
  return (
    <Svg width="100%" viewBox={`0 0 ${BW} ${BH}`} style={{ aspectRatio: BW / BH }}>
      {bg.map(([x, y, r, o], k) => (
        <Circle key={k} cx={x} cy={y} r={r} fill={theme.ink} opacity={o} />
      ))}
      {tree.map((_, i) =>
        PARENTS[i].map(p => {
          const [x1, y1] = bpos(p), [x2, y2] = bpos(i);
          const on = nodeDone(comp, attr.id, p);
          return on ? (
            <Line key={`${i}-${p}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={attr.ink} strokeWidth={1.8} />
          ) : (
            <Line key={`${i}-${p}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.inkMuted} strokeWidth={1.2} strokeDasharray="2 6" opacity={0.4} />
          );
        })
      )}
      {tree.map((node, i) => {
        const [x, y] = bpos(i);
        const st = nodeState(comp, attr.id, i);
        const cap = i === 11, R = cap ? 24 : 17;
        const cnt = nodeCount(comp, attr.id, i), tot = node.quests.length, prog = nodeProg(comp, attr.id, i);
        const lines = wrap(node.name);
        const off = st === "active" ? 14 : 8;
        const ty = y + R + off + 8;
        const py = ty + (lines.length - 1) * 12 + 13, gap = 12, p0 = x - ((tot - 1) * gap) / 2;
        const RR = R + 8, C = 2 * Math.PI * RR;
        return (
          <G key={i} onPress={() => onPick(i)}>
            <Circle cx={x} cy={y} r={34} fill="transparent" />
            {st === "done" ? (
              <>
                <Circle cx={x} cy={y} r={R + 12} fill={attr.color} opacity={0.1} />
                <Circle cx={x} cy={y} r={R + 7} fill={attr.color} opacity={0.18} />
                <Circle cx={x} cy={y} r={R + 2} fill={attr.color} opacity={0.3} />
                <Path d={starPath(x, y, R)} fill={theme.mode === "dark" ? "#f3edff" : "#ffffff"} stroke={attr.color} strokeWidth={1.4} strokeLinejoin="round" />
              </>
            ) : st === "active" ? (
              <>
                <Circle cx={x} cy={y} r={RR} fill="none" stroke={theme.track} strokeWidth={2} />
                {prog > 0 ? <Circle cx={x} cy={y} r={RR} fill="none" stroke={attr.color} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${C * prog} ${C}`} transform={`rotate(-90 ${x} ${y})`} /> : null}
                <Path d={starPath(x, y, R)} fill={theme.bg} stroke={attr.ink} strokeWidth={2} strokeLinejoin="round" />
                <Circle cx={x} cy={y} r={2.6} fill={attr.ink} />
              </>
            ) : (
              <Circle cx={x} cy={y} r={cap ? 6 : 3.6} fill={theme.inkMuted} opacity={0.55} />
            )}
            {nodeHasBoss(attr.id, i) ? (
              <Rect x={x + R * 0.95 - 4.5} y={y - R * 0.95 - 4.5} width={9} height={9} transform={`rotate(45 ${x + R * 0.95} ${y - R * 0.95})`} fill={st === "locked" ? theme.inkMuted : theme.accent} stroke={theme.bg} strokeWidth={1.6} opacity={st === "locked" ? 0.5 : 1} />
            ) : null}
            {lines.map((ln, k) => (
              <SvgText key={k} x={x} y={ty + k * 12} textAnchor="middle" fontSize={11.5} fontFamily={fonts.bodyBold} fill={st === "locked" ? theme.inkMuted : theme.ink} opacity={st === "locked" ? 0.6 : 1}>
                {ln}
              </SvgText>
            ))}
            {node.quests.map((q, k) => {
              const ok = qDone(q, comp.progress[attr.id][i][k]);
              const part = qCurrent(q, comp.progress[attr.id][i][k]) > 0;
              const fill = ok || part ? attr.color : "none";
              const stroke = ok || part ? attr.ink : theme.inkMuted;
              const op = st === "locked" ? 0.45 : part && !ok ? 0.75 : 1;
              const cx = p0 + k * gap;
              if (q.type === "desafio") return <Rect key={k} x={cx - 3.4} y={py - 3.4} width={6.8} height={6.8} transform={`rotate(45 ${cx} ${py})`} fill={fill} stroke={stroke} strokeWidth={1.3} opacity={op} />;
              if (q.type === "sequencia" || q.type === "semanal") return <Circle key={k} cx={cx} cy={py} r={3.5} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={fill === "none" ? "2 1.6" : undefined} opacity={op} />;
              return <Circle key={k} cx={cx} cy={py} r={3.1} fill={fill} stroke={stroke} strokeWidth={1.2} opacity={op} />;
            })}
            <SvgText x={x} y={py + 15} textAnchor="middle" fontSize={9.5} fontFamily={fonts.displaySemi} fill={st === "done" ? attr.ink : theme.inkMuted} opacity={st === "locked" ? 0.6 : 1}>
              {st === "done" ? `${nodeXP(attr.id, i)} XP ✓` : st === "active" ? `${cnt}/${tot} · ${nodeXP(attr.id, i)} XP` : `${nodeXP(attr.id, i)} XP`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
});

// ---------------------------------------------------------------------------
// Folha de uma habilidade: missões, tipos, desafios e de onde vêm
// ---------------------------------------------------------------------------

export function NodeSheet({ attr, index, comp, onClose }: { attr: Attr; index: number | null; comp: Computed; onClose: () => void }) {
  const theme = useTheme();
  const visible = index !== null;
  const i = index ?? 0;
  const node = TREES[attr.id][i];
  const st = nodeState(comp, attr.id, i);
  const open = nodeUnlocked(comp, attr.id, i);
  const stLabel = { done: "Conquistada", active: "Em progresso", locked: "Bloqueada" }[st];
  const parents = PARENTS[i].map(p => TREES[attr.id][p].name);
  const typeTone = (t: string) => (t === "desafio" ? theme.accent : t === "sequencia" ? theme.accent : t === "semanal" ? theme.cyan : theme.inkMuted);
  return (
    <Sheet visible={visible} onClose={onClose} title={node.name}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: withAlpha(attr.color, st === "locked" ? 0.1 : 0.18), alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={(st === "locked" ? "lock-closed-outline" : attr.icon) as never} size={22} color={st === "locked" ? theme.inkMuted : attr.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" }} color={attr.ink}>
            {attr.name} · camada {LAYOUT[i][0] + 1}
          </Txt>
          <Txt variant="caption" muted>
            {stLabel}
          </Txt>
        </View>
      </View>

      {open ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt variant="caption" muted>
              {nodeCount(comp, attr.id, i)} de {node.quests.length} missões
            </Txt>
            <Txt variant="caption" style={{ fontFamily: fonts.bodySemi }}>
              {fmt(nodeXP(attr.id, i))} XP no total
            </Txt>
          </View>
          <ProgressBar percent={nodeProg(comp, attr.id, i) * 100} color={attr.color} height={8} />
        </View>
      ) : (
        <View style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: theme.inkMuted }}>
          <Txt variant="caption" muted>
            Conquiste {parents.join(" ou ")} para liberar esta habilidade.
          </Txt>
        </View>
      )}

      {node.quests.map((q, k) => {
        const v = comp.progress[attr.id][i][k];
        const c = qCurrent(q, v), t = qTotal(q), ok = c >= t;
        return (
          <View
            key={k}
            style={{
              flexDirection: "row",
              gap: 12,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: q.type === "desafio" ? withAlpha(theme.accent, 0.4) : theme.border,
              backgroundColor: theme.raised,
              opacity: open ? 1 : 0.5,
            }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: ok ? 0 : 1.5, borderColor: theme.inkMuted, backgroundColor: ok ? attr.color : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              {ok ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="bodyStrong" muted={ok} style={{ textDecorationLine: ok ? "line-through" : "none" }}>
                {q.t}
              </Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: q.type === "desafio" ? theme.accent : theme.surface, borderWidth: 1, borderColor: q.type === "desafio" ? theme.accent : theme.border }}>
                  <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase" }} color={q.type === "desafio" ? "#1c1917" : typeTone(q.type)}>
                    {TYPE_LABEL[q.type]}
                  </Txt>
                </View>
                <Txt style={{ fontSize: 10, letterSpacing: 1 }} color={theme.accent}>
                  {"★".repeat(q.diff)}
                  <Txt style={{ fontSize: 10, letterSpacing: 1 }} color={theme.track}>
                    {"★".repeat(3 - q.diff)}
                  </Txt>
                </Txt>
                {!q.parts && t > 1 && open ? (
                  <Txt variant="caption" muted>
                    {c}/{t}
                  </Txt>
                ) : null}
              </View>
              {!q.parts && t > 1 && open ? <ProgressBar percent={(c / t) * 100} color={attr.color} height={4} /> : null}
              {q.parts ? (
                <View style={{ gap: 7 }}>
                  {q.parts.map((p, j) => {
                    const pc = Math.min((v as number[])[j] || 0, p.n);
                    return (
                      <View key={j} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Txt variant="caption" muted={pc >= p.n} style={{ flex: 1, textDecorationLine: pc >= p.n ? "line-through" : "none" }}>
                          {p.l}
                        </Txt>
                        <View style={{ width: 56 }}>
                          <ProgressBar percent={(pc / p.n) * 100} color={attr.color} height={4} />
                        </View>
                        <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 11, minWidth: 34, textAlign: "right" }} color={theme.inkMuted}>
                          {pc}/{p.n}
                        </Txt>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <Txt variant="caption" muted style={{ fontSize: 11 }}>
                {q.parts
                  ? `via tarefas de ${attr.name}: ${[...new Set(q.parts.map(p => ACTION_LABEL[p.ev]))].join(", ")}`
                  : `via tarefas de ${attr.name} · ${ACTION_LABEL[q.ev!]}`}
              </Txt>
            </View>
            <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 12 }} color={ok ? theme.inkMuted : theme.accent}>
              +{questXP(i, q)} XP
            </Txt>
          </View>
        );
      })}

      <Txt variant="caption" muted>
        Automático: as missões avançam quando você conclui tarefas com a etiqueta {attr.name}. Conquistar a habilidade dá +{nodeBonus(i)} XP.
      </Txt>
      <Button
        label={`Criar tarefa de ${attr.name}`}
        icon="add"
        onPress={() => {
          onClose();
          router.push("/tasks?novo=1");
        }}
      />
    </Sheet>
  );
}

// Legenda das bolinhas sob cada habilidade.
export function TreeLegend({ attr }: { attr: Attr }) {
  const theme = useTheme();
  const Item = ({ shape, label }: { shape: "dot" | "ring" | "dia"; label: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {shape === "dia" ? (
        <View style={{ width: 8, height: 8, backgroundColor: attr.color, transform: [{ rotate: "45deg" }] }} />
      ) : (
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: shape === "dot" ? attr.color : "transparent", borderWidth: 1.5, borderColor: attr.ink, borderStyle: shape === "ring" ? "dashed" : "solid" }} />
      )}
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center", paddingTop: 4 }}>
      <Item shape="dot" label="Missão" />
      <Item shape="ring" label="Recorrente" />
      <Item shape="dia" label="Desafio" />
    </View>
  );
}
