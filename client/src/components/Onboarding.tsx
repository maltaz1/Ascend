import { useState, useCallback, useRef } from "react";
import { Sparkles, ArrowRight, Rocket, CheckCircle2, Bell } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { addTask, addHabit, getTodayString } from "@/lib/store";
import { usePWA } from "@/hooks/usePWA";

const ONBOARDING_STORAGE_KEY = "ascend_onboarding_done_v1";

const FOCUS_OPTIONS = [
  { id: "produtividade", label: "Ser mais produtivo", emoji: "🎯" },
  { id: "fitness", label: "Treinar e me exercitar", emoji: "💪" },
  { id: "financas", label: "Organizar minhas finanças", emoji: "💰" },
  { id: "equilibrio", label: "Ter mais equilíbrio", emoji: "🧘" },
];

type Step = "welcome" | "focus" | "firstTask" | "firstHabit" | "done";

interface OnboardingProps {
  onDismiss: () => void;
}

export function Onboarding({ onDismiss }: OnboardingProps) {
  const storeData = useStore();
  const { isInstallable, installApp } = usePWA();
  const [step, setStep] = useState<Step>("welcome");
  const [focus, setFocus] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [habitTitle, setHabitTitle] = useState("");
  const [habitEmoji, setHabitEmoji] = useState("✨");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const dismissRef = useRef(false);

  const totalSteps = 5;
  const stepIndex = { welcome: 0, focus: 1, firstTask: 2, firstHabit: 3, done: 4 }[step];
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const markDone = useCallback(() => {
    if (dismissRef.current) return;
    dismissRef.current = true;
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, String(Date.now()));
    } catch (_) {}
    onDismiss();
  }, [onDismiss]);

  const next = useCallback(() => {
    setStep(s => {
      const order: Step[] = ["welcome", "focus", "firstTask", "firstHabit", "done"];
      const idx = order.indexOf(s);
      return order[Math.min(idx + 1, order.length - 1)];
    });
  }, []);

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || saving) return;
    setSaving(true);
    try {
      await addTask({
        title: taskTitle.trim(),
        date: getTodayString(),
        completed: false,
        priority: "high",
        category: "onboarding",
      });
      setProgress(p => p + 25);
    } catch (e) {
      console.error("Falha ao criar tarefa do onboarding", e);
    } finally {
      setSaving(false);
      next();
    }
  };

  const handleCreateHabit = async () => {
    if (!habitTitle.trim() || saving) return;
    setSaving(true);
    try {
      addHabit({
        title: habitTitle.trim(),
        emoji: habitEmoji,
        color: "#8b5cf6",
        frequency: "daily",
        targetDays: 7,
      });
      setProgress(p => p + 25);
    } catch (e) {
      console.error("Falha ao criar hábito do onboarding", e);
    } finally {
      setSaving(false);
      next();
    }
  };

  const primaryBtn =
    "w-full rounded-md py-3 px-5 font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800/40 mb-6 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
          />
        </div>

        {step === "welcome" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] shadow-lg">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Space Grotesk" }}>
              Bem-vindo ao Ascend! 🚀
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-1">
              Em menos de 60 segundos vamos configurar sua jornada:
              definir seu foco, criar sua primeira tarefa e seu primeiro hábito.
            </p>
            <p className="text-xs text-zinc-500 mb-6">
              Cada ação vale <span className="text-purple-400 font-semibold">+25 XP</span> — você já começa ganhando!
            </p>
            <button
              onClick={next}
              className={primaryBtn}
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              autoFocus
            >
              Começar agora <ArrowRight className="inline ml-1 h-4 w-4" />
            </button>
          </div>
        )}

        {step === "focus" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>
                Qual é o seu foco agora?
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Pode mudar depois a qualquer momento.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setFocus(opt.id);
                    try {
                      window.localStorage.setItem("ascend_onboarding_focus", opt.id);
                    } catch (_) {}
                    next();
                  }}
                  className="flex flex-col items-center gap-1 rounded-lg border border-[var(--ledger-paper-border)] bg-[var(--ledger-paper-bg)] p-4 hover:border-purple-500/60 hover:bg-purple-500/10 transition-colors text-center"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "firstTask" && (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Space Grotesk" }}>
              Sua primeira tarefa 🎯
            </h2>
            <p className="text-xs text-zinc-500 mb-5">
              Algo simples que você pode concluir hoje. Ao marcar como feita, você ganha <span className="text-purple-400 font-semibold">+10 XP</span>.
            </p>
            <input
              type="text"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateTask()}
              placeholder="Ex.: Beber 2L de água hoje"
              className="w-full rounded-md border border-[var(--ledger-paper-border)] bg-transparent px-4 py-3 text-sm outline-none focus:border-purple-500 mb-4"
              maxLength={120}
              autoFocus
            />
            <button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || saving}
              className={primaryBtn}
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {saving ? "Criando..." : "Criar tarefa (+25 XP)"}
            </button>
            <button
              onClick={next}
              className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Pular esta etapa
            </button>
          </div>
        )}

        {step === "firstHabit" && (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Space Grotesk" }}>
              Seu primeiro hábito ✨
            </h2>
            <p className="text-xs text-zinc-500 mb-5">
              Pequenas repetições diárias constroem grandes resultados.
            </p>
            <div className="flex gap-2 mb-3">
              {["✨", "💪", "📚", "💧", "🏃", "🧘"].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setHabitEmoji(emoji)}
                  className="h-11 w-11 rounded-lg border text-xl transition-colors"
                  style={{
                    borderColor: habitEmoji === emoji ? "#a855f7" : "var(--ledger-paper-border)",
                    background: habitEmoji === emoji ? "rgba(168,85,247,0.15)" : "transparent",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={habitTitle}
              onChange={e => setHabitTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateHabit()}
              placeholder="Ex.: Meditar 10 minutos"
              className="w-full rounded-md border border-[var(--ledger-paper-border)] bg-transparent px-4 py-3 text-sm outline-none focus:border-purple-500 mb-4"
              maxLength={120}
              autoFocus
            />
            <button
              onClick={handleCreateHabit}
              disabled={!habitTitle.trim() || saving}
              className={primaryBtn}
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {saving ? "Criando..." : "Criar hábito (+25 XP)"}
            </button>
            <button
              onClick={next}
              className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Pular esta etapa
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Space Grotesk" }}>
              Você está pronto!
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              {progress > 0 ? (
                <>Você já ganhou <span className="text-purple-400 font-semibold">+{progress} XP</span> e sua jornada começou.</>
              ) : (
                <>Sua jornada começa agora. Volte todo dia para manter seu streak! 🔥</>
              )}
            </p>
            {isInstallable && (
              <button
                onClick={installApp}
                className="w-full rounded-md py-3 px-5 font-semibold mb-3 flex items-center justify-center gap-2 text-white transition-transform active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                <Bell className="h-4 w-4" />
                Instalar o app no celular/PC
              </button>
            )}
            <button
              onClick={markDone}
              className="w-full rounded-md border border-[var(--ledger-paper-border)] py-3 px-5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              Ir para o dashboard
            </button>
          </div>
        )}

        {/* Botão pular em todas as etapas exceto done */}
        {step !== "done" && (
          <button
            onClick={markDone}
            className="absolute top-4 right-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Pular
          </button>
        )}
      </div>
    </div>
  );
}

/** Decide se o onboarding deve ser exibido para o usuário logado. */
export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) return false;
  } catch (_) {
    return false;
  }
  return true;
}
