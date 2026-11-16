import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useStore } from "@/hooks/useStore";
import { ATTRS, TREES, attrStats, computeProgress, habitEvents, nodeCount, nodeProg, nodeState, nodeXP, type AttrId } from "@/lib/attributes";
import { Card, EmptyState, GlassIconButton, HeroCard, ProgressBar, ProgressRing, Screen, Segmented, Txt } from "@/components/ui";
import { BranchTree, Hub, NodeSheet, Radar, TreeLegend } from "@/components/EuViews";
import { EuTour, tourSeen } from "@/components/EuTour";
import { fonts, useTheme, withAlpha } from "@/theme";

type View_ = "attrs" | "tree";

// Aba "Eu": quem você está se tornando. Os atributos vêm das tarefas com etiqueta de atributo.
export default function EuScreen() {
  const theme = useTheme();
  const data = useStore();
  const comp = useMemo(() => computeProgress([...data.tasks, ...habitEvents(data.habits)]), [data.tasks, data.habits]);
  const stats = useMemo(() => attrStats(comp), [comp]);
  const [view, setView] = useState<View_>("attrs");
  const [branch, setBranch] = useState<AttrId | null>(null);
  const [node, setNode] = useState<number | null>(null);
  const [tour, setTour] = useState(false);
  // Primeira visita: abre o tour sozinho.
  useEffect(() => {
    if (!tourSeen()) setTour(true);
  }, []);

  const attr = ATTRS.find(a => a.id === branch);
  const top = [...stats].sort((a, b) => b.xp - a.xp)[0];
  const totalNodes = stats.reduce((s, x) => s + x.nodes, 0);
  const totalQuests = stats.reduce((s, x) => s + x.quests, 0);
  const user = data.user;
  const need = user.level * 100;

  // ---------------- ramo aberto ----------------
  if (attr) {
    const st = stats.find(s => s.attr.id === attr.id)!;
    return (
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <GlassIconButton icon="chevron-back" label="Voltar" onPress={() => setBranch(null)} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" }} color={attr.ink}>
              Nível {st.level}
            </Txt>
            <Txt variant="display" numberOfLines={1}>
              {attr.name}
            </Txt>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: withAlpha(attr.color, 0.18), alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={attr.icon as never} size={22} color={attr.ink} />
          </View>
        </View>

        <Card style={{ flexDirection: "row", gap: 8 }}>
          <Stat label="habilidades" value={`${st.nodes}`} sub="/12" />
          <Stat label="missões" value={`${st.quests}`} sub={`/${TREES[attr.id].reduce((s, n) => s + n.quests.length, 0)}`} />
          <Stat label="XP do ramo" value={`${st.xp.toLocaleString("pt-BR")}`} />
        </Card>

        <Card padded={false} style={{ paddingVertical: 14, paddingHorizontal: 8 }}>
          <BranchTree attr={attr} comp={comp} onPick={setNode} />
          <TreeLegend attr={attr} />
        </Card>
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          Toque numa habilidade para ver as missões. Elas avançam sozinhas quando você conclui tarefas com a etiqueta {attr.name}.
        </Txt>

        <NodeSheet attr={attr} index={node} comp={comp} onClose={() => setNode(null)} />
      </Screen>
    );
  }

  // ---------------- visão geral ----------------
  const active: { id: AttrId; i: number; p: number }[] = [];
  ATTRS.forEach(a =>
    TREES[a.id].forEach((_, i) => {
      if (nodeState(comp, a.id, i) === "active" && nodeProg(comp, a.id, i) > 0) active.push({ id: a.id, i, p: nodeProg(comp, a.id, i) });
    })
  );
  active.sort((a, b) => b.p - a.p);

  return (
    <Screen title="Eu" subtitle="Quem você está se tornando" right={<GlassIconButton icon="help-circle-outline" label="Como funciona a aba Eu" onPress={() => setTour(true)} />}>
      <EuTour visible={tour} onClose={() => setTour(false)} />
      <HeroCard style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ProgressRing percent={(user.xp / need) * 100} size={84} stroke={6}>
          <Txt variant="display" style={{ fontSize: 26 }}>
            {user.level}
          </Txt>
        </ProgressRing>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }} color={theme.primaryInk}>
            Nível {user.level}
          </Txt>
          <Txt variant="h1">
            {user.xp}
            <Txt variant="label" muted>
              {" "}
              / {need} XP
            </Txt>
          </Txt>
          <ProgressBar percent={(user.xp / need) * 100} color={theme.primary} height={8} />
        </View>
      </HeroCard>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <MiniStat icon="flame-outline" color={theme.accent} value={`${user.streak}`} label="dias seguidos" />
        <MiniStat icon="sparkles-outline" color={theme.primaryInk} value={`${totalNodes}/${ATTRS.length * 12}`} label="habilidades" />
        <MiniStat icon="checkmark-outline" color={theme.success} value={`${totalQuests}`} label="missões" />
      </View>

      <Segmented
        options={[
          { value: "attrs", label: "Atributos" },
          { value: "tree", label: "Árvore" },
        ]}
        value={view}
        onChange={setView}
      />

      {view === "attrs" ? (
        <>
          <Card padded={false} style={{ paddingTop: 8, paddingBottom: 14 }}>
            <Radar stats={stats} onPick={setBranch} />
            <Txt variant="caption" muted style={{ textAlign: "center", paddingHorizontal: 16 }}>
              {top.xp > 0 ? (
                <>
                  Seu foco está em <Txt variant="caption" color={top.attr.ink} style={{ fontFamily: fonts.bodyBold }}>{top.attr.name}</Txt> · {top.share}% de tudo o que você fez
                </>
              ) : (
                "Crie tarefas com um atributo e conclua para o gráfico tomar forma."
              )}
            </Txt>
          </Card>

          <Txt variant="h2">Seus atributos</Txt>
          <View style={{ gap: 10 }}>
            {[...stats]
              .sort((a, b) => b.xp - a.xp)
              .map(s => (
                <Card key={s.attr.id} onPress={() => setBranch(s.attr.id)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: withAlpha(s.attr.color, 0.18), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={s.attr.icon as never} size={21} color={s.attr.ink} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Txt variant="bodyStrong">{s.attr.name}</Txt>
                      <Txt variant="caption" muted style={{ fontFamily: fonts.displaySemi }}>
                        Nv {s.level} · {s.share}% do foco
                      </Txt>
                    </View>
                    <ProgressBar percent={s.rel * 100} color={s.attr.color} height={7} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.inkMuted} />
                </Card>
              ))}
          </View>
        </>
      ) : (
        <>
          <Card padded={false} style={{ paddingVertical: 8 }}>
            <Hub comp={comp} onPick={setBranch} />
            <Txt variant="caption" muted style={{ textAlign: "center", paddingBottom: 12 }}>
              Toque em um ramo para abrir suas missões
            </Txt>
          </Card>

          <Txt variant="h2">Em andamento</Txt>
          {active.length === 0 ? (
            <Card>
              <EmptyState text="Nenhuma missão em andamento" />
              <Txt variant="caption" muted style={{ textAlign: "center" }}>
                Crie uma tarefa ou hábito com a etiqueta de um atributo e conclua. As missões desse ramo começam a andar sozinhas.
              </Txt>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {active.slice(0, 5).map(({ id, i, p }) => {
                const a = ATTRS.find(x => x.id === id)!;
                return (
                  <Card
                    key={`${id}-${i}`}
                    onPress={() => {
                      setBranch(id);
                      setNode(i);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: withAlpha(a.color, 0.18), alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={a.icon as never} size={21} color={a.ink} />
                    </View>
                    <View style={{ flex: 1, gap: 7 }}>
                      <Txt variant="bodyStrong">{TREES[id][i].name}</Txt>
                      <ProgressBar percent={p * 100} color={a.color} height={6} />
                      <Txt variant="caption" muted>
                        {a.name} · {nodeCount(comp, id, i)}/{TREES[id][i].quests.length} missões · {nodeXP(id, i)} XP
                      </Txt>
                    </View>
                    <Txt style={{ fontFamily: fonts.display, fontSize: 14 }} color={a.ink}>
                      {Math.round(p * 100)}%
                    </Txt>
                  </Card>
                );
              })}
            </View>
          )}
          <Pressable onPress={() => router.push("/tasks?novo=1")} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 6 }}>
            <Txt variant="caption" color={theme.primaryInk} style={{ fontFamily: fonts.bodyBold }}>
              + Criar tarefa com atributo
            </Txt>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Txt variant="h1" style={{ fontSize: 20 }}>
        {value}
        {sub ? (
          <Txt variant="label" muted>
            {sub}
          </Txt>
        ) : null}
      </Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

function MiniStat({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 2, padding: 12, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
      <Ionicons name={icon as never} size={18} color={color} style={{ marginBottom: 4 }} />
      <Txt variant="h1" style={{ fontSize: 20 }}>
        {value}
      </Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}
