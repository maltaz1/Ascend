import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/55"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[440px] translate-x-[-50%] translate-y-[-50%] gap-6 rounded-[32px] border border-white/5 bg-[#16161e] p-8 shadow-2xl shadow-black/50 backdrop-blur-xl"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-2xl font-black text-white tracking-tight">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-base text-zinc-400 mt-3 leading-relaxed">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar diálogo"
              >
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-4">
            <button 
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-bold bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-all shadow-xl shadow-purple-900/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Processando..." : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
