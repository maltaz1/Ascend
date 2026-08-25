// FlowZone Today — Supabase Synced (Visual Original Mantido)

import React, { useEffect, useMemo } from "react";
import { CalendarDays, Check, Sun, Target, Flame, ListTodoIcon } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { loadGoalsData, toggleHabitDate, updateTask } from "@/lib/store";
import { syncHabitToGoals } from "@/lib/syncHabitGoals";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { showToast } from "@/components/ui/FlowToast";
import { getTodayString } from "@/store/utils";
import type { Goal as StoreGoal, Habit } from "@/store/types";
import { getMondayOfDate, getLinkedHabitWeekCheckins } from "@/lib/weeklyGoals";
import { awardXp, createXpPayload } from "@/store/xp-engine";

const WEEKDAY_SHORT = ["S", "T", "Q", "Q", "S", "S", "D"];
const EMPTY_WEEK = [false, false, false, false, false, false, false];

function getWeekDateStrings(monday: string): string[] {
  return EMPTY_WEEK.map((_, index) => {
    const date = new Date(`${monday}T12:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function getWeeklyGoalSnapshot(goal: StoreGoal, habits: Habit[], weekStart: string) {
  const weekBelongsToCurrentPeriod = !goal.weekStart || goal.weekStart === weekStart;
  const storedDays = weekBelongsToCurrentPeriod
    ? Array.from({ length: 7 }, (_, index) => Boolean(goal.daysCompletedWeek?.[index]))
    : [...EMPTY_WEEK];
  const linkedHabit = goal.linkedHabitId ? habits.find(habit => habit.id === goal.linkedHabitId) : undefined;
  const linkedDays = linkedHabit
    ? getLinkedHabitWeekCheckins(
        { id: linkedHabit.id, completed_dates: linkedHabit.completedDates },
        weekStart,
      )
    : undefined;
  // Quando existe hábito vinculado, seus check-ins são a fonte de verdade.
  // Isso faz o desmarcamento refletir imediatamente na aba Hoje.
  const days = linkedDays ?? storedDays;
  const target = Math.max(1, goal.targetFrequency ?? 1);
  const completed = days.filter(Boolean).length;

  return {
    days,
    target,
    completed,
    percent: Math.min(100, Math.round((completed / target) * 100)),
  };
}

export default function Today() {
 const today = getTodayString();
 const store = useStore();
 const { user: profile, tasks, habits, goals } = store;

 const todayTasks = useMemo(() => tasks.filter(t => t.date === today), [tasks, today]);
 const currentWeekStart = useMemo(() => getMondayOfDate(new Date(`${today}T12:00:00`)), [today]);
 const currentWeekDates = useMemo(() => getWeekDateStrings(currentWeekStart), [currentWeekStart]);
 const weeklyGoals = useMemo(
   () => goals.filter(goal => goal.type === "semanal").sort((a, b) => a.title.localeCompare(b.title)),
   [goals],
 );
 const longTermGoals = useMemo(
   () => goals.filter(goal => goal.type !== "semanal").sort((a, b) => a.title.localeCompare(b.title)),
   [goals],
 );

 useEffect(() => {
   let refreshInFlight = false;

   const refreshIfWeekChanged = () => {
     const expectedWeekStart = getMondayOfDate(new Date());
     const hasStaleWeeklyGoal = goals.some(
       goal => goal.type === "semanal" && goal.weekStart && goal.weekStart < expectedWeekStart,
     );

     if ((expectedWeekStart !== currentWeekStart || hasStaleWeeklyGoal) && !refreshInFlight) {
       refreshInFlight = true;
       void loadGoalsData().finally(() => {
         refreshInFlight = false;
       });
     }
   };

   refreshIfWeekChanged();
   const intervalId = window.setInterval(refreshIfWeekChanged, 60_000);
   window.addEventListener("focus", refreshIfWeekChanged);
   document.addEventListener("visibilitychange", refreshIfWeekChanged);

   return () => {
     window.clearInterval(intervalId);
     window.removeEventListener("focus", refreshIfWeekChanged);
     document.removeEventListener("visibilitychange", refreshIfWeekChanged);
   };
 }, [currentWeekStart, goals]);

 const todayStats = useMemo(() => {
 const tasksCompleted = todayTasks.filter(t => t.completed).length;
 const tasksTotal = todayTasks.length;
 const habitsCompleted = habits.filter(h =>
 (h.completedDates || []).includes(today)
 ).length;

 return {
 tasksCompleted,
 tasksTotal,
 habitsCompleted,
 habitsTotal: habits.length,
 };
 }, [todayTasks, habits, today]);

 const overallProgress = useMemo(() =>
 todayStats.tasksTotal > 0 || todayStats.habitsTotal > 0
 ? Math.round(
 ((todayStats.tasksCompleted + todayStats.habitsCompleted) /
 (todayStats.tasksTotal + todayStats.habitsTotal)) *
 100
 )
 : 0
 , [todayStats]);

 const levelProgress = useMemo(() => {
 const max = (profile?.level || 1) * 100;
 return {
 current: profile?.xp || 0,
 max,
 percent: profile?.xp
 ? (profile.xp / max) * 100
 : 0,
 };
 }, [profile]);

 const handleToggleTask = (
 taskId: string,
 completed: boolean,
 e: React.MouseEvent
 ) => {
 e.stopPropagation();
 void updateTask(taskId, { completed: !completed });
 showToast(completed ? "Tarefa desmarcada" : "Tarefa concluída!", "success");

 if (!completed) {
 void awardXp(createXpPayload("TASK_COMPLETED", 10));
 }
 };

 const handleToggleHabit = (habitId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 const habit = habits.find(h => h.id === habitId);
 if (!habit) return;

 const isCompleted = (habit.completedDates || []).includes(today);
 void toggleHabitDate(habitId, today);
 // Sincronizar com metas semanais vinculadas a este hábito
 const updatedDates = isCompleted
 ? (habit.completedDates || []).filter((d) => d !== today)
 : [...(habit.completedDates || []), today];
 void syncHabitToGoals({ id: habitId, completed_dates: updatedDates });
 showToast(
 isCompleted ? "Hábito desmarcado" : "Hábito concluído!",
 "success"
 );
 };

 const getGoalProgress = (goal: StoreGoal) => {
 if (!goal.steps || goal.steps.length === 0) return 0;
 const completed = goal.steps.filter(step => step.completed).length;
 return Math.round((completed / goal.steps.length) * 100);
 };

 const greeting = () => {
 const hour = new Date().getHours();
 if (hour < 12) return "Bom dia";
 if (hour < 18) return "Boa tarde";
 return "Boa noite";
 };

 if (!profile || !profile.name) {
 return (
 <div style={{ color: "white", padding: 20 }}>
 Carregando...
 </div>
 );
 }

 return (
 <div className="animate-fade-in">
 {/* Header — folha solta de caderno */}
 <div className="notebook-sheet notebook-sheet--margined" style={{ marginBottom: 28 }}>
 {/* furos de espiral na margem */}
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 10,
 marginBottom: 4,
 }}
 ><Sun size={24} color="var(--primary)" /><h1
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 800,
 fontSize: 28,
 color: "var(--foreground)",
 }}
 >
 {greeting()}, {profile?.name}!
 </h1></div><p
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
 className="ledger-paper flex lg:flex-row flex-col gap-4 lg:gap-6 p-6 mb-5"
 style={{
 background: "var(--ledger-paper-bg)",
 border: "1px solid var(--ledger-paper-border)",
 display: "flex",
 alignItems: "center",
 gap: 24,
 }}
 ><CircularProgress
 value={overallProgress}
 size={100}
 strokeWidth={7}
 color="var(--primary)"
 ><div style={{ textAlign: "center" }}><div
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 800,
 fontSize: 20,
 color: "var(--primary)",
 }}
 >
 {overallProgress}%
 </div></div></CircularProgress><div style={{ flex: 1 }}><h2
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 20,
 color: "var(--foreground)",
 marginBottom: 6,
 }}
 >
 Progresso do Dia
 </h2><p
 style={{
 fontFamily: "DM Sans",
 fontSize: 14,
 color: "var(--muted-foreground)",
 marginBottom: 14,
 }}
 >
 {overallProgress === 100
 ? " Dia perfeito! Todas as tarefas concluídas!"
 : overallProgress >= 50
 ? " Você está indo muito bem hoje!"
 : overallProgress > 0
 ? " Continue assim, você está no caminho certo!"
 : " Comece o dia marcando as primeiras tarefas!"}
 </p><div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3">
 {[
 {
 icon: " ",
 label: "Tarefas",
 value: `${todayStats.tasksCompleted}/${todayStats.tasksTotal}`,
 color: "#10B981",
 },
 {
 icon: " ",
 label: "Hábitos",
 value: `${todayStats.habitsCompleted}/${todayStats.habitsTotal}`,
 color: "var(--accent)",
 },
 {
 icon: " ",
 label: "Streak",
 value: `${profile?.streak || 0}d`,
 color: "var(--primary)",
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
 ><div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div><div
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 16,
 color: stat.color,
 }}
 >
 {stat.value}
 </div><div
 style={{
 fontFamily: "DM Sans",
 fontSize: 11,
 color: "var(--muted-foreground)",
 }}
 >
 {stat.label}
 </div></div>
 ))}
 </div></div>

 {/* XP Level */}
 <div style={{ textAlign: "center", flexShrink: 0 }}><CircularProgress
 value={levelProgress.percent}
 size={72}
 strokeWidth={5}
 color="var(--primary)"
 ><div><div
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 800,
 fontSize: 16,
 color: "var(--primary)",
 }}
 >
 {profile?.level || 1}
 </div><div
 style={{
 fontSize: 9,
 color: "var(--muted-foreground)",
 fontFamily: "DM Sans",
 }}
 >
 NV
 </div></div></CircularProgress><div
 style={{
 fontFamily: "DM Sans",
 fontSize: 11,
 color: "var(--muted-foreground)",
 marginTop: 6,
 }}
 >
 {levelProgress.current}/{levelProgress.max} XP
 </div></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 {/* Today's Tasks */}
 <div className="ledger-paper" style={{ padding: "20px 22px" }}><div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 16,
 }}
 ><Check size={16} color="#10B981" /><h3
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 15,
 color: "var(--foreground)",
 flex: 1,
 }}
 >
 Tarefas de Hoje
 </h3><span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 12,
 color:
 todayStats.tasksCompleted === todayStats.tasksTotal &&
 todayStats.tasksTotal > 0
 ? "#10B981"
 : "var(--primary)",
 }}
 >
 {todayStats.tasksCompleted}/{todayStats.tasksTotal}
 </span></div>

 {todayTasks.length === 0 ? (
 <div style={{ textAlign: "center", padding: "24px 0" }}><div style={{ marginBottom: 8, color: "var(--muted-foreground)", display: "flex", justifyContent: "center" }}><ListTodoIcon size={30} strokeWidth={1.25} /></div><p
 style={{
 fontFamily: "DM Sans",
 fontSize: 13,
 color: "var(--muted-foreground)",
 }}
 >
 Nenhuma tarefa para hoje
 </p></div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
 ><div className={`fz-checkbox ${task.completed ? "checked" : ""}`}>
 {task.completed && <Check size={12} color="white" />}
 </div><span
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
 <div className="ledger-paper" style={{ padding: "20px 22px" }}><div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 16,
 }}
 ><Flame size={16} color="var(--primary)" /><h3
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 15,
 color: "var(--foreground)",
 flex: 1,
 }}
 >
 Hábitos de Hoje
 </h3><span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 12,
 color: "var(--primary)",
 }}
 >
 {todayStats.habitsCompleted}/{todayStats.habitsTotal}
 </span></div>

 {habits.length === 0 ? (
 <div style={{ textAlign: "center", padding: "24px 0" }}><div style={{ fontSize: 32, marginBottom: 8 }}> </div><p
 style={{
 fontFamily: "DM Sans",
 fontSize: 13,
 color: "var(--muted-foreground)",
 }}
 >
 Nenhum hábito criado
 </p></div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
 {habits.map(habit => {
 const isCompleted = (habit.completedDates || []).includes(today);
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
 ><div
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
 </div><span style={{ fontSize: 16 }}>{habit.emoji}</span><span
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
 {isCompleted && <span style={{ fontSize: 14 }}> </span>}
 </div>
 );
 })}
 </div>
 )}
 </div></div>

 {/* Goals */}
 {goals.length > 0 ? (
 <div
 className="ledger-paper"
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
 marginBottom: 18,
 }}
 >
 <Target size={16} color="var(--primary)" />
 <div style={{ flex: 1 }}>
 <h3
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 15,
 color: "var(--foreground)",
 margin: 0,
 }}
 >
 Metas
 </h3>
 <p
 style={{
 fontFamily: "DM Sans",
 fontSize: 11,
 color: "var(--muted-foreground)",
 margin: "3px 0 0",
 }}
 >
 Acompanhe o progresso de todos os seus objetivos.
 </p>
 </div>
 <span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 12,
 color: "var(--primary)",
 }}
 >
 {goals.length} {goals.length === 1 ? "meta" : "metas"}
 </span>
 </div>

 {weeklyGoals.length > 0 && (
 <section style={{ marginBottom: longTermGoals.length > 0 ? 22 : 0 }}>
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 7,
 marginBottom: 12,
 }}
 >
 <CalendarDays size={15} color="var(--primary)" />
 <h4
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 13,
 color: "var(--foreground)",
 margin: 0,
 flex: 1,
 }}
 >
 Metas semanais
 </h4>
 <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
 Reinicia toda segunda-feira
 </span>
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
 gap: 10,
 }}
 >
 {weeklyGoals.map(goal => {
 const weekly = getWeeklyGoalSnapshot(goal, habits, currentWeekStart);
 const linkedHabit = goal.linkedHabitId ? habits.find(habit => habit.id === goal.linkedHabitId) : undefined;
 return (
 <div
 key={goal.id}
 style={{
 background: "var(--border)",
 border: `1px solid ${goal.color}30`,
 borderRadius: 8,
 padding: "12px 13px",
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 9,
 }}
 >
 <span style={{ fontSize: 18 }}>{goal.emoji}</span>
 <span
 style={{
 fontFamily: "DM Sans",
 fontWeight: 600,
 fontSize: 13,
 color: "var(--foreground)",
 flex: 1,
 overflow: "hidden",
 textOverflow: "ellipsis",
 whiteSpace: "nowrap",
 }}
 title={goal.title}
 >
 {goal.title}
 </span>
 <span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 11,
 color: weekly.completed >= weekly.target ? "#10B981" : goal.color,
 whiteSpace: "nowrap",
 }}
 >
 {weekly.completed >= weekly.target ? "Atingida" : `${weekly.completed}/${weekly.target}`}
 </span>
 </div>
 <div className="fz-progress-bar" style={{ marginBottom: 10 }}>
 <div
 className="fz-progress-fill"
 style={{
 width: `${weekly.percent}%`,
 background: weekly.completed >= weekly.target
 ? "#10B981"
 : `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
 }}
 />
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
 gap: 4,
 }}
 >
 {weekly.days.map((completed, index) => {
 const date = currentWeekDates[index];
 const isToday = date === today;
 const isFuture = date > today;
 const dayNumber = new Date(`${date}T12:00:00`).getDate();
 return (
 <div
 key={date}
 title={`${WEEKDAY_SHORT[index]} ${dayNumber}: ${completed ? "concluída" : isFuture ? "ainda não chegou" : "pendente"}`}
 style={{
 display: "flex",
 flexDirection: "column",
 alignItems: "center",
 gap: 3,
 padding: "5px 2px",
 borderRadius: 5,
 border: isToday ? `1px solid ${goal.color}99` : "1px solid transparent",
 background: isToday ? `${goal.color}10` : "transparent",
 opacity: isFuture ? 0.45 : 1,
 }}
 >
 <span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: isToday ? 800 : 600,
 fontSize: 9,
 color: isToday ? goal.color : "var(--muted-foreground)",
 }}
 >
 {WEEKDAY_SHORT[index]}
 </span>
 <span
 style={{
 width: 20,
 height: 20,
 borderRadius: "50%",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 background: completed ? goal.color : "transparent",
 border: completed ? `1px solid ${goal.color}` : "1px solid var(--muted-foreground)",
 color: "white",
 }}
 >
 {completed ? <Check size={11} strokeWidth={3} /> : <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{dayNumber}</span>}
 </span>
 </div>
 );
 })}
 </div>
 <div
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 gap: 8,
 marginTop: 9,
 fontFamily: "DM Sans",
 fontSize: 10,
 color: "var(--muted-foreground)",
 }}
 >
 <span>{weekly.completed}/{weekly.target} concluídas na semana</span>
 {linkedHabit && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>↔ {linkedHabit.title}</span>}
 </div>
 </div>
 );
 })}
 </div>
 </section>
 )}

 {longTermGoals.length > 0 && (
 <section style={{ borderTop: weeklyGoals.length > 0 ? "1px solid var(--ledger-paper-border)" : "none", paddingTop: weeklyGoals.length > 0 ? 18 : 0 }}>
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 7,
 marginBottom: 12,
 }}
 >
 <Target size={15} color="var(--primary)" />
 <h4
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 13,
 color: "var(--foreground)",
 margin: 0,
 flex: 1,
 }}
 >
 Metas de longo prazo
 </h4>
 <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
 {longTermGoals.length} {longTermGoals.length === 1 ? "objetivo" : "objetivos"}
 </span>
 </div>
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
 gap: 10,
 }}
 >
 {longTermGoals.map(goal => {
 const progress = getGoalProgress(goal);
 const completedSteps = goal.steps.filter(step => step.completed).length;
 const isCompleted = Boolean(goal.completedAt);
 return (
 <div
 key={goal.id}
 style={{
 background: "var(--border)",
 border: `1px solid ${isCompleted ? "rgba(16,185,129,0.3)" : `${goal.color}20`}`,
 borderRadius: 8,
 padding: "12px 13px",
 }}
 >
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 9,
 }}
 >
 <span style={{ fontSize: 18 }}>{goal.emoji}</span>
 <span
 style={{
 fontFamily: "DM Sans",
 fontWeight: 600,
 fontSize: 13,
 color: isCompleted ? "var(--muted-foreground)" : "var(--foreground)",
 textDecoration: isCompleted ? "line-through" : "none",
 flex: 1,
 overflow: "hidden",
 textOverflow: "ellipsis",
 whiteSpace: "nowrap",
 }}
 title={goal.title}
 >
 {goal.title}
 </span>
 <span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 11,
 color: isCompleted ? "#10B981" : goal.color,
 }}
 >
 {isCompleted ? "Concluída" : `${progress}%`}
 </span>
 </div>
 <div className="fz-progress-bar">
 <div
 className="fz-progress-fill"
 style={{
 width: `${progress}%`,
 background: isCompleted ? "#10B981" : `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
 }}
 />
 </div>
 <div
 style={{
 fontSize: 10,
 color: "var(--muted-foreground)",
 fontFamily: "DM Sans",
 marginTop: 6,
 }}
 >
 {goal.steps.length > 0 ? `${completedSteps}/${goal.steps.length} etapas concluídas` : "Sem etapas cadastradas"}
 </div>
 </div>
 );
 })}
 </div>
 </section>
 )}
 </div>
 ) : (
 <div
 className="ledger-paper"
 style={{ padding: "20px 22px", marginTop: 20, textAlign: "center" }}
 >
 <Target size={28} color="var(--muted-foreground)" style={{ margin: "0 auto 8px" }} />
 <p style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
 Nenhuma meta cadastrada ainda.
 </p>
 </div>
 )}
 </div>
 );
}
