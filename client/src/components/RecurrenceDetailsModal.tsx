import React, { useState } from 'react';
import { X, Calendar, RotateCw, CheckCircle2, SkipForward, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import type { RecurrenceConfig, RecurrenceHistory } from '@/types/recurrence';

interface RecurrenceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  recurrence: RecurrenceConfig;
  history?: RecurrenceHistory;
}

const RECURRENCE_LABELS: Record<string, string> = {
  never: 'Nunca',
  daily: 'Diária',
  weekdays: 'Dias úteis',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
  custom: 'Personalizada',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
};

export function RecurrenceDetailsModal({
  open,
  onClose,
  title,
  recurrence,
  history,
}: RecurrenceDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const getRecurrenceDescription = () => {
    if (recurrence.type === 'never') return 'Não recorre';
    if (recurrence.type === 'custom') {
      return `Repetir a cada ${recurrence.interval} ${
        recurrence.intervalUnit === 'days'
          ? 'dia(s)'
          : recurrence.intervalUnit === 'weeks'
            ? 'semana(s)'
            : recurrence.intervalUnit === 'months'
              ? 'mês(es)'
              : 'ano(s)'
      }`;
    }
    return RECURRENCE_LABELS[recurrence.type] || recurrence.type;
  };

  const getEndDescription = () => {
    if (recurrence.endType === 'never') return 'Sem data de término';
    if (recurrence.endType === 'after_occurrences') {
      return `Após ${recurrence.occurrences} ocorrências`;
    }
    if (recurrence.endType === 'on_date') {
      const date = new Date(recurrence.endDate + 'T00:00:00');
      return `Até ${date.toLocaleDateString('pt-BR')}`;
    }
    return '';
  };

  return (
    <Modal open={open} onClose={onClose} title={`Detalhes: ${title}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'details' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
              color: activeTab === 'details' ? '#A855F7' : 'var(--muted-foreground)',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'history' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
              color: activeTab === 'history' ? '#A855F7' : 'var(--muted-foreground)',
              fontFamily: 'DM Sans',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Histórico
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Tipo de Recorrência */}
            <div
              style={{
                padding: 12,
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(168, 85, 247, 0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <RotateCw size={14} color="#A855F7" />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                    fontFamily: 'DM Sans',
                  }}
                >
                  Tipo de Recorrência
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  fontFamily: 'DM Sans',
                }}
              >
                {getRecurrenceDescription()}
              </div>
            </div>

            {/* Próxima Ocorrência */}
            {recurrence.nextOccurrence && (
              <div
                style={{
                  padding: 12,
                  background: 'rgba(16, 185, 129, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <Calendar size={14} color="#10B981" />
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--muted-foreground)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    Próxima Ocorrência
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    fontFamily: 'DM Sans',
                  }}
                >
                  {new Date(recurrence.nextOccurrence + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}

            {/* Status */}
            <div
              style={{
                padding: 12,
                background: recurrence.status === 'active' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(107, 114, 128, 0.05)',
                borderRadius: 8,
                border: `1px solid ${recurrence.status === 'active' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <RotateCw
                  size={14}
                  color={recurrence.status === 'active' ? '#3b82f6' : '#6b7280'}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                    fontFamily: 'DM Sans',
                  }}
                >
                  Status
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: recurrence.status === 'active' ? '#3b82f6' : '#6b7280',
                  fontFamily: 'DM Sans',
                }}
              >
                {STATUS_LABELS[recurrence.status] || recurrence.status}
              </div>
            </div>

            {/* Término */}
            <div
              style={{
                padding: 12,
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(245, 158, 11, 0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Calendar size={14} color="#F59E0B" />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                    fontFamily: 'DM Sans',
                  }}
                >
                  Término
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  fontFamily: 'DM Sans',
                }}
              >
                {getEndDescription()}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Concluídas */}
            {history?.completed && history.completed.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <CheckCircle2 size={14} color="#10B981" />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    Concluídas ({history.completed.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {history.completed.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  ))}
                  {history.completed.length > 5 && (
                    <div
                      style={{
                        padding: '6px 8px',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      +{history.completed.length - 5} mais
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Puladas */}
            {history?.skipped && history.skipped.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <SkipForward size={14} color="#F59E0B" />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    Puladas ({history.skipped.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {history.skipped.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  ))}
                  {history.skipped.length > 5 && (
                    <div
                      style={{
                        padding: '6px 8px',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      +{history.skipped.length - 5} mais
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Perdidas */}
            {history?.lost && history.lost.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <AlertCircle size={14} color="#EF4444" />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    Perdidas ({history.lost.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {history.lost.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  ))}
                  {history.lost.length > 5 && (
                    <div
                      style={{
                        padding: '6px 8px',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      +{history.lost.length - 5} mais
                    </div>
                  )}
                </div>
              </div>
            )}

            {!history?.completed?.length && !history?.skipped?.length && !history?.lost?.length && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: 'var(--muted-foreground)',
                  fontSize: 13,
                  fontFamily: 'DM Sans',
                }}
              >
                Nenhum histórico disponível
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
