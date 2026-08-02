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
            className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Salvando..." : note ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
