import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, Card, ProgressBar, Txt } from "@/components/ui";
import { Corv, type CorvPose } from "@/components/Corv";
import { BranchTree, Radar } from "@/components/EuViews";
import { ATTRS, computeProgress, type AttrStat } from "@/lib/attributes";
import type { Task } from "@/store/types";
import { fonts, useTheme, withAlpha } from "@/theme";

const TOUR_KEY = "ascend-eu-tour-v1";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true; // sem armazenamento, não insiste
  }
}
function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    // sem armazenamento: aparece de novo na próxima abertura
  }
}

// ---------------------------------------------------------------------------
// Peças visuais
// ---------------------------------------------------------------------------

// Entrada suave: sobe e aparece, com atraso para escalonar os blocos.
function Rise({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{children}</Animated.View>
  );
}

// Negrito dentro de um texto: herda o tamanho do pai (um Txt aninhado voltaria ao tamanho padrão).
function Strong({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={{ fontFamily: fonts.bodyBold, color: theme.ink }}>{children}</Text>;
}

// Bloco com ícone, título e texto.
function Point({ icon, color, title, children }: { icon: string; color?: string; title: string; children: ReactNode }) {
  const theme = useTheme();
  const c = color ?? theme.primaryInk;
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: withAlpha(c, 0.16), alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as never} size={19} color={c} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="caption" muted style={{ lineHeight: 18 }}>
          {children}
        </Txt>
      </View>
    </View>
  );
}

function Callout({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const theme = useTheme();
  const c = tone === "warn" ? theme.accent : theme.primaryInk;
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 18, backgroundColor: withAlpha(c, 0.12), borderWidth: 1, borderColor: withAlpha(c, 0.32) }}>
      <Ionicons name={(tone === "warn" ? "alert-circle" : "information-circle") as never} size={19} color={c} style={{ marginTop: 1 }} />
      <Txt variant="caption" style={{ flex: 1, lineHeight: 18 }}>
        {children}
      </Txt>
    </View>
  );
}

function Chip({ label, color, icon }: { label: string; color: string; icon?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: withAlpha(color, 0.18), borderWidth: 1, borderColor: withAlpha(color, 0.45) }}>
      {icon ? <Ionicons name={icon as never} size={13} color={color} /> : null}
      <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 12.5 }} color={color}>
        {label}
      </Txt>
    </View>
  );
}

// Corv no palco: flutua, dá um pulo ao ser tocado e fala num balão.
function Stage({ pose, accent, say, onTap }: { pose: CorvPose; accent: string; say: string; onTap: () => void }) {
  const theme = useTheme();
  const bob = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const bubble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // O balão "pisca" a cada frase nova.
  useEffect(() => {
    bubble.setValue(0);
    Animated.spring(bubble, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [say, bubble]);

  const poke = () => {
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    onTap();
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel="Cutucar o Corv" style={{ width: 128, height: 132, alignItems: "center", justifyContent: "flex-end" }}>
        <Animated.View
          style={{
            transform: [
              { translateY: Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }), jump.interpolate({ inputRange: [0, 1], outputRange: [0, -22] })) },
              { rotate: jump.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-6deg"] }) },
            ],
          }}
        >
          <Corv pose={pose} size={120} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={{
          flex: 1,
          marginBottom: 26,
          padding: 14,
          borderRadius: 20,
          borderBottomLeftRadius: 6,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: withAlpha(accent, 0.45),
          opacity: bubble,
          transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }, { translateX: bubble.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        }}
      >
        <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 14.5, lineHeight: 20 }}>{say}</Txt>
        <Txt variant="caption" muted style={{ marginTop: 4 }}>
          Toque em mim
        </Txt>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Demonstrações dentro dos passos
// ---------------------------------------------------------------------------

// Tarefa de mentira: ao marcar, o atributo ganha XP na hora (o mesmo que acontece de verdade).
function TryIt({ onDone }: { onDone: (done: boolean) => void }) {
  const theme = useTheme();
  const attr = ATTRS[1];
  const [done, setDone] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    const next = !done;
    setDone(next);
    onDone(next);
    pop.setValue(0);
    if (next) Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  };
  const xp = done ? 16 : 0;
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 22, backgroundColor: withAlpha(theme.primary, 0.1), borderWidth: 1, borderColor: withAlpha(theme.primary, 0.35) }}>
      <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" }} color={theme.primaryInk}>
        Experimente
      </Txt>
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: done ? attr.color : theme.border }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: done ? attr.color : theme.inkMuted, backgroundColor: done ? attr.color : "transparent", alignItems: "center", justifyContent: "center" }}>
          {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="bodyStrong" style={{ textDecorationLine: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>
            Ler 20 páginas
          </Txt>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Chip label="Mente" color={attr.ink} icon={attr.icon} />
            <Chip label="Leitura" color={theme.inkMuted} />
          </View>
        </View>
        <Txt variant="caption" muted>
          média
        </Txt>
      </Pressable>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt variant="caption" muted>
            XP em Mente
          </Txt>
          <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} color={attr.ink}>
              {done ? "+16 XP" : "0 XP"}
            </Txt>
          </Animated.View>
        </View>
        <ProgressBar percent={xp * 4} color={attr.color} height={8} />
      </View>
      <Txt variant="caption" muted style={{ lineHeight: 18 }}>
        {done ? "Pronto: é assim que acontece. Toque de novo para desmarcar e veja o XP sair." : "Toque no quadradinho para concluir a tarefa."}
      </Txt>
    </View>
  );
}

// Radar de exemplo: o atributo com mais XP vira a referência e os outros se comparam a ele.
function SampleRadar() {
  const xp = [30, 90, 50, 180, 70, 120];
  const total = xp.reduce((a, b) => a + b, 0);
  const max = Math.max(...xp);
  const stats: AttrStat[] = ATTRS.map((attr, i) => ({ attr, xp: xp[i], share: Math.round((xp[i] / total) * 100), rel: xp[i] / max, level: 1 + Math.floor(xp[i] / 180), nodes: 0, quests: 0 }));
  return <Radar stats={stats} onPick={() => undefined} />;
}

// Ramo de exemplo (Força) com algumas tarefas já feitas, calculado pelo mesmo motor do app.
function SampleBranch() {
  const comp = useMemo(() => {
    const t: Task[] = [];
    const mk = (cat: string, n: number) => {
      for (let k = 0; k < n; k++) t.push({ id: `${cat}${k}`, title: "", date: "2026-01-01", createdAt: `2026-01-01T00:00:${String(t.length % 60).padStart(2, "0")}`, priority: "medium", completed: true, category: cat } as Task);
    };
    mk("forca:treino", 9);
    mk("forca:atividade", 3);
    return computeProgress(t);
  }, []);
  return <BranchTree attr={ATTRS[5]} comp={comp} onPick={() => undefined} />;
}

// ---------------------------------------------------------------------------
// Passos
// ---------------------------------------------------------------------------

type Ctx = { say: (s: string, pose?: CorvPose) => void };
type Step = { icon: string; kicker: string; title: string; pose: CorvPose; says: string; accent: string; body: (c: Ctx) => ReactNode };

function useSteps(): Step[] {
  const theme = useTheme();
  const ex: Record<string, string> = {
    espirito: "Meditar, escrever no diário, orar",
    mente: "Ler, estudar, fazer um curso",
    riqueza: "Registrar gastos, guardar dinheiro",
    disciplina: "Cumprir a rotina, planejar o dia",
    vitalidade: "Beber água, dormir e comer bem",
    forca: "Treinar, correr, pedalar, alongar",
  };
  const types: { icon: string; name: string; text: string; color: string }[] = [
    { icon: "checkmark-circle", name: "Única", text: 'Fazer uma vez. Ex.: "Registrar 1 treino".', color: theme.success },
    { icon: "layers", name: "Acumulativa", text: 'Fazer várias vezes ao longo do tempo. Ex.: "Ler 5 livros".', color: theme.primaryInk },
    { icon: "repeat", name: "Sequência", text: 'Vários dias. Ex.: "7 dias de água". O app conta as marcações; não confere se foram seguidas.', color: theme.accent },
    { icon: "calendar", name: "Semanal", text: 'Pensada para uma semana. Ex.: "Treinar 3 dias na semana". Também conta o total de marcações.', color: theme.cyan },
    { icon: "diamond", name: "Desafio", text: 'Junta várias frentes ao mesmo tempo. Ex.: "Semana de ferro": treinos + cardio + sono. Cada frente tem a sua barra.', color: theme.accent },
  ];
  return [
    {
      icon: "person-outline",
      kicker: "Bem-vindo",
      title: "A aba Eu mostra quem você está se tornando",
      pose: "bolso",
      says: "Eu sou o Corv. Em menos de 1 minuto você entende tudo.",
      accent: theme.primary,
      body: () => (
        <>
          <Txt variant="body" style={{ lineHeight: 22 }}>
            Aqui o que você já faz no Ascend (tarefas e hábitos) vira <Strong>evolução em 6 atributos</Strong>, como num jogo de RPG, só que com a sua vida real.
          </Txt>
          <Rise delay={120}>
            <Point icon="hand-left-outline" title="Você não preenche nada aqui">
              Esta aba só mostra o resultado. Quem alimenta ela são as suas tarefas e hábitos.
            </Point>
          </Rise>
          <Rise delay={220}>
            <Point icon="pricetag-outline" title="Só uma coisa é necessária">
              Dizer a quais atributos cada tarefa ou hábito pertence. Esse é o único passo seu.
            </Point>
          </Rise>
        </>
      ),
    },
    {
      icon: "sparkles-outline",
      kicker: "Os 6 atributos",
      title: "Cada área da vida é um atributo",
      pose: "apontando",
      says: "Seis áreas. Toda tarefa sua cabe em uma delas.",
      accent: ATTRS[0].color,
      body: () => (
        <>
          <Txt variant="caption" muted>
            Tudo o que você etiquetar conta para um deles. Exemplos do que combina com cada um:
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ATTRS.map((a, k) => (
              <View key={a.id} style={{ width: "48%", flexGrow: 1 }}>
                <Rise delay={k * 70}>
                  <View style={{ gap: 8, padding: 14, borderRadius: 20, backgroundColor: withAlpha(a.color, 0.12), borderWidth: 1, borderColor: withAlpha(a.color, 0.38), minHeight: 118 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: withAlpha(a.color, 0.24), alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={a.icon as never} size={18} color={a.ink} />
                    </View>
                    <Txt variant="bodyStrong" color={a.ink}>
                      {a.name}
                    </Txt>
                    <Txt variant="caption" muted style={{ lineHeight: 16 }}>
                      {ex[a.id]}
                    </Txt>
                  </View>
                </Rise>
              </View>
            ))}
          </View>
        </>
      ),
    },
    {
      icon: "pricetag-outline",
      kicker: "Passo 1",
      title: "Etiquete a tarefa ou o hábito",
      pose: "caderno",
      says: "Ao criar, role até “Atributo” e escolha dois campos.",
      accent: theme.accent,
      body: () => (
        <>
          <Rise>
            <Point icon="apps-outline" title="1. Atributo">
              Em qual área da vida isso se encaixa. Ex.: <Strong>Mente</Strong>.
            </Point>
          </Rise>
          <Rise delay={110}>
            <Point icon="options-outline" title="2. Tipo de ação">
              O que você faz dentro dessa área. Ex.: <Strong>Leitura</Strong>. Ele decide quais missões da árvore andam. Se nenhum servir, use <Strong>Outro</Strong>.
            </Point>
          </Rise>
          <Rise delay={200}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Txt variant="caption" muted>
                Exemplo: “Ler 20 páginas” →
              </Txt>
              <Chip label="Mente" color={ATTRS[1].ink} icon={ATTRS[1].icon} />
              <Chip label="Leitura" color={theme.inkMuted} />
            </View>
          </Rise>
          <Callout>
            Tarefas e hábitos <Strong>sem atributo continuam funcionando normalmente</Strong>, mas não contam na aba Eu. Hábitos que você já tem: toque no lápis do hábito (ou no chip “+ Atributo”) para etiquetar.
          </Callout>
        </>
      ),
    },
    {
      icon: "checkmark-done-outline",
      kicker: "Passo 2",
      title: "Conclua e o atributo ganha XP",
      pose: "apontando",
      says: "Toca no quadradinho e vê o XP subir!",
      accent: theme.success,
      body: ({ say }) => (
        <>
          <TryIt onDone={d => (d ? say("+16 XP em Mente! É assim que funciona.", "joinha") : say("Desmarcou? O XP sai. Nada de ganhar de graça.", "bracos"))} />
          <Point icon="checkbox-outline" title="Tarefa">
            Ao concluir, soma XP no atributo escolhido. A <Strong>prioridade</Strong> define quanto: baixa 8, média 16, alta 24.
          </Point>
          <Point icon="flame-outline" title="Hábito">
            Cada dia que você marca soma <Strong>16 XP</Strong> no atributo do hábito.
          </Point>
          <Point icon="trending-up-outline" title="XP extra pelas missões">
            Completar missões e habilidades da árvore (próximos passos) dá XP a mais.
          </Point>
          <Callout>O XP dos atributos é separado do XP e do nível geral do app que aparece no topo da aba. Os dois sobem ao mesmo tempo, mas são contas diferentes.</Callout>
        </>
      ),
    },
    {
      icon: "radio-outline",
      kicker: "Aba Atributos",
      title: "O radar compara os atributos entre si",
      pose: "bracos",
      says: "A ponta maior é onde você mais investe o seu tempo.",
      accent: theme.primary,
      body: () => (
        <>
          <Card padded={false} style={{ paddingTop: 8, paddingBottom: 6 }}>
            <SampleRadar />
            <Txt variant="caption" muted style={{ textAlign: "center", paddingBottom: 8 }}>
              Exemplo: aqui o foco está em Disciplina
            </Txt>
          </Card>
          <Point icon="resize-outline" title="O maior atributo toca a borda">
            Ele é a referência. Os outros aparecem proporcionais a ele.
          </Point>
          <Point icon="pie-chart-outline" title="A porcentagem é a fatia do todo">
            “Disciplina 29%” quer dizer que 29% de todo o XP que você ganhou veio de Disciplina. As seis fatias somam 100%.
          </Point>
          <Point icon="ribbon-outline" title="Nível">
            Sobe a cada 180 XP no atributo. Toque num atributo para abrir a árvore dele.
          </Point>
          <Callout>Não é nota de 0 a 100 nem “quanto falta”. Quem só faz Força vê uma ponta grande e as outras pequenas, e isso é o esperado.</Callout>
        </>
      ),
    },
    {
      icon: "git-network-outline",
      kicker: "Aba Árvore",
      title: "Cada atributo tem uma árvore de habilidades",
      pose: "apontando",
      says: "Você começa embaixo e vai subindo, habilidade por habilidade.",
      accent: ATTRS[5].color,
      body: () => (
        <>
          <Card padded={false} style={{ paddingVertical: 10, paddingHorizontal: 6 }}>
            <SampleBranch />
            <Txt variant="caption" muted style={{ textAlign: "center" }}>
              Exemplo: ramo de Força com alguns treinos feitos
            </Txt>
          </Card>
          <Point icon="apps-outline" title="12 habilidades em 6 camadas">
            Começa pela de baixo ("Despertar") e sobe até a do topo.
          </Point>
          <Point icon="flag-outline" title="Cada habilidade tem missões">
            Toque nela para ver as missões. Ela fica completa quando <Strong>todas</Strong> estão prontas.
          </Point>
          <Point icon="lock-open-outline" title="Completar libera as vizinhas">
            As ligadas a ela na camada de cima abrem. As bloqueadas aparecem apagadas.
          </Point>
          <Callout tone="warn">
            <Strong>Só habilidades abertas avançam.</Strong> Uma tarefa de Leitura só conta se existir uma missão de leitura aberta agora. Se nada avança, veja que tipo de ação a habilidade aberta pede. Cada tarefa concluída avança <Strong>uma</Strong> missão por vez.
          </Callout>
        </>
      ),
    },
    {
      icon: "flag-outline",
      kicker: "Missões",
      title: "Os tipos de missão",
      pose: "bolso",
      says: "São 5 formatos. Não precisa decorar, é só para você saber.",
      accent: theme.accent,
      body: () => (
        <>
          <Txt variant="caption" muted>
            O tipo é só o formato. Em todos, o que conta é a quantidade de tarefas ou dias marcados com o tipo de ação certo.
          </Txt>
          {types.map((t, k) => (
            <Rise key={t.name} delay={k * 80}>
              <Point icon={t.icon} color={t.color} title={t.name}>
                {t.text}
              </Point>
            </Rise>
          ))}
          <Callout>Na árvore, os pontinhos embaixo de cada habilidade representam as missões dela. O losango é o desafio. Toque na habilidade para ver os detalhes.</Callout>
        </>
      ),
    },
    {
      icon: "rocket-outline",
      kicker: "Pronto",
      title: "Resumo e primeiro passo",
      pose: "joinha",
      says: "Agora é com você. Bora criar a primeira tarefa?",
      accent: theme.success,
      body: () => (
        <>
          {[
            { n: "1", t: "Crie ou edite uma tarefa/hábito", d: "Escolha Atributo e Tipo de ação." },
            { n: "2", t: "Conclua (ou marque o dia)", d: "O atributo ganha XP e uma missão aberta avança." },
            { n: "3", t: "Volte aqui", d: "Veja o radar mudar e as missões andarem na árvore." },
          ].map((s, k) => (
            <Rise key={s.n} delay={k * 110}>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 14, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: withAlpha(theme.primary, 0.2), alignItems: "center", justifyContent: "center" }}>
                  <Txt style={{ fontFamily: fonts.display, fontSize: 18 }} color={theme.primaryInk}>
                    {s.n}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodyStrong">{s.t}</Txt>
                  <Txt variant="caption" muted>
                    {s.d}
                  </Txt>
                </View>
              </View>
            </Rise>
          ))}
          <Callout>
            Dúvida depois? Toque no ícone <Strong>?</Strong> no topo da aba Eu para rever este tour quando quiser.
          </Callout>
        </>
      ),
    },
  ];
}

const POKES = ["Ei, isso faz cosquinha!", "Calma, eu já estou aqui.", "Pode continuar, eu espero.", "Gostei de você, vamos lá."];

// Tour de apresentação da aba Eu: aparece na primeira visita e pode ser reaberto pelo "?".
export function EuTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const steps = useSteps();
  const [i, setI] = useState(0);
  const [override, setOverride] = useState<{ say: string; pose: CorvPose } | null>(null);
  const [pokes, setPokes] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  const go = (n: number) => {
    setI(n);
    setOverride(null);
    setPokes(0);
  };
  const close = () => {
    markTourSeen();
    go(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + 8 }}>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 }}>
          <Txt variant="caption" muted style={{ fontFamily: fonts.bodySemi }}>
            {i + 1} de {steps.length}
          </Txt>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Pular tour">
            <Txt variant="caption" color={theme.primaryInk} style={{ fontFamily: fonts.bodyBold }}>
              {last ? "Fechar" : "Pular"}
            </Txt>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 5, paddingHorizontal: 20, paddingBottom: 10 }}>
          {steps.map((_, k) => (
            <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k < i ? withAlpha(theme.primary, 0.55) : k === i ? theme.primary : theme.track }} />
          ))}
        </View>

        <ScrollView key={i} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
          <Stage
            pose={override?.pose ?? step.pose}
            accent={step.accent}
            say={override?.say ?? step.says}
            onTap={() => {
              setOverride({ say: POKES[pokes % POKES.length], pose: pokes % 2 ? "bolso" : "joinha" });
              setPokes(p => p + 1);
            }}
          />
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: withAlpha(step.accent, 0.2), alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={step.icon as never} size={15} color={step.accent} />
              </View>
              <Txt style={{ fontFamily: fonts.displaySemi, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" }} color={theme.primaryInk}>
                {step.kicker}
              </Txt>
            </View>
            <Txt variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
              {step.title}
            </Txt>
          </View>
          {step.body({ say: (s, p) => setOverride({ say: s, pose: p ?? step.pose }) })}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg }}>
          {i > 0 ? (
            <View style={{ flex: 1 }}>
              <Button label="Voltar" variant="ghost" onPress={() => go(i - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            {last ? (
              <Button
                label="Criar tarefa com atributo"
                onPress={() => {
                  close();
                  router.push("/tasks?novo=1");
                }}
              />
            ) : (
              <Button label="Próximo" onPress={() => go(i + 1)} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
