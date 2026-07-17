import React from 'react';
import { RotateCw } from 'lucide-react';
import type { RecurrenceType } from '@/types/recurrence';

interface RecurrenceIndicatorProps {
  type: RecurrenceType;
  size?: 'sm' | 'md';
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  never: '',
  daily: 'Diária',
  weekdays: 'Dias úteis',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
  custom: 'Personalizada',
};

export function RecurrenceIndicator({ type, size = 'sm' }: RecurrenceIndicatorProps) {
  if (type === 'never') return null;

  const label = RECURRENCE_LABELS[type];
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary font-medium whitespace-nowrap ${
      size === 'sm' ? 'text-[10px]' : 'text-[11px]'
    }`}>
      <RotateCw size={iconSize} className="opacity-70" />
      {label}
    </div>
  );
}
