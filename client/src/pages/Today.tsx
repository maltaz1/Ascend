// FlowZone Today — Supabase Synced (Visual Original Mantido)

import React, { useEffect, useMemo, useState } from "react";
import { Check, Sun, Target, Flame } from "lucide-react";
import { addXP } from "@/lib/store";
import { supabase } from "@/lib/supabase";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { showToast } from "@/components/ui/FlowToast";

export default function Today() {
  const today = new Date().toISOString().split("T")[0];

  const [profile, setProfile] = useState<any>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  const loadData = async () => {
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id);

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id);

    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    setProfile(profileData);
    setTasks(tasksData || []);
    setHabits(habitsData || []);
    setGoals(goalsData || []);
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const todayTasks = tasks.filter(t => t.date === today);

  const activeGoals = goals.filter(g => !g.completed_at).slice(0, 4);

  const todayStats = useMemo(() => {
    const tasksCompleted = tasks.filter(
      t => t.completed && t.date === today
    ).length;

    const tasksTotal = tasks.filter(t => t.date === today).length;

    const habitsCompleted = habits.filter(h =>
      (h.completed_dates || []).includes(today)
    ).length;

    return {
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal: habits.length,
    };
  }, [tasks, habits, today]);

  const overallProgress =
    todayStats.tasksTotal > 0 || todayStats.habitsTotal > 0
      ? Math.round(
          ((todayStats.tasksCompleted + todayStats.habitsCompleted) /
            (todayStats.tasksTotal + todayStats.habitsTotal)) *
            100
        )
      : 0;

  const levelProgress = {
    current: profile?.xp || 0,

    max: (profile?.level || 1) * 100,

    percent: profile?.xp
      ? (profile.xp / ((profile.level || 1) * 100)) * 100
      : 0,
  };

  const handleToggleTask = async (
    taskId: string,
    completed: boolean,
    e: React.MouseEvent
  ) => {
    await supabase
      .from("tasks")
      .update({
        completed: !completed,
      })
      .eq("id", taskId);

    showToast(completed ? "Tarefa desmarcada" : "Tarefa concluída!", "success");

    if (!completed) {
      await addXP(10);
    }

    loadData();
  };

  const handleToggleHabit = async (habitId: string, e: React.MouseEvent) => {
    const habit = habits.find(h => h.id === habitId);

    if (!habit) return;

    const completedDates = habit.completed_dates || [];

    const isCompleted = completedDates.includes(today);

    const updatedDates = isCompleted
      ? completedDates.filter((d: string) => d !== today)
      : [...completedDates, today];

    await supabase
      .from("habits")
      .update({
        completed_dates: updatedDates,
      })
      .eq("id", habitId);

    showToast(
      isCompleted ? "Hábito desmarcado" : "Hábito concluído!",
      "success"
    );

    if (!isCompleted) {
      await addXP(5);
    }

    loadData();
  };

  const getGoalProgress = (goal: any) => {
    if (!goal.steps || goal.steps.length === 0) return 0;

    const completed = goal.steps.filter((s: any) => s.completed).length;

    return Math.round((completed / goal.steps.length) * 100);
  };

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Bom dia";

    if (hour < 18) return "Boa tarde";

    return "Boa noite";
  };

  if (!profile) {
    return (
      <div
        style={{
          color: "white",
          padding: 20,
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}

      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <Sun size={24} color="#A855F7" />

          <h1
            style={{
              fontFamily: "Space Grotesk",
              fontWeight: 800,
              fontSize: 28,
              color: "var(--foreground)",
            }}
          >
            {greeting()}, {profile?.name}!
          </h1>
        </div>

        <p
          style={{
            fontFamily: "DM Sans",
            fontSize: 14,
            color: "var(--muted-foreground)",
          }}
        >
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Overall Progress Ring */}

      <div
        className="fz-card today-summary-card"
        style={{
          padding: "24px",
          marginBottom: 20,

          background:
            "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(168,85,247,0.05))",

          border: "1px solid rgba(168,85,247,0.15)",

          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <CircularProgress
          value={overallProgress}
          size={100}
          strokeWidth={7}
          color="#A855F7"
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 800,
                fontSize: 20,
                color: "#A855F7",
              }}
            >
              {overallProgress}%
            </div>
          </div>
        </CircularProgress>

        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--foreground)",
              marginBottom: 6,
            }}
          >
            Progresso do Dia
          </h2>

          <p
            style={{
              fontFamily: "DM Sans",
              fontSize: 14,
              color: "var(--muted-foreground)",
              marginBottom: 14,
            }}
          >
            {overallProgress === 100
              ? "🎉 Dia perfeito! Todas as tarefas concluídas!"
              : overallProgress >= 50
                ? "💪 Você está indo muito bem hoje!"
                : overallProgress > 0
                  ? "⚡ Continue assim, você está no caminho certo!"
                  : "🌅 Comece o dia marcando suas primeiras tarefas!"}
          </p>

          <div
            className="today-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                icon: "✅",
                label: "Tarefas",
                value: `${todayStats.tasksCompleted}/${todayStats.tasksTotal}`,
                color: "#10B981",
              },

              {
                icon: "🔥",
                label: "Hábitos",
                value: `${todayStats.habitsCompleted}/${todayStats.habitsTotal}`,
                color: "#F59E0B",
              },

              {
                icon: "⚡",
                label: "Streak",
                value: `${profile?.streak || 0}d`,
                color: "#A855F7",
              },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: "var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    marginBottom: 4,
                  }}
                >
                  {stat.icon}
                </div>

                <div
                  style={{
                    fontFamily: "Space Grotesk",

                    fontWeight: 700,

                    fontSize: 16,

                    color: stat.color,
                  }}
                >
                  {stat.value}
                </div>

                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* XP Level */}

        <div
          style={{
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <CircularProgress
            value={levelProgress.percent}
            size={72}
            strokeWidth={5}
            color="#A855F7"
          >
            <div>
              <div
                style={{
                  fontFamily: "Space Grotesk",

                  fontWeight: 800,

                  fontSize: 16,

                  color: "#A855F7",
                }}
              >
                {profile?.level || 1}
              </div>

              <div
                style={{
                  fontSize: 9,
                  color: "var(--muted-foreground)",

                  fontFamily: "DM Sans",
                }}
              >
                NV
              </div>
            </div>
          </CircularProgress>

          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: "var(--muted-foreground)",
              marginTop: 6,
            }}
          >
            {levelProgress.current}/{levelProgress.max} XP
          </div>
        </div>
      </div>

      <div
        className="today-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Today's Tasks */}

        <div className="fz-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Check size={16} color="#10B981" />

            <h3
              style={{
                fontFamily: "Space Grotesk",

                fontWeight: 700,

                fontSize: 15,

                color: "var(--foreground)",

                flex: 1,
              }}
            >
              Tarefas de Hoje
            </h3>

            <span
              style={{
                fontFamily: "Space Grotesk",

                fontWeight: 700,

                fontSize: 12,

                color:
                  todayStats.tasksCompleted === todayStats.tasksTotal &&
                  todayStats.tasksTotal > 0
                    ? "#10B981"
                    : "#A855F7",
              }}
            >
              {todayStats.tasksCompleted}/{todayStats.tasksTotal}
            </span>
          </div>

          {todayTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 8,
                }}
              >
                📋
              </div>

              <p
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                }}
              >
                Nenhuma tarefa para hoje
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  onClick={e => handleToggleTask(task.id, task.completed, e)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,

                    padding: "10px 12px",

                    background: task.completed
                      ? "rgba(16,185,129,0.06)"
                      : "var(--border)",

                    border: `1px solid ${
                      task.completed ? "rgba(16,185,129,0.2)" : "var(--border)"
                    }`,

                    borderRadius: 10,

                    cursor: "pointer",

                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    className={`fz-checkbox ${task.completed ? "checked" : ""}`}
                  >
                    {task.completed && <Check size={12} color="white" />}
                  </div>

                  <span
                    style={{
                      fontFamily: "DM Sans",

                      fontWeight: 500,

                      fontSize: 13,

                      color: task.completed
                        ? "var(--muted-foreground)"
                        : "var(--foreground)",

                      textDecoration: task.completed ? "line-through" : "none",

                      flex: 1,

                      overflow: "hidden",

                      textOverflow: "ellipsis",

                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </span>

                  {task.priority === "high" && !task.completed && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#EF4444",
                        fontFamily: "Space Grotesk",
                        fontWeight: 600,
                      }}
                    >
                      ALTA
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Habits Today */}

        <div className="fz-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Flame size={16} color="#A855F7" />

            <h3
              style={{
                fontFamily: "Space Grotesk",

                fontWeight: 700,

                fontSize: 15,

                color: "var(--foreground)",

                flex: 1,
              }}
            >
              Hábitos de Hoje
            </h3>

            <span
              style={{
                fontFamily: "Space Grotesk",

                fontWeight: 700,

                fontSize: 12,

                color: "#A855F7",
              }}
            >
              {todayStats.habitsCompleted}/{todayStats.habitsTotal}
            </span>
          </div>

          {habits.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 8,
                }}
              >
                🔥
              </div>

              <p
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                }}
              >
                Nenhum hábito criado
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {habits.map(habit => {
                const isCompleted = (habit.completed_dates || []).includes(
                  today
                );

                return (
                  <div
                    key={habit.id}
                    onClick={e => handleToggleHabit(habit.id, e)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,

                      padding: "10px 12px",

                      background: isCompleted
                        ? `${habit.color}10`
                        : "var(--border)",

                      border: `1px solid ${
                        isCompleted ? `${habit.color}25` : "var(--border)"
                      }`,

                      borderRadius: 10,

                      cursor: "pointer",

                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",

                        background: isCompleted ? habit.color : "var(--border)",

                        border: `2px solid ${
                          isCompleted ? habit.color : "var(--muted-foreground)"
                        }`,

                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",

                        flexShrink: 0,

                        transition: "all 0.2s ease",

                        boxShadow: isCompleted
                          ? `0 0 8px ${habit.color}60`
                          : "none",
                      }}
                    >
                      {isCompleted && <Check size={11} color="white" />}
                    </div>

                    <span style={{ fontSize: 16 }}>{habit.emoji}</span>

                    <span
                      style={{
                        fontFamily: "DM Sans",

                        fontWeight: 500,

                        fontSize: 13,

                        color: isCompleted
                          ? "var(--muted-foreground)"
                          : "var(--foreground)",

                        textDecoration: isCompleted ? "line-through" : "none",

                        flex: 1,
                      }}
                    >
                      {habit.title}
                    </span>

                    {isCompleted && (
                      <span
                        style={{
                          fontSize: 14,
                        }}
                      >
                        ✅
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Goals */}

      {activeGoals.length > 0 && (
        <div
          className="fz-card"
          style={{
            padding: "20px 22px",
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Target size={16} color="#A855F7" />

            <h3
              style={{
                fontFamily: "Space Grotesk",

                fontWeight: 700,

                fontSize: 15,

                color: "var(--foreground)",
              }}
            >
              Metas em Andamento
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",

              gap: 12,
            }}
          >
            {activeGoals.map(goal => {
              const progress = getGoalProgress(goal);

              return (
                <div
                  key={goal.id}
                  style={{
                    background: "var(--border)",

                    border: `1px solid ${goal.color}20`,

                    borderRadius: 12,

                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{goal.emoji}</span>

                    <span
                      style={{
                        fontFamily: "DM Sans",

                        fontWeight: 500,

                        fontSize: 13,

                        color: "var(--foreground)",

                        flex: 1,

                        overflow: "hidden",

                        textOverflow: "ellipsis",

                        whiteSpace: "nowrap",
                      }}
                    >
                      {goal.title}
                    </span>

                    <span
                      style={{
                        fontFamily: "Space Grotesk",

                        fontWeight: 700,

                        fontSize: 13,

                        color: goal.color,
                      }}
                    >
                      {progress}%
                    </span>
                  </div>

                  <div className="fz-progress-bar">
                    <div
                      className="fz-progress-fill"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      fontFamily: "DM Sans",
                      marginTop: 6,
                    }}
                  >
                    {goal.steps.filter((s: any) => s.completed).length}/
                    {goal.steps.length} etapas
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .today-summary-card {
            flex-direction: column !important;
            gap: 16px !important;
          }

          .today-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .today-summary-card {
            flex-direction: column !important;
            gap: 12px !important;
          }

          .today-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .today-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
