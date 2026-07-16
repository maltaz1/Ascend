import React, { useState } from 'react';
import { CheckCircle2, SkipForward, AlertCircle, Calendar } from 'lucide-react';
import { RecurrenceIndicator } from '@/components/RecurrenceIndicator';
import type { RecurrenceType } from '@/types/recurrence';

interface RecurringTaskHistory {
  id: string;
  title: string;
  type: RecurrenceType;
  completed: Array<{ date: string; completedAt: string }>;
  skipped: Array<{ date: string }>;
  lost: Array<{ date: string }>;
}

// Dados mockados para demonstração
const MOCK_HISTORY: RecurringTaskHistory[] = [
  {
    id: '1',
    title: 'Exercício matinal',
    type: 'daily',
    completed: [
      { date: '2026-07-15', completedAt: '2026-07-15T07:30:00' },
      { date: '2026-07-14', completedAt: '2026-07-14T07:45:00' },
      { date: '2026-07-13', completedAt: '2026-07-13T07:20:00' },
    ],
    skipped: [
      { date: '2026-07-12' },
      { date: '2026-07-10' },
    ],
    lost: [
      { date: '2026-07-11' },
    ],
  },
  {
    id: '2',
    title: 'Reunião semanal',
    type: 'weekly',
    completed: [
      { date: '2026-07-14', completedAt: '2026-07-14T14:00:00' },
      { date: '2026-07-07', completedAt: '2026-07-07T14:15:00' },
    ],
    skipped: [],
    lost: [],
  },
  {
    id: '3',
    title: 'Revisão mensal',
    type: 'monthly',
    completed: [
      { date: '2026-06-30', completedAt: '2026-06-30T16:00:00' },
    ],
    skipped: [],
    lost: [],
  },
];

export default function RecurrenceHistory() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'skipped' | 'lost'>('all');

  const getStatusColor = (status: 'completed' | 'skipped' | 'lost') => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981', icon: CheckCircle2 };
      case 'skipped':
        return { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', icon: SkipForward };
      case 'lost':
        return { bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', icon: AlertCircle };
    }
  };

  const getFilteredItems = () => {
    const items: Array<{ taskId: string; taskTitle: string; type: RecurrenceType; date: string; status: 'completed' | 'skipped' | 'lost' }> = [];

    MOCK_HISTORY.forEach(task => {
      if (selectedFilter === 'all' || selectedFilter === 'completed') {
        task.completed.forEach(item => {
          items.push({
            taskId: task.id,
            taskTitle: task.title,
            type: task.type,
            date: item.date,
            status: 'completed',
          });
        });
      }
      if (selectedFilter === 'all' || selectedFilter === 'skipped') {
        task.skipped.forEach(item => {
          items.push({
            taskId: task.id,
            taskTitle: task.title,
            type: task.type,
            date: item.date,
            status: 'skipped',
          });
        });
      }
      if (selectedFilter === 'all' || selectedFilter === 'lost') {
        task.lost.forEach(item => {
          items.push({
            taskId: task.id,
            taskTitle: task.title,
            type: task.type,
            date: item.date,
            status: 'lost',
          });
        });
      }
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredItems = getFilteredItems();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '20px',
        maxWidth: '100%',
        overflowY: 'auto',
        paddingBottom: '40px',
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--foreground)',
            fontFamily: 'Space Grotesk',
            marginBottom: 12,
          }}
        >
          Histórico de Tarefas Recorrentes
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted-foreground)',
            fontFamily: 'DM Sans',
          }}
        >
          Acompanhe o histórico de todas as suas tarefas recorrentes
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['all', 'completed', 'skipped', 'lost'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${selectedFilter === filter ? 'var(--primary)' : 'var(--border)'}`,
              background:
                selectedFilter === filter
                  ? 'var(--primary)15'
                  : 'transparent',
              color:
                selectedFilter === filter
                  ? 'var(--primary)'
                  : 'var(--muted-foreground)',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {filter === 'all'
              ? 'Todas'
              : filter === 'completed'
                ? 'Concluídas'
                : filter === 'skipped'
                  ? 'Puladas'
                  : 'Perdidas'}
          </button>
        ))}
      </div>

      {/* Lista de Histórico */}
      <div>
        {filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--muted-foreground)',
            }}
          >
            <AlertCircle
              size={48}
              style={{ marginBottom: '12px', opacity: 0.5 }}
            />
            <p style={{ fontSize: 14 }}>Nenhum histórico encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map((item, i) => {
              const statusInfo = getStatusColor(item.status);
              const Icon = statusInfo.icon;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: statusInfo.bg,
                    border: `1px solid ${statusInfo.border}`,
                    borderRadius: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} color={statusInfo.text} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--foreground)',
                          fontFamily: 'DM Sans',
                        }}
                      >
                        {item.taskTitle}
                      </div>
                      <RecurrenceIndicator type={item.type} size="sm" />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      <Calendar size={12} />
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      background: statusInfo.bg,
                      border: `1px solid ${statusInfo.border}`,
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusInfo.text,
                      fontFamily: 'DM Sans',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.status === 'completed'
                      ? 'Concluída'
                      : item.status === 'skipped'
                        ? 'Pulada'
                        : 'Perdida'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumo */}
      {filteredItems.length > 0 && (
        <div
          style={{
            padding: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted-foreground)',
              fontFamily: 'DM Sans',
              lineHeight: 1.6,
            }}
          >
            <div>
              <strong>Total de itens:</strong> {filteredItems.length}
            </div>
            <div>
              <strong>Concluídas:</strong> {filteredItems.filter(i => i.status === 'completed').length}
            </div>
            <div>
              <strong>Puladas:</strong> {filteredItems.filter(i => i.status === 'skipped').length}
            </div>
            <div>
              <strong>Perdidas:</strong> {filteredItems.filter(i => i.status === 'lost').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
