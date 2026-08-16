// FlowZone Today — Supabase Synced (Visual Original Mantido)

import React, { useMemo } from "react";
import { Check, Sun, Target, Flame, ListTodoIcon } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { toggleHabitDate, updateTask } from "@/lib/store";
import { syncHabitToGoals } from "@/lib/syncHabitGoals";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { showToast } from "@/components/ui/FlowToast";
import { getTodayString } from "@/store/utils";
import { awardXp, createXpPayload } from "@/store/xp-engine";

export default function Today() {
 const today = getTodayString();
 const store = useStore();
 const { user: profile, tasks, habits, goals } = store;

 const todayTasks = useMemo(() => tasks.filter(t => t.date === today), [tasks, today]);
 const activeGoals = useMemo(() => goals.filter(g => !g.completedAt).slice(0, 4), [goals]);

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
 className="ledger-paper ledger-paper--violet flex lg:flex-row flex-col gap-4 lg:gap-6 p-6 mb-5"
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
 <div className="ledger-paper ledger-paper--violet" style={{ padding: "20px 22px" }}><div
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
 <div className="ledger-paper ledger-paper--violet" style={{ padding: "20px 22px" }}><div
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

 {/* Active Goals */}
 {activeGoals.length > 0 && (
 <div
 className="ledger-paper ledger-paper--violet"
 style={{
 padding: "20px 22px",
 marginTop: 20,
 }}
 ><div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 16,
 }}
 ><Target size={16} color="var(--primary)" /><h3
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 15,
 color: "var(--foreground)",
 }}
 >
 Metas em Andamento
 </h3></div><div
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
 borderRadius: 6,
 padding: "14px 16px",
 }}
 ><div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 8,
 marginBottom: 10,
 }}
 ><span style={{ fontSize: 20 }}>{goal.emoji}</span><span
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
 </span><span
 style={{
 fontFamily: "Space Grotesk",
 fontWeight: 700,
 fontSize: 13,
 color: goal.color,
 }}
 >
 {progress}%
 </span></div><div className="fz-progress-bar"><div
 className="fz-progress-fill"
 style={{
 width: `${progress}%`,
 background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
 }}
 /></div><div
 style={{
 fontSize: 11,
 color: "var(--muted-foreground)",
 fontFamily: "DM Sans",
 marginTop: 6,
 }}
 >
 {goal.steps.filter((s: any) => s.completed).length}/
 {goal.steps.length} etapas
 </div></div>
 );
 })}
 </div></div>
 )}
 </div>
 );
}
