import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";
import { addAppointment, updateAppointment } from "@/store/appointments.store";
import { Appointment, AppointmentFormData, APPOINTMENT_COLORS, APPOINTMENT_CATEGORIES } from "@/store/calendar.types";
import { Clock, AlertCircle } from "lucide-react";

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  appointment?: Appointment | null;
  onSaved: () => void;
}

export function AppointmentModal({
  open,
  onClose,
  defaultDate,
  appointment,
  onSaved,
}: AppointmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<string>("");
  const [color, setColor] = useState("#F59E0B");
  const [isLoading, setIsLoading] = useState(false);
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setDescription(appointment.description || "");
      setStartTime(appointment.startTime);
      setEndTime(appointment.endTime);
      setCategory(appointment.category || "");
      setColor(appointment.color);
    } else {
      setTitle("");
      setDescription("");
      setStartTime("09:00");
      setEndTime("10:00");
      setCategory("");
      setColor("#F59E0B");
    }
    setTimeError("");
  }, [appointment, open]);

  const validateTimes = (): boolean => {
    if (startTime >= endTime) {
      setTimeError("Hora de término deve ser após a hora de início");
      return false;
    }
    setTimeError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("Título é obrigatório", "info");
      return;
    }

    if (!validateTimes()) {
      return;
    }

    setIsLoading(true);

    try {
      const formData: AppointmentFormData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime,
        date: appointment?.date || defaultDate,
        category: category || undefined,
        color,
      };

      if (appointment) {
        await updateAppointment(appointment.id, formData);
        showToast("Compromisso atualizado!", "success");
      } else {
        const result = await addAppointment(formData);
        if (result) {
          showToast("Compromisso criado!", "success");
        } else {
          showToast("Erro ao criar compromisso", "error");
          setIsLoading(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar compromisso:", error);
      showToast("Erro ao salvar compromisso", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? "Editar Compromisso" : "Novo Compromisso"}
    >
      <div className="flex flex-col gap-4">
        {/* Título */}
        <div>
          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
            Título *
          </label>
          <input
            className="fz-input w-full"
            placeholder="Ex: Reunião com cliente"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
            Descrição
          </label>
          <textarea
            className="fz-input w-full resize-none"
            placeholder="Adicione detalhes sobre o compromisso..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
              Início *
            </label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="time"
                className="fz-input w-full pl-8"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError("");
                }}
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
              Término *
            </label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="time"
                className="fz-input w-full pl-8"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError("");
                }}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Erro de horário */}
        {timeError && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-[12px] text-red-500">{timeError}</span>
          </div>
        )}

        {/* Categoria */}
        <div>
          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
            Categoria
          </label>
          <select
            className="fz-input w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Selecione uma categoria</option>
            {APPOINTMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Cor */}
        <div>
          <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
            Cor
          </label>
          <div className="grid grid-cols-4 gap-2">
            {APPOINTMENT_COLORS.map((colorOption) => (
              <button
                key={colorOption.value}
                onClick={() => setColor(colorOption.value)}
                className={`w-full h-10 rounded-lg border-2 transition-all ${
                  color === colorOption.value
                    ? "border-foreground"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: colorOption.value }}
                title={colorOption.name}
                disabled={isLoading}
              />
            ))}
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
            {isLoading ? "Salvando..." : appointment ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
