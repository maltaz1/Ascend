import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";
import { addCalendarNote, updateCalendarNote } from "@/store/calendar-notes.store";
import { CalendarNote, CalendarNoteFormData } from "@/store/calendar.types";

interface CalendarNoteModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  note?: CalendarNote | null;
  onSaved: () => void;
}

export function CalendarNoteModal({
  open,
  onClose,
  defaultDate,
  note,
  onSaved,
}: CalendarNoteModalProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (note) {
      setContent(note.content);
    } else {
      setContent("");
    }
  }, [note, open]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast("Anotação não pode estar vazia", "info");
      return;
    }

    setIsLoading(true);

    try {
      const formData: CalendarNoteFormData = {
        content: content.trim(),
        date: note?.date || defaultDate,
      };

      if (note) {
        await updateCalendarNote(note.id, formData);
        showToast("Anotação atualizada!", "success");
      } else {
        const result = await addCalendarNote(formData);
        if (result) {
          showToast("Anotação criada!", "success");
        } else {
          showToast("Erro ao criar anotação", "error");
          setIsLoading(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar anotação:", error);
      showToast("Erro ao salvar anotação", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={note ? "Editar Anotação" : "Nova Anotação"}
    >
      <div className="flex flex-col gap-4">
        {/* Conteúdo */}
        <div>
          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
            Anotação *
          </label>
          <textarea
            className="fz-input w-full resize-none"
            placeholder="Escreva sua anotação para este dia..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            disabled={isLoading}
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            {content.length} caracteres
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: '#F59E0B',
              borderRadius: 8,
              fontFamily: 'Space Grotesk',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.1))';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))';
              }
            }}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: 8,
              fontFamily: 'Space Grotesk',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.25)';
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? "Salvando..." : note ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
