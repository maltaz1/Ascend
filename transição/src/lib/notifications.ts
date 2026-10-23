// No web isso usava o "sonner". No app os avisos vão para o <ToastHost />.
import { showToast } from "./toast";

const defaultDuration = 4000;

const defaultTitles = {
  success: "✓ Ação realizada com sucesso",
  error: "✕ Não foi possível concluir a operação",
  warning: "⚠ Atenção",
  info: "ℹ Informação",
};

const formatTitle = (type: keyof typeof defaultTitles, title?: string) => {
  const prefix = defaultTitles[type].split(" ")[0];
  return title ? `${prefix} ${title}` : defaultTitles[type];
};

export const notifySuccess = (title?: string, description?: string) => {
  showToast({ type: "success", title: formatTitle("success", title), description, duration: defaultDuration });
};

export const notifyError = (title?: string, description?: string) => {
  showToast({ type: "error", title: formatTitle("error", title), description, duration: defaultDuration });
};

export const notifyWarning = (title?: string, description?: string) => {
  showToast({ type: "warning", title: formatTitle("warning", title), description, duration: defaultDuration });
};

export const notifyInfo = (title?: string, description?: string) => {
  showToast({ type: "info", title: formatTitle("info", title), description, duration: defaultDuration });
};
