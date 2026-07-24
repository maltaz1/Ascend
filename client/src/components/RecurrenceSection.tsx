import React, { useState, useMemo } from 'react';
import { Calendar, RotateCw } from 'lucide-react';
import type { RecurrenceConfig, RecurrenceType } from '@/types/recurrence';

interface RecurrenceSectionProps {
  recurrence: RecurrenceConfig;
  onChange: (recurrence: RecurrenceConfig) => void;
}

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceType; label: string }> = [
  { value: 'never', label: 'Nunca' },
  { value: 'daily', label: 'Diária' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const WEEKDAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
];

const FULL_WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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

  // Cálculo da prévia da recorrência
  const recurrencePreview = useMemo(() => {
    if (recurrence.type === 'never') return null;

    let text = '';
    if (recurrence.type === 'daily') text = 'Repete todos os dias';
    else if (recurrence.type === 'weekdays') text = 'Repete de segunda a sexta-feira';
    else if (recurrence.type === 'weekly') {
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const days = recurrence.daysOfWeek.map(d => FULL_WEEKDAYS[d].split('-')[0]);
        text = `Repete toda ${days.join(', ')}`;
      } else {
        text = 'Repete semanalmente';
      }
    }
    else if (recurrence.type === 'monthly') text = 'Repete mensalmente';
    else if (recurrence.type === 'yearly') text = 'Repete anualmente';
    else if (recurrence.type === 'custom') {
      const unit = recurrence.intervalUnit === 'days' ? 'dia(s)' : 
                   recurrence.intervalUnit === 'weeks' ? 'semana(s)' : 
                   recurrence.intervalUnit === 'months' ? 'mês(es)' : 'ano(s)';
      text = `Repete a cada ${recurrence.interval} ${unit}`;
    }

    if (recurrence.endType === 'after_occurrences') {
      text += ` por ${recurrence.occurrences} vezes`;
    } else if (recurrence.endType === 'on_date' && recurrence.endDate) {
      const date = new Date(recurrence.endDate + 'T00:00:00');
      text += ` até ${date.toLocaleDateString('pt-BR')}`;
    }

    return text;
  }, [recurrence]);

  // Próximas ocorrências (mock)
  const nextDates = useMemo(() => {
    if (recurrence.type === 'never') return [];
    
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 3; i++) {
      const next = new Date(today);
      next.setDate(today.getDate() + i * (recurrence.type === 'weekly' ? 7 : 1));
      dates.push(next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
    }
    return dates;
  }, [recurrence.type]);

  return (
    <div className="flex flex-col gap-4">
      {/* Seção de Recorrência */}
      <div>
        <label className="text-[12px] font-medium text-muted-foreground mb-2 block">
          Recorrência
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RECURRENCE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-all ${
                recurrence.type === option.value 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuração Personalizada */}
      {showCustom && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-xl border border-border">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
                className="fz-input w-full h-9"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
                className="fz-input w-full h-9"
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
              <label className="text-[11px] font-medium text-muted-foreground mb-2 block">
                Dias da semana
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`w-8 h-8 rounded-md border text-[11px] font-bold transition-all ${
                      (recurrence.daysOfWeek || []).includes(day.value)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'
                    }`}
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
        <div className="flex flex-col gap-3">
          <label className="text-[12px] font-medium text-muted-foreground mb-0 block">
            Término da recorrência
          </label>
          <div className="flex gap-2 flex-wrap">
            {(['never', 'after_occurrences', 'on_date'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleEndTypeChange(type)}
                className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-all ${
                  recurrence.endType === type 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                {type === 'never' ? 'Nunca' : type === 'after_occurrences' ? 'Após X vezes' : 'Em uma data'}
              </button>
            ))}
          </div>

          {/* Inputs condicionais */}
          <div className="grid grid-cols-1 gap-3">
            {recurrence.endType === 'after_occurrences' && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
                  className="fz-input w-full h-9"
                />
              </div>
            )}

            {recurrence.endType === 'on_date' && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
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
                  className="fz-input w-full h-9"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prévia da Recorrência */}
      {recurrence.type !== 'never' && (
        <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <RotateCw size={14} className="text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Resumo</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2 leading-relaxed">
            {recurrencePreview}
          </p>
          <div className="flex items-center gap-2 pt-2 border-t border-primary/5">
            <Calendar size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Próximas:</span>
            <div className="flex gap-2">
              {nextDates.map((date, i) => (
                <span key={i} className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {date}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
