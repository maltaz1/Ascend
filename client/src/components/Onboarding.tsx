import { useState, useCallback, useRef } from "react";
import { Sparkles, ArrowRight, Rocket, CheckCircle2, Bell } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { addTask, addHabit, getTodayString } from "@/lib/store";
import { usePWA } from "@/hooks/usePWA";
import { supabase } from "@/lib/supabase";

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
  const _storeData = useStore();
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
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("habits").insert({
          user_id: auth.user.id,
          title: habitTitle.trim(),
          emoji: habitEmoji,
          color: "#8b5cf6",
          frequency: "daily",
          target_days: 7,
          completed_dates: [],
        });
      }
      // Também adiciona ao estado local para aparecer imediatamente na UI
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

  const xp = progress > 0 ? `+${progress} XP` : "+25 XP";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center fz-modal-overlay p-4 ledger-modal-overlay">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-md border border-[var(--ledger-paper-border)] border-t-2 border-t-[var(--primary)] bg-[var(--ledger-paper-bg)] shadow-[8px_8px_0_rgba(0,0,0,0.35)]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Barra de progresso */}
        <div className="h-1 w-full bg-[var(--ledger-paper-border)]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "var(--primary)" }}
          />
        </div>

        {/* Botão pular em todas as etapas exceto done */}
        {step !== "done" && (
          <button
            onClick={markDone}
            className="absolute right-3.5 top-3.5 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-[3px] border border-[#3a3a47] text-white/30 transition hover:border-white/[0.15] hover:text-white/55"
            title="Pular onboarding"
          >
            ×
          </button>
        )}

        <div className="p-[30px_26px_26px]">
          {step === "welcome" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] shadow-[3px_5px_0_rgba(0,0,0,0.35)]">
                <Rocket className="h-7 w-7 text-white" />
              </div>
              <h2
                className="mb-2 text-[22px] font-semibold leading-[1.15] text-[var(--ink)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Bem-vindo ao <em className="not-italic text-[var(--primary)]">Ascend</em>!
              </h2>
              <p className="mb-1 text-[13px] font-light leading-relaxed text-[var(--ink-muted)]">
                Em menos de 60 segundos vamos configurar sua jornada: definir seu foco,
                criar sua primeira tarefa e seu primeiro hábito.
              </p>
              <p className="mb-[22px] text-[12px] leading-relaxed text-[var(--ink-muted)]">
                Cada ação vale XP — você já começa ganhando!
              </p>
              <button
                onClick={next}
                className="ledger-btn ledger-btn--violet w-full cursor-pointer"
                autoFocus
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === "focus" && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                <h2
                  className="text-[22px] font-semibold leading-[1.15] text-[var(--ink)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Qual é o seu foco agora?
                </h2>
              </div>
              <p className="mb-5 text-[12px] text-[var(--ink-muted)]">
                Pode mudar depois a qualquer momento.
              </p>
              <div className="grid grid-cols-2 gap-3">
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
                    className="fz-card flex flex-col items-center gap-1.5 p-4 text-center hover:border-[var(--primary)]"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[13px] font-medium text-[var(--ink)]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "firstTask" && (
            <div>
              <h2
                className="mb-1 text-[22px] font-semibold leading-[1.15] text-[var(--ink)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Sua primeira tarefa
              </h2>
              <p className="mb-5 text-[12px] text-[var(--ink-muted)]">
                Algo simples que você pode concluir hoje. Ao marcar como feita, você ganha XP.
              </p>
              <div className="ledger-marginalia mb-2">Tarefa *</div>
              <input
                type="text"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateTask()}
                placeholder="Ex.: Beber 2L de água hoje"
                className="ledger-input mb-4 w-full"
                maxLength={120}
                autoFocus
              />
              <button
                onClick={handleCreateTask}
                className="ledger-btn ledger-btn--violet mb-2 w-full cursor-pointer"
                disabled={!taskTitle.trim() || saving}
                style={{ opacity: !taskTitle.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? "Criando..." : `Criar tarefa (${xp})`}
              </button>
              <button
                onClick={next}
                className="ledger-btn ledger-btn--ghost w-full py-[11px] text-[12px] text-[var(--ink-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--ink)]"
              >
                Pular esta etapa
              </button>
            </div>
          )}

          {step === "firstHabit" && (
            <div>
              <h2
                className="mb-1 text-[22px] font-semibold leading-[1.15] text-[var(--ink)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Seu primeiro hábito
              </h2>
              <p className="mb-5 text-[12px] text-[var(--ink-muted)]">
                Pequenas repetições diárias constroem grandes resultados.
              </p>
              <div className="mb-3 flex gap-2">
                {["✨", "💪", "📚", "💧", "🏃", "🧘"].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setHabitEmoji(emoji)}
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[5px] border text-[18px] transition"
                    style={{
                      borderColor: habitEmoji === emoji ? "var(--primary)" : "var(--ledger-paper-border)",
                      background: habitEmoji === emoji ? "rgba(124,58,237,0.12)" : "transparent",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="ledger-marginalia mb-2">Hábito *</div>
              <input
                type="text"
                value={habitTitle}
                onChange={e => setHabitTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateHabit()}
                placeholder="Ex.: Meditar 10 minutos"
                className="ledger-input mb-4 w-full"
                maxLength={120}
                autoFocus
              />
              <button
                onClick={handleCreateHabit}
                className="ledger-btn ledger-btn--violet mb-2 w-full cursor-pointer"
                disabled={!habitTitle.trim() || saving}
                style={{ opacity: !habitTitle.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? "Criando..." : `Criar hábito (${xp})`}
              </button>
              <button
                onClick={next}
                className="ledger-btn ledger-btn--ghost w-full py-[11px] text-[12px] text-[var(--ink-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--ink)]"
              >
                Pular esta etapa
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] shadow-[3px_5px_0_rgba(0,0,0,0.35)]">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <h2
                className="mb-2 text-[22px] font-semibold leading-[1.15] text-[var(--ink)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Você está pronto!
              </h2>
              <p className="mb-5 text-[13px] font-light leading-relaxed text-[var(--ink-muted)]">
                {progress > 0 ? (
                  <>Você já ganhou <span className="font-semibold text-[var(--primary)]">+{progress} XP</span> e sua jornada começou.</>
                ) : (
                  <>Sua jornada começa agora. Volte todo dia para manter seu streak!</>
                )}
              </p>
              {isInstallable && (
                <button
                  onClick={installApp}
                  className="ledger-btn ledger-btn--violet mb-2 w-full cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  Instalar o app no celular/PC
                </button>
              )}
              <button
                onClick={markDone}
                className="ledger-btn ledger-btn--ghost w-full py-[11px] text-[12px] text-[var(--ink-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--ink)]"
              >
                Ir para o dashboard
              </button>
            </div>
          )}
        </div>
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
