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
          <div className="ledger-marginalia mb-2">Título *</div>
          <input
            className="ledger-input w-full"
            placeholder="Ex: Reunião com cliente"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Descrição */}
        <div>
          <div className="ledger-marginalia mb-2">Descrição</div>
          <textarea
            className="ledger-input w-full resize-none"
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
            <div className="ledger-marginalia mb-2">Início *</div>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="time"
                className="ledger-input w-full pl-8"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError("");
                }}
                disabled={isLoading}
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
          <div>
            <div className="ledger-marginalia mb-2">Término *</div>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="time"
                className="ledger-input w-full pl-8"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError("");
                }}
                disabled={isLoading}
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
        </div>

        {/* Erro de horário */}
        {timeError && (
          <div className="flex items-center gap-2 p-2.5 bg-[#18181f] border border-red-500/30 rounded-sm">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <span className="text-[12px] text-red-400">{timeError}</span>
          </div>
        )}

        {/* Categoria */}
        <div>
          <div className="ledger-marginalia mb-2">Categoria</div>
          <select
            className="ledger-input w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
            style={{ background: "transparent", outline: "none", color: "#ededed" }}
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
          <div className="ledger-marginalia mb-2">Cor da tinta</div>
          <div className="grid grid-cols-4 gap-2">
            {APPOINTMENT_COLORS.map((colorOption) => (
              <button
                key={colorOption.value}
                onClick={() => setColor(colorOption.value)}
                className="w-full h-8 rounded-[3px] transition-all"
                style={{
                  backgroundColor: colorOption.value,
                  border: color === colorOption.value ? "2px solid #ededed" : "1px solid #33333f",
                  transform: color === colorOption.value ? "scale(1.06)" : "scale(1)",
                }}
                title={colorOption.name}
                disabled={isLoading}
              />
            ))}
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
            {isLoading ? "Salvando..." : appointment ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
