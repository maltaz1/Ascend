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
  const iconSize = size === 'sm' ? 12 : 14;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '3px 6px' : '4px 8px',
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: 4,
        color: '#A855F7',
        fontSize,
        fontFamily: 'DM Sans',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <RotateCw size={iconSize} style={{ opacity: 0.7 }} />
      {label}
    </div>
  );
}
