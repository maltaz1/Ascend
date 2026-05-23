import React, { useState, useRef, useEffect } from "react";

import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  Trophy,
  Sparkles,
} from "lucide-react";

import { useXPAnimation } from "@/hooks/useStore";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";

import { supabase } from "@/lib/supabase";

// =========================
// TYPES
// =========================

type GoalStep = {
  id: string;
  title: string;
  completed: boolean;
};

type Goal = {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color: string;
  deadline?: string;
  steps: GoalStep[];
  completed_at?: string | null;
};

// =========================
// HELPERS
// =========================

function generateId() {
  return crypto.randomUUID();
}

function getGoalProgress(goal: Goal) {
  if (!goal.steps || goal.steps.length === 0) {
    return 0;
  }

  const completed = goal.steps.filter(s => s.completed).length;

  return (completed / goal.steps.length) * 100;
}

// =========================
// CONSTANTS
// =========================

const EMOJIS = [
  "🎯",
  "🚀",
  "💪",
  "📚",
  "💰",
  "🏃",
  "🎨",
  "🧠",
  "❤️",
  "🌟",
  "🏆",
  "⚡",
  "🔥",
  "💎",
  "🌙",
  "🎵",
  "✈️",
  "🏠",
  "💻",
  "🌱",
];

const COLORS = [
  "#F59E0B",
  "#A855F7",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const GOAL_COLORS_MAP: Record<
  string,
  {
    gradient: string;
    glow: string;
    light: string;
  }
> = {
  "#F59E0B": {
    gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)",
    glow: "rgba(245,158,11,0.2)",
    light: "rgba(245,158,11,0.08)",
  },

  "#A855F7": {
    gradient: "linear-gradient(135deg, #A855F7, #C084FC)",
    glow: "rgba(168,85,247,0.2)",
    light: "rgba(168,85,247,0.08)",
  },

  "#10B981": {
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    glow: "rgba(16,185,129,0.2)",
    light: "rgba(16,185,129,0.08)",
  },

  "#3B82F6": {
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    glow: "rgba(59,130,246,0.2)",
    light: "rgba(59,130,246,0.08)",
  },

  "#EF4444": {
    gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    glow: "rgba(239,68,68,0.2)",
    light: "rgba(239,68,68,0.08)",
  },

  "#EC4899": {
    gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    glow: "rgba(236,72,153,0.2)",
    light: "rgba(236,72,153,0.08)",
  },

  "#06B6D4": {
    gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    glow: "rgba(6,182,212,0.2)",
    light: "rgba(6,182,212,0.08)",
  },

  "#84CC16": {
    gradient: "linear-gradient(135deg, #84CC16, #A3E635)",
    glow: "rgba(132,204,22,0.2)",
    light: "rgba(132,204,22,0.08)",
  },
};

// =========================
// GOAL CARD
// =========================

function GoalCard({
  goal,
  reloadGoals,
}: {
  goal: Goal;
  reloadGoals: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { showXP } = useXPAnimation();

  const cardRef = useRef<HTMLDivElement>(null);

  const progress = getGoalProgress(goal);

  const colorInfo = GOAL_COLORS_MAP[goal.color] || GOAL_COLORS_MAP["#A855F7"];

  const isCompleted = !!goal.completed_at;

  const handleToggleStep = async (stepId: string) => {
    const updatedSteps = goal.steps.map(step =>
      step.id === stepId
        ? {
            ...step,
            completed: !step.completed,
          }
        : step
    );

    const allCompleted = updatedSteps.every(s => s.completed);

    await supabase
      .from("goals")
      .update({
        steps: updatedSteps,
        completed_at: allCompleted ? new Date().toISOString() : null,
      })
      .eq("id", goal.id);

    const rect = cardRef.current?.getBoundingClientRect();

    if (rect) {
      showXP(10, rect.left + rect.width / 2, rect.top);
    }

    reloadGoals();
  };

  const handleDelete = async () => {
    await supabase.from("goals").delete().eq("id", goal.id);

    showToast("Meta deletada", "info", "🗑️");

    reloadGoals();
  };

  return (
    <div
      ref={cardRef}
      className="fz-card animate-fade-in"
      style={{
        padding: 24,
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
        background: isCompleted
          ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.04))"
          : `linear-gradient(135deg, ${colorInfo.light}, rgba(255,255,255,0.02))`,
        border: isCompleted
          ? "1px solid rgba(16,185,129,0.3)"
          : `1px solid ${goal.color}30`,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <CircularProgress
          value={progress}
          size={60}
          strokeWidth={4}
          color={isCompleted ? "#10B981" : goal.color}
        >
          <span style={{ fontSize: 24 }}>{goal.emoji}</span>
        </CircularProgress>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {goal.title}
          </h3>

          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
            }}
          >
            {goal.description}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: goal.color,
          }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: colorInfo.gradient,
          }}
        />
      </div>

      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {goal.steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${goal.color}20`,
                background: step.completed
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: step.completed ? "#10B981" : "transparent",
                  border: `2px solid ${
                    step.completed ? "#10B981" : goal.color
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.completed && <Check size={11} color="white" />}
              </div>

              <span
                style={{
                  textDecoration: step.completed ? "line-through" : "none",
                }}
              >
                {step.title}
              </span>
            </button>
          ))}

          <button
            onClick={handleDelete}
            style={{
              marginTop: 10,
              padding: "12px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.1)",
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Trash2 size={15} />
            Deletar meta
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// MODAL
// =========================

function NewGoalModal({
  open,
  onClose,
  reloadGoals,
}: {
  open: boolean;
  onClose: () => void;
  reloadGoals: () => void;
}) {
  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [emoji, setEmoji] = useState("🎯");

  const [color, setColor] = useState("#A855F7");

  const [deadline, setDeadline] = useState("");

  const [steps, setSteps] = useState<string[]>([""]);

  const handleAddStep = () => {
    setSteps([...steps, ""]);
  };

  const handleStepChange = (i: number, value: string) => {
    const updated = [...steps];

    updated[i] = value;

    setSteps(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("Digite o nome da meta", "info", "⚠️");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("Usuário não encontrado", "info", "❌");
      return;
    }

    const validSteps = steps
      .filter(s => s.trim())
      .map(s => ({
        id: crypto.randomUUID(),
        title: s,
        completed: false,
      }));

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,

      title: title.trim(),
      description: description || null,

      emoji,
      color,

      deadline: deadline || null,

      steps: validSteps,

      completed_at: null,
    });

    if (error) {
      console.log(error);

      showToast("Erro ao criar meta", "info", "❌");

      return;
    }

    showToast("Meta criada com sucesso!", "success", "🎯");

    setTitle("");
    setDescription("");
    setEmoji("🎯");
    setColor("#A855F7");
    setDeadline("");
    setSteps([""]);

    onClose();

    window.location.reload();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova Meta">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <input
          placeholder="Nome da meta"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="fz-input"
        />

        <textarea
          placeholder="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="fz-input"
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {EMOJIS.map(e => {
            const selected = emoji === e;

            return (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: selected
                    ? `2px solid ${color}`
                    : "1px solid rgba(255,255,255,0.08)",

                  background: selected
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.04)",

                  cursor: "pointer",

                  fontSize: 22,

                  transition: "all .2s ease",

                  transform: selected ? "scale(1.08)" : "scale(1)",
                }}
              >
                {e}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {COLORS.map(c => {
            const selected = color === c;

            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 36,
                  height: 36,

                  borderRadius: "50%",

                  border: selected
                    ? "1px solid white"
                    : "2px solid transparent",

                  background: c,

                  cursor: "pointer",

                  transition: "all .2s ease",

                  transform: selected ? "scale(1.15)" : "scale(1)",

                  boxShadow: selected ? `0 0 5px ${c}` : "0 0 0 transparent",
                }}
              />
            );
          })}
        </div>

        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="fz-input"
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {steps.map((step, i) => (
            <input
              key={i}
              placeholder={`Etapa ${i + 1}`}
              value={step}
              onChange={e => handleStepChange(i, e.target.value)}
              className="fz-input"
            />
          ))}

          <button
            type="button"
            onClick={handleAddStep}
            className="fz-btn-secondary"
          >
            <Plus size={14} />
            Adicionar etapa
          </button>
        </div>

        <button onClick={handleSubmit} className="fz-btn-primary">
          Criar Meta
        </button>
      </div>
    </Modal>
  );
}

// =========================
// MAIN
// =========================

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [filter, setFilter] = useState<"all" | "ongoing" | "completed">("all");

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log(error);
      return;
    }

    setGoals(data || []);
  };

  const filteredGoals =
    filter === "all"
      ? goals
      : filter === "ongoing"
        ? goals.filter(g => !g.completed_at)
        : goals.filter(g => g.completed_at);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Target size={26} />
          Metas
        </h2>

        <button onClick={() => setShowModal(true)} className="fz-btn-primary">
          Nova Meta
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
        }}
      >
        {[
          {
            value: "ongoing",
            label: "Em andamento",
          },

          {
            value: "completed",
            label: "Concluídas",
          },

          {
            value: "all",
            label: "Todas",
          },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={
              filter === f.value ? "fz-btn-primary" : "fz-btn-secondary"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredGoals.length === 0 ? (
        <div
          className="fz-card"
          style={{
            padding: 60,
            textAlign: "center",
          }}
        >
          <Trophy
            size={48}
            style={{
              opacity: 0.4,
              marginBottom: 16,
            }}
          />

          <p>Nenhuma meta encontrada.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {filteredGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} reloadGoals={loadGoals} />
          ))}
        </div>
      )}

      <NewGoalModal
        open={showModal}
        onClose={() => setShowModal(false)}
        reloadGoals={loadGoals}
      />
    </div>
  );
}
