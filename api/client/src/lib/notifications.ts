import { toast } from "sonner";

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
  toast.success(formatTitle("success", title), {
    description,
    duration: defaultDuration,
  });
};

export const notifyError = (title?: string, description?: string) => {
  toast.error(formatTitle("error", title), {
    description,
    duration: defaultDuration,
  });
};

export const notifyWarning = (title?: string, description?: string) => {
  toast.warning(formatTitle("warning", title), {
    description,
    duration: defaultDuration,
  });
};

export const notifyInfo = (title?: string, description?: string) => {
  toast(messageInfo(title), {
    description,
    duration: defaultDuration,
  });
};

const messageInfo = (title?: string) => {
  return title ? `ℹ ${title}` : defaultTitles.info;
};
