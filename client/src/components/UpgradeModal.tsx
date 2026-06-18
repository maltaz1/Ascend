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
      stroke="#a78bfa"
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
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
            className="relative w-full max-w-sm overflow-hidden rounded-[18px] border border-violet-500/[0.18] bg-[#0f0f13] shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-3.5 top-3.5 z-10 flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-white/[0.07] text-white/30 transition hover:border-white/[0.15] hover:text-white/55"
            >
              <X size={13} />
            </button>

            <div className="p-[30px_26px_26px]">
              {/* Badge */}
              <div className="mb-3.5 inline-flex items-center gap-[5px] rounded-[4px] border border-violet-500/20 bg-violet-500/[0.08] px-2.5 py-1">
                <span className="h-1 w-1 rounded-full bg-violet-400" />
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-violet-400">
                  7 dias grátis
                </span>
              </div>

              {/* Title */}
              <h2
                className="mb-2 text-[30px] font-semibold leading-[1.15] text-violet-50"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Ascend <em className="not-italic text-violet-400">PRO</em>
              </h2>

              {/* Subtitle */}
              <p className="mb-[22px] text-[13px] font-light leading-relaxed text-white/30">
                Acesso ilimitado a todas as ferramentas de produtividade.
              </p>

              {/* Divider */}
              <div className="mb-[18px] h-px bg-white/[0.05]" />

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
                    <span className="flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-[5px] border border-violet-500/25">
                      <CheckIcon />
                    </span>
                    {benefit}
                  </motion.li>
                ))}
              </ul>

              {/* Aviso Importante */}
              <div className="mb-4 rounded-[10px] border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 text-sm">⚠️</span>
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
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-violet-700 px-5 py-[13px] text-[13px] font-medium tracking-[0.03em] text-violet-50 transition hover:bg-violet-800 cursor-pointer"
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
                className="w-full rounded-[9px] border border-white/[0.06] py-[11px] text-[12px] text-white/[0.22] transition hover:bg-white/[0.03] hover:text-white/40"
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
