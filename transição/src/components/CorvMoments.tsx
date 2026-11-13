import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useStore } from "@/hooks/useStore";
import { useTheme } from "@/theme";
import { Corv, type CorvPose } from "./Corv";
import { AnimatedNumber, Button, Txt } from "./ui";

const INTRO_KEY = "ascend.corv-intro-seen";

// Permite reabrir a apresentação pela tela "Mais".
const introListeners = new Set<() => void>();
export function replayCorvIntro() {
  introListeners.forEach(listener => listener());
}

function readIntroSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

const INTRO_STEPS: { pose: CorvPose; title: string; text: string }[] = [
  { pose: "cafe", title: "E aí, eu sou o Corv.", text: "Vou te acompanhar todo dia para a rotina não sair do trilho." },
  { pose: "bolso", title: "Hoje", text: "Seu dia num lugar só: o progresso, as tarefas e os hábitos." },
  { pose: "caderno", title: "Rotina e Saúde", text: "Tarefas, hábitos e metas de um lado; treino e dieta do outro." },
  { pose: "apontando", title: "O botão +", text: "Cria tarefa, hábito, meta, refeição, transação ou nota num toque." },
  { pose: "bracos", title: "E eu vou cobrar.", text: "Se a sequência estiver em risco, você vai me ver de braços cruzados." },
];

function Overlay({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            alignItems: "center",
            gap: 12,
            padding: 24,
            borderRadius: 30,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

// Primeira vez que a pessoa abre o app: o Corv apresenta as abas.
export function CorvIntro() {
  const theme = useTheme();
  const [visible, setVisible] = useState(() => !readIntroSeen());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const open = () => {
      setStep(0);
      setVisible(true);
    };
    introListeners.add(open);
    return () => {
      introListeners.delete(open);
    };
  }, []);

  const finish = () => {
    setVisible(false);
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // sem armazenamento: mostra de novo na próxima abertura
    }
  };

  const current = INTRO_STEPS[step];
  const last = step === INTRO_STEPS.length - 1;

  return (
    <Overlay visible={visible} onClose={finish}>
      <Corv key={step} pose={current.pose} size={170} pop />
      <Txt variant="display" style={{ textAlign: "center", fontSize: 24 }}>
        {current.title}
      </Txt>
      <Txt muted style={{ textAlign: "center" }}>
        {current.text}
      </Txt>
      <View style={{ flexDirection: "row", gap: 6, marginVertical: 6 }}>
        {INTRO_STEPS.map((_, i) => (
          <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? theme.primary : theme.track }} />
        ))}
      </View>
      <View style={{ alignSelf: "stretch" }}>
        <Button label={last ? "Bora começar" : "Próximo"} onPress={() => (last ? finish() : setStep(step + 1))} />
      </View>
      {!last ? (
        <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
          <Txt variant="label" muted>
            Pular
          </Txt>
        </Pressable>
      ) : null}
    </Overlay>
  );
}

// Quando o nível sobe, o Corv aparece comemorando.
export function CorvLevelUp() {
  const data = useStore();
  const level = data.user.level;
  const previous = useRef(level);
  const [shown, setShown] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (level > previous.current) {
      const from = previous.current;
      previous.current = level;
      const timer = setTimeout(() => setShown({ from, to: level }), 350);
      return () => clearTimeout(timer);
    }
    previous.current = level;
  }, [level]);

  return (
    <Overlay visible={!!shown} onClose={() => setShown(null)}>
      {shown ? (
        <>
          <Corv pose="joinha" size={170} pop />
          <Txt variant="label" muted>
            Subiu de nível!
          </Txt>
          <Txt variant="hero" style={{ fontSize: 44 }}>
            Nível <AnimatedFromTo from={shown.from} to={shown.to} />
          </Txt>
          <Txt muted style={{ textAlign: "center" }}>
            O Corv tá orgulhoso. Continua assim que o próximo vem rápido.
          </Txt>
          <View style={{ alignSelf: "stretch", marginTop: 6 }}>
            <Button label="Bora continuar" onPress={() => setShown(null)} />
          </View>
        </>
      ) : null}
    </Overlay>
  );
}

// Começa no nível antigo e corre até o novo.
function AnimatedFromTo({ from, to }: { from: number; to: number }) {
  const [target, setTarget] = useState(from);
  useEffect(() => {
    const timer = setTimeout(() => setTarget(to), 250);
    return () => clearTimeout(timer);
  }, [to]);
  return <AnimatedNumber variant="hero" style={{ fontSize: 44 }} value={target} />;
}
