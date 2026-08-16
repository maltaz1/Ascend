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
          <div className="ledger-marginalia mb-2">Anotação *</div>
          <textarea
            className="ledger-input w-full resize-none"
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
            className="ledger-btn ledger-btn--ghost flex-1"
            onClick={onClose}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            className="ledger-btn ledger-btn--violet flex-1"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            {isLoading ? "Salvando..." : note ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
