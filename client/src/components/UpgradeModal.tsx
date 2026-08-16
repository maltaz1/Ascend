import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

const benefits = [
  "Tarefas ilimitadas",
  "Hábitos ilimitados",
  "Metas ilimitadas",
  "Todas as áreas desbloqueadas",
  "Futuras funcionalidades premium",
  "Sincronização avançada",
  "Analytics avançado",
];

function CheckIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2.2"
    >
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

export default function UpgradeModal({
  open,
  onClose,
  onUpgrade,
}: UpgradeModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fz-modal-overlay p-4 ledger-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={e => e.stopPropagation()}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            className="relative w-full max-w-sm overflow-hidden rounded-md border border-[var(--ledger-paper-border)] border-t-2 border-t-[var(--primary)] bg-[var(--ledger-paper-bg)] shadow-[8px_8px_0_rgba(0,0,0,0.35)]"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-3.5 top-3.5 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-[3px] border border-[#3a3a47] text-white/30 transition hover:border-white/[0.15] hover:text-white/55"
            >
              <X size={13} />
            </button>

            <div className="p-[30px_26px_26px]">
              {/* Title */}
              <h2
                className="mb-2 text-[30px] font-semibold leading-[1.15] text-violet-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Ascend <em className="not-italic text-violet-400">PRO</em>
              </h2>

              {/* Subtitle */}
              <p className="mb-[22px] text-[13px] font-light leading-relaxed text-white/30">
                Acesso ilimitado a todas as ferramentas de produtividade.
              </p>

              {/* Divider */}
              <div className="mb-[18px] h-px bg-[var(--ledger-paper-border)]" />

              {/* Benefits */}
              <ul className="mb-[22px] flex flex-col gap-2">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={benefit}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-center gap-2.5 text-[13px] font-light text-white/45"
                  >
                    <span className="flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-[2px] border border-violet-500/25 bg-[var(--ledger-paper-bg)]">
                      <CheckIcon />
                    </span>
                    {benefit}
                  </motion.li>
                ))}
              </ul>

              {/* Aviso Importante */}
              <div className="mb-4 rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 text-sm">*</span>
                  <div>
                    <p className="text-[12px] font-medium text-amber-400">
                      Importante
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                      Utilize o mesmo email cadastrado no Ascend para que sua
                      assinatura seja ativada automaticamente após a confirmação
                      do pagamento.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onUpgrade}
                className="mb-2 ledger-btn ledger-btn--violet w-full cursor-pointer"
              >
                Assinar PRO
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={onClose}
                className="w-full ledger-btn ledger-btn--ghost py-[11px] text-[12px] text-[var(--ink-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--ink)]"
              >
                Agora não
              </button>

              <p className="mt-2.5 text-center text-[11px] tracking-[0.02em] text-white/[0.16]">
                Cancele quando quiser · Sem compromisso
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
