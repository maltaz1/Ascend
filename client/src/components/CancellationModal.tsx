import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { createCancellationRequest } from "@/lib/cancellation";
import { notifySuccess, notifyError } from "@/lib/notifications";
import { Loader2 } from "lucide-react";

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancellationModal({ isOpen, onClose, onSuccess }: CancellationModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await createCancellationRequest(reason);
      if (error) {
        notifyError("Erro ao enviar solicitação", error.message);
      } else {
        notifySuccess("Solicitação enviada com sucesso.");
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      notifyError("Erro inesperado", "Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Cancelar assinatura">
      <div className="space-y-6">
        <p className="text-zinc-400 text-sm leading-relaxed">
          Seu acesso permanecerá ativo até o final do período já pago.
          <br />
          <span className="font-semibold text-zinc-200">Deseja realmente solicitar o cancelamento?</span>
        </p>

        <div className="space-y-2">
          <div className="ledger-marginalia mb-2">Motivo do cancelamento (opcional)</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Conte-nos o motivo do cancelamento..."
            className="w-full ledger-input resize-none text-white h-32"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 ledger-btn ledger-btn--ghost"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 ledger-btn ledger-btn--red disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            Solicitar cancelamento
          </button>
        </div>
      </div>
    </Modal>
  );
}
