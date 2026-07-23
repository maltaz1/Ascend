import React, { useState } from "react";
import { CancellationRequest, cancelCancellationRequest } from "@/lib/cancellation";
import { Clock, Undo2, Loader2 } from "lucide-react";
import { notifySuccess, notifyError } from "@/lib/notifications";

interface CancellationStatusCardProps {
  request: CancellationRequest;
  onCancelSuccess: () => void;
}

export function CancellationStatusCard({ request, onCancelSuccess }: CancellationStatusCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const formattedDate = new Date(request.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel = request.status === "pending" ? "Pendente" : "Processado";

  const handleCancelRequest = async () => {
    if (!confirm("Deseja realmente desistir do cancelamento e manter sua assinatura ativa?")) return;

    setIsCancelling(true);
    try {
      const { error } = await cancelCancellationRequest(request.id);
      if (error) {
        notifyError("Erro ao cancelar solicitação", error.message);
      } else {
        notifySuccess("Solicitação cancelada. Sua assinatura continua ativa!");
        onCancelSuccess();
      }
    } catch (err) {
      console.error(err);
      notifyError("Erro inesperado", "Tente novamente mais tarde.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4 text-amber-400">
        <Clock size={20} />
        <h3 className="font-bold text-lg">Solicitação de cancelamento enviada</h3>
      </div>
      
      <p className="text-zinc-400 text-sm mb-6">
        Sua solicitação de cancelamento foi enviada e está aguardando processamento.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Data da solicitação</p>
          <p className="text-sm font-semibold text-zinc-200">{formattedDate}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${request.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <p className="text-sm font-semibold text-zinc-200">{statusLabel}</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleCancelRequest}
        disabled={isCancelling}
        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-3 rounded-2xl transition-all border border-zinc-700 hover:border-zinc-600"
      >
        {isCancelling ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Undo2 size={18} />
        )}
        Desistir do cancelamento
      </button>
    </div>
  );
}
