import React, { useState } from 'react';
import { MoreVertical, Edit, SkipForward, Pause, Play, Trash2 } from 'lucide-react';

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
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-xl z-[100] min-w-[200px] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {onEditRecurrence && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditRecurrence();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-secondary text-foreground text-[13px] font-medium flex items-center gap-2 transition-colors"
            >
              <Edit size={14} />
              Editar recorrência
            </button>
          )}

          {onSkipOccurrence && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSkipOccurrence();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-secondary text-foreground text-[13px] font-medium flex items-center gap-2 transition-colors"
            >
              <SkipForward size={14} />
              Pular esta ocorrência
            </button>
          )}

          {onTogglePause && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePause();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-secondary text-foreground text-[13px] font-medium flex items-center gap-2 transition-colors"
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
            <div className="border-t border-border">
              {onDeleteOccurrence && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOccurrence();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-destructive/10 text-destructive text-[13px] font-medium flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir esta ocorrência
                </button>
              )}

              {onDeleteRecurrence && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRecurrence();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-destructive/10 text-destructive text-[13px] font-medium flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir toda a recorrência
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overlay invisível para fechar menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}
