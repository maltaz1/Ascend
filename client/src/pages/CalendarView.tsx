// FlowZone Calendar — Carbon Amber Industrial Premium
// Calendário mensal completo com tarefas e metas com deadline

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { getTodayString, getTaskStatus } from '@/lib/store';
import type { Task, Goal } from '@/lib/store';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return width;
}

function DayCell({
  day,
  dateStr,
  isToday,
  isOtherMonth,
  tasks,
  goals,
  isSelected,
  onClick,
  isMobile,
}: {
  day: number;
  dateStr: string;
  isToday: boolean;
  isOtherMonth: boolean;
  tasks: Task[];
  goals: Goal[];
  isSelected: boolean;
  onClick: () => void;
  isMobile: boolean;
}) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed && t.date >= getTodayString()).length;
  const overdueTasks = tasks.filter(t => !t.completed && t.date < getTodayString()).length;

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: isMobile ? 54 : 90,
        padding: isMobile ? '5px 3px' : '8px',
        borderRadius: isMobile ? 8 : 10,
        border: isToday
          ? '1px solid rgba(245,158,11,0.4)'
          : isSelected
          ? '1px solid rgba(245,158,11,0.25)'
          : '1px solid var(--border)',
        background: isToday
          ? 'rgba(245,158,11,0.08)'
          : isSelected
          ? 'rgba(245,158,11,0.05)'
          : 'var(--border)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: isOtherMonth ? 0.35 : 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMobile ? 'center' : 'stretch',
      }}
      onMouseEnter={e => {
        if (!isToday && !isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--border)';
        }
      }}
      onMouseLeave={e => {
        if (!isToday && !isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--border)';
        }
      }}
    >
      {/* Day number */}
      <div style={{
        fontFamily: 'Space Grotesk',
        fontWeight: isToday ? 800 : 600,
        fontSize: isMobile ? 13 : 14,
        color: isToday ? '#F59E0B' : 'var(--muted-foreground)',
        marginBottom: isMobile ? 3 : 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        {day}
        {isToday && !isMobile && (
          <span style={{
            marginLeft: 4,
            fontSize: 9,
            background: '#F59E0B',
            color: '#0D0D14',
            padding: '1px 5px',
            borderRadius: 10,
            fontWeight: 700,
            verticalAlign: 'middle',
          }}>HOJE</span>
        )}
      </div>

      {/* Task / goal indicators */}
      {isMobile ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 3,
          maxWidth: '100%',
        }}>
          {completedTasks > 0 && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          )}
          {pendingTasks > 0 && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
          )}
          {overdueTasks > 0 && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
          )}
          {goals.slice(0, 2).map(g => (
            <span key={g.id} style={{ fontSize: 11, lineHeight: 1 }}>{g.emoji}</span>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {completedTasks > 0 && (
            <div style={{
              fontSize: 10,
              color: '#10B981',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              {completedTasks} concluída{completedTasks > 1 ? 's' : ''}
            </div>
          )}
          {pendingTasks > 0 && (
            <div style={{
              fontSize: 10,
              color: '#F59E0B',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
              {pendingTasks} pendente{pendingTasks > 1 ? 's' : ''}
            </div>
          )}
          {overdueTasks > 0 && (
            <div style={{
              fontSize: 10,
              color: '#EF4444',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              {overdueTasks} atrasada{overdueTasks > 1 ? 's' : ''}
            </div>
          )}
          {goals.map(g => (
            <div key={g.id} style={{
              fontSize: 10,
              color: g.color,
              fontFamily: 'DM Sans',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              overflow: 'hidden',
            }}>
              <span style={{ flexShrink: 0 }}>{g.emoji}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarView() {
  const data = useStore();
  const today = getTodayString();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 640;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const goToToday = () => {
    setViewYear(new Date().getFullYear());
    setViewMonth(new Date().getMonth());
    setSelectedDate(today);
  };

  // Build calendar cells
  const cells = useMemo(() => {
    const result: { day: number; dateStr: string; isOtherMonth: boolean }[] = [];

    // Prev month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      result.push({ day: d, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isOtherMonth: true });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: d,
        dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isOtherMonth: false,
      });
    }

    // Next month days
    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      result.push({ day: d, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isOtherMonth: true });
    }

    return result;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfMonth, daysInPrevMonth]);

  const selectedTasks = data.tasks.filter(t => t.date === selectedDate);
  const selectedGoals = data.goals.filter(g => g.deadline === selectedDate);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 28, color: 'var(--foreground)', marginBottom: 4 }}>
            Calendário
          </h1>
          <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--muted-foreground)' }}>
            Visão geral de tarefas e metas
          </p>
        </div>
        <button className="fz-btn-ghost" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={goToToday}>
          <Calendar size={14} />
          Hoje
        </button>
      </div>

      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Calendar Grid */}
        <div className="fz-card calendar-main-card" style={{ padding: '20px 22px' }}>
          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={prevMonth} className="fz-btn-ghost" style={{ padding: '6px 10px', borderRadius: 8 }}>
              <ChevronLeft size={16} color="var(--muted-foreground)" />
            </button>
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: 'var(--foreground)' }}>
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="fz-btn-ghost" style={{ padding: '6px 10px', borderRadius: 8 }}>
              <ChevronRight size={16} color="var(--muted-foreground)" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="calendar-weekday-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontFamily: 'Space Grotesk',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--muted-foreground)',
                padding: '4px 0',
                letterSpacing: '0.04em',
              }}>
                {isMobile ? d.slice(0, 1) : d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {cells.map((cell, i) => {
              const cellTasks = data.tasks.filter(t => t.date === cell.dateStr);
              const cellGoals = data.goals.filter(g => g.deadline === cell.dateStr);
              return (
                <DayCell
                  key={i}
                  day={cell.day}
                  dateStr={cell.dateStr}
                  isToday={cell.dateStr === today}
                  isOtherMonth={cell.isOtherMonth}
                  tasks={cellTasks}
                  goals={cellGoals}
                  isSelected={cell.dateStr === selectedDate}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  isMobile={isMobile}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {[
              { color: '#10B981', label: 'Concluída' },
              { color: '#F59E0B', label: 'Pendente' },
              { color: '#EF4444', label: 'Atrasada' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'DM Sans' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="calendar-detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fz-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: 'var(--foreground)', marginBottom: 4 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--muted-foreground)' }}>
              {selectedTasks.length} tarefa{selectedTasks.length !== 1 ? 's' : ''} · {selectedGoals.length} meta{selectedGoals.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tasks for selected day */}
          <div className="fz-card" style={{ padding: '18px 20px' }}>
            <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12, letterSpacing: '0.05em' }}>
              TAREFAS
            </h4>
            {selectedTasks.length === 0 ? (
              <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center', padding: '12px 0' }}>
                Nenhuma tarefa
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedTasks.map(task => {
                  const status = getTaskStatus(task);
                  const statusColor = status === 'completed' ? '#10B981' : status === 'overdue' ? '#EF4444' : '#F59E0B';
                  return (
                    <div key={task.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: `${statusColor}08`,
                      border: `1px solid ${statusColor}20`,
                      borderRadius: 8,
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      <span style={{
                        fontFamily: 'DM Sans', fontSize: 12,
                        color: task.completed ? 'var(--muted-foreground)' : 'var(--foreground)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Goals with deadline on selected day */}
          <div className="fz-card" style={{ padding: '18px 20px' }}>
            <h4 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12, letterSpacing: '0.05em' }}>
              METAS (PRAZO)
            </h4>
            {selectedGoals.length === 0 ? (
              <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center', padding: '12px 0' }}>
                Nenhuma meta com prazo neste dia
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedGoals.map(goal => (
                  <div key={goal.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: `${goal.color}08`,
                    border: `1px solid ${goal.color}25`,
                    borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{goal.emoji}</span>
                    <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {goal.title}
                    </span>
                    {goal.completedAt && <span style={{ fontSize: 12 }}>✅</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) {
          .calendar-grid {
            grid-template-columns: 1fr !important;
          }
          .calendar-detail-panel {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 768px) {
          .calendar-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .calendar-detail-panel {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 640px) {
          .calendar-main-card {
            padding: 12px !important;
          }
          .calendar-days-grid {
            gap: 4px !important;
          }
          .calendar-weekday-header {
            gap: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}