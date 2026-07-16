import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { RecurrenceConfig, RecurrenceType } from '@/types/recurrence';

interface RecurrenceSectionProps {
  recurrence: RecurrenceConfig;
  onChange: (recurrence: RecurrenceConfig) => void;
}

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceType; label: string }> = [
  { value: 'never', label: 'Nunca' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function RecurrenceSection({ recurrence, onChange }: RecurrenceSectionProps) {
  const [showCustom, setShowCustom] = useState(recurrence.type === 'custom');

  const handleTypeChange = (type: RecurrenceType) => {
    const newRecurrence: RecurrenceConfig = {
      ...recurrence,
      type,
      status: 'active',
    };

    if (type === 'custom') {
      newRecurrence.interval = recurrence.interval || 1;
      newRecurrence.intervalUnit = recurrence.intervalUnit || 'days';
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }

    onChange(newRecurrence);
  };

  const handleEndTypeChange = (endType: 'never' | 'after_occurrences' | 'on_date') => {
    const newRecurrence: RecurrenceConfig = {
      ...recurrence,
      endType,
    };

    if (endType === 'after_occurrences') {
      newRecurrence.occurrences = recurrence.occurrences || 5;
    } else if (endType === 'on_date') {
      newRecurrence.endDate = recurrence.endDate || new Date().toISOString().split('T')[0];
    }

    onChange(newRecurrence);
  };

  const handleDayToggle = (day: number) => {
    const daysOfWeek = recurrence.daysOfWeek || [];
    const newDays = daysOfWeek.includes(day)
      ? daysOfWeek.filter(d => d !== day)
      : [...daysOfWeek, day].sort();

    onChange({
      ...recurrence,
      daysOfWeek: newDays,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Seção de Recorrência */}
      <div>
        <label
          style={{
            fontFamily: 'DM Sans',
            fontSize: 12,
            color: 'var(--muted-foreground)',
            marginBottom: 8,
            display: 'block',
          }}
        >
          Recorrência
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {RECURRENCE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${recurrence.type === option.value ? '#3b82f6' : 'var(--border)'}`,
                background:
                  recurrence.type === option.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color:
                  recurrence.type === option.value ? '#3b82f6' : 'var(--muted-foreground)',
                fontFamily: 'DM Sans',
                fontWeight: 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuração Personalizada */}
      {showCustom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Repetir a cada
              </label>
              <input
                type="number"
                min="1"
                value={recurrence.interval || 1}
                onChange={e =>
                  onChange({
                    ...recurrence,
                    interval: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="fz-input"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Unidade
              </label>
              <select
                value={recurrence.intervalUnit || 'days'}
                onChange={e =>
                  onChange({
                    ...recurrence,
                    intervalUnit: e.target.value as 'days' | 'weeks' | 'months' | 'years',
                  })
                }
                className="fz-input"
                style={{ width: '100%' }}
              >
                <option value="days">Dias</option>
                <option value="weeks">Semanas</option>
                <option value="months">Meses</option>
                <option value="years">Anos</option>
              </select>
            </div>
          </div>

          {/* Seleção de dias da semana */}
          {recurrence.intervalUnit === 'weeks' && (
            <div>
              <label
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                Dias da semana
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: `1px solid ${
                        (recurrence.daysOfWeek || []).includes(day.value)
                          ? '#3b82f6'
                          : 'var(--border)'
                      }`,
                      background: (recurrence.daysOfWeek || []).includes(day.value)
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'transparent',
                      color: (recurrence.daysOfWeek || []).includes(day.value)
                        ? '#3b82f6'
                        : 'var(--muted-foreground)',
                      fontFamily: 'DM Sans',
                      fontWeight: 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuração de Término */}
      {recurrence.type !== 'never' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label
            style={{
              fontFamily: 'DM Sans',
              fontSize: 12,
              color: 'var(--muted-foreground)',
              marginBottom: 0,
              display: 'block',
            }}
          >
            Término da recorrência
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleEndTypeChange('never')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${recurrence.endType === 'never' ? '#3b82f6' : 'var(--border)'}`,
                background:
                  recurrence.endType === 'never' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color:
                  recurrence.endType === 'never' ? '#3b82f6' : 'var(--muted-foreground)',
                fontFamily: 'DM Sans',
                fontWeight: 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Nunca
            </button>
            <button
              onClick={() => handleEndTypeChange('after_occurrences')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${
                  recurrence.endType === 'after_occurrences' ? '#3b82f6' : 'var(--border)'
                }`,
                background:
                  recurrence.endType === 'after_occurrences'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'transparent',
                color:
                  recurrence.endType === 'after_occurrences' ? '#3b82f6' : 'var(--muted-foreground)',
                fontFamily: 'DM Sans',
                fontWeight: 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Após X ocorrências
            </button>
            <button
              onClick={() => handleEndTypeChange('on_date')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${
                  recurrence.endType === 'on_date' ? '#3b82f6' : 'var(--border)'
                }`,
                background:
                  recurrence.endType === 'on_date' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color:
                  recurrence.endType === 'on_date' ? '#3b82f6' : 'var(--muted-foreground)',
                fontFamily: 'DM Sans',
                fontWeight: 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Em uma data
            </button>
          </div>

          {/* Inputs condicionais */}
          {recurrence.endType === 'after_occurrences' && (
            <div>
              <label
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Número de ocorrências
              </label>
              <input
                type="number"
                min="1"
                value={recurrence.occurrences || 5}
                onChange={e =>
                  onChange({
                    ...recurrence,
                    occurrences: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="fz-input"
              />
            </div>
          )}

          {recurrence.endType === 'on_date' && (
            <div>
              <label
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Data de término
              </label>
              <input
                type="date"
                value={recurrence.endDate || ''}
                onChange={e =>
                  onChange({
                    ...recurrence,
                    endDate: e.target.value,
                  })
                }
                className="fz-input"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
