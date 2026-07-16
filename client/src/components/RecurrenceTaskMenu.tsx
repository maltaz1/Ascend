import React, { useState } from 'react';
import { MoreVertical, Edit, SkipForward, Pause, Play, Trash2 } from 'lucide-react';
import type { RecurrenceConfig } from '@/types/recurrence';

interface RecurrenceTaskMenuProps {
  isRecurring: boolean;
  recurrenceStatus?: 'active' | 'paused';
  onEditRecurrence?: () => void;
  onSkipOccurrence?: () => void;
  onTogglePause?: () => void;
  onDeleteOccurrence?: () => void;
  onDeleteRecurrence?: () => void;
}

export function RecurrenceTaskMenu({
  isRecurring,
  recurrenceStatus = 'active',
  onEditRecurrence,
  onSkipOccurrence,
  onTogglePause,
  onDeleteOccurrence,
  onDeleteRecurrence,
}: RecurrenceTaskMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!isRecurring) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-foreground)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#A855F7')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
      >
        <MoreVertical size={16} />
      </button>

      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: 200,
          }}
        >
          {onEditRecurrence && (
            <button
              onClick={() => {
                onEditRecurrence();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                color: 'var(--foreground)',
                fontFamily: 'DM Sans',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Edit size={14} />
              Editar recorrência
            </button>
          )}

          {onSkipOccurrence && (
            <button
              onClick={() => {
                onSkipOccurrence();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                color: 'var(--foreground)',
                fontFamily: 'DM Sans',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <SkipForward size={14} />
              Pular esta ocorrência
            </button>
          )}

          {onTogglePause && (
            <button
              onClick={() => {
                onTogglePause();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                color: 'var(--foreground)',
                fontFamily: 'DM Sans',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {recurrenceStatus === 'active' ? (
                <>
                  <Pause size={14} />
                  Pausar recorrência
                </>
              ) : (
                <>
                  <Play size={14} />
                  Retomar recorrência
                </>
              )}
            </button>
          )}

          {(onDeleteOccurrence || onDeleteRecurrence) && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {onDeleteOccurrence && (
                <button
                  onClick={() => {
                    onDeleteOccurrence();
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    color: '#EF4444',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={14} />
                  Excluir esta ocorrência
                </button>
              )}

              {onDeleteRecurrence && (
                <button
                  onClick={() => {
                    onDeleteRecurrence();
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    color: '#EF4444',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={14} />
                  Excluir toda a recorrência
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fechar menu ao clicar fora */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
}
