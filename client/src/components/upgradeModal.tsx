import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Sparkles,
} from "lucide-react";
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

export default function UpgradeModal({
  open,
  onClose,
  onUpgrade,
}: UpgradeModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEsc
      );
    };
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
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 20,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10" />

            <div className="relative p-6">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                  <Crown className="text-white" />
                </div>

                <div>
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                    <Sparkles size={12} />
                    7 DIAS GRÁTIS
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    Desbloqueie o Ascend PRO
                  </h2>
                </div>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                Tenha acesso ilimitado a todas
                as ferramentas de produtividade.
              </p>

              <div className="mb-8 space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: index * 0.05,
                    }}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20">
                      <Check
                        size={14}
                        className="text-violet-300"
                      />
                    </div>

                    <span className="text-sm text-zinc-200">
                      {benefit}
                    </span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={onUpgrade}
                className="mb-3 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:scale-[1.02]"
              >
                Assinar PRO
              </button>

              <button
                onClick={onClose}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}