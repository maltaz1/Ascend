// Pré-lançamento: o site público mostra só a lista de espera (/lista) e as
// páginas legais. O app fica acessível apenas para quem já tem conta (você e
// os convidados), entrando por /entrar. Criar conta pelo site fica escondido.
//
// Ligado por padrão. No lançamento, defina VITE_PRELAUNCH=false na Vercel e
// publique de novo para abrir o app para todo mundo.
export const PRELAUNCH = import.meta.env.VITE_PRELAUNCH !== "false";

// Endereço discreto do login enquanto o app está fechado.
export const LOGIN_PATH = "/entrar";
