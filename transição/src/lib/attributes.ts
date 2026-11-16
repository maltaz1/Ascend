// Atributos (Espírito, Mente, Riqueza, Disciplina, Vitalidade, Força) e a árvore de habilidades.
// Cada tarefa pode ter a etiqueta de um atributo (campo `category` = "atributo:ação").
// Tudo aqui é CALCULADO a partir das tarefas concluídas — nada é salvo à parte, então
// desmarcar uma tarefa, trocar de aparelho ou recarregar sempre dá o mesmo resultado.
import type { Task } from "@/store/types";

export type AttrId = "espirito" | "mente" | "riqueza" | "disciplina" | "vitalidade" | "forca";
export type ActionId = "meditacao" | "nota" | "atividade" | "habito" | "leitura" | "estudo" | "financeiro" | "treino" | "agua" | "sono" | "dieta";

export type Attr = { id: AttrId; name: string; color: string; ink: string; icon: string; angle: number };

// Ordem e ângulos do radar (topo, sentido horário).
export const ATTRS: Attr[] = [
  { id: "espirito", name: "Espírito", color: "#a78bfa", ink: "#c9b8fc", icon: "sparkles-outline", angle: -90 },
  { id: "mente", name: "Mente", color: "#818cf8", ink: "#aab2fb", icon: "book-outline", angle: -30 },
  { id: "riqueza", name: "Riqueza", color: "#d8b4fe", ink: "#e9d5ff", icon: "diamond-outline", angle: 30 },
  { id: "disciplina", name: "Disciplina", color: "#c084fc", ink: "#d8a8fd", icon: "flame-outline", angle: 90 },
  { id: "vitalidade", name: "Vitalidade", color: "#9333ea", ink: "#b06af0", icon: "heart-outline", angle: 150 },
  { id: "forca", name: "Força", color: "#7c3aed", ink: "#a07df0", icon: "flash-outline", angle: 210 },
];
export const attrOf = (id: string | undefined | null) => ATTRS.find(a => a.id === id);

// Tipos de ação que a pessoa escolhe ao criar a tarefa dentro de cada atributo.
export const ACTION_LABEL: Record<ActionId, string> = {
  meditacao: "Meditação", nota: "Escrita / notas", atividade: "Movimento", habito: "Outro", leitura: "Leitura", estudo: "Estudo",
  financeiro: "Dinheiro", treino: "Treino", agua: "Água", sono: "Sono", dieta: "Alimentação",
};
export const ATTR_ACTIONS: Record<AttrId, ActionId[]> = {
  espirito: ["meditacao", "nota", "atividade", "habito"],
  mente: ["leitura", "estudo", "nota", "habito"],
  riqueza: ["financeiro", "estudo", "nota", "habito"],
  disciplina: ["habito", "nota", "treino"],
  vitalidade: ["agua", "sono", "dieta", "atividade", "habito"],
  forca: ["treino", "atividade", "dieta", "sono", "habito"],
};

// ---- etiqueta na tarefa: category = "espirito:meditacao" ----
export const formatTag = (attr: AttrId, action: ActionId) => `${attr}:${action}`;
export function parseTag(category?: string | null): { attr: Attr; action: ActionId } | null {
  if (!category) return null;
  const [a, act] = category.split(":");
  const attr = attrOf(a);
  if (!attr) return null;
  const action = (ATTR_ACTIONS[attr.id].includes(act as ActionId) ? act : "habito") as ActionId;
  return { attr, action };
}
// A prioridade da tarefa define o XP do atributo: baixa 8, média 16, alta 24.
export const taskDifficulty = (t: Pick<Task, "priority">) => (t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1);
export const taskAttrXP = (t: Pick<Task, "priority">) => 8 * taskDifficulty(t);

// ---------------------------------------------------------------------------
// Árvore: 12 habilidades por atributo, em 6 camadas
// ---------------------------------------------------------------------------

export type QuestType = "unica" | "acumulativa" | "sequencia" | "semanal" | "desafio";
export type Part = { ev: ActionId; n: number; l: string };
export type Quest = { t: string; ev: ActionId | null; n: number; type: QuestType; diff: number; parts?: Part[] };
export type NodeDef = { name: string; quests: Quest[] };

export const TYPE_LABEL: Record<QuestType, string> = { unica: "Única", acumulativa: "Acumulativa", sequencia: "Sequência", semanal: "Semanal", desafio: "Desafio" };

// [camada, faixa] de cada habilidade; os "pais" são as habilidades vizinhas da camada anterior.
export const LAYOUT: [number, number][] = [[0, 0], [1, -1], [1, 1], [2, -1], [2, 0], [2, 1], [3, -1], [3, 0], [3, 1], [4, -0.5], [4, 0.5], [5, 0]];
export const PARENTS: number[][] = LAYOUT.map(([t, l]) => LAYOUT.map((_, j) => j).filter(j => LAYOUT[j][0] === t - 1 && Math.abs(LAYOUT[j][1] - l) <= 1));

const RAW: Record<AttrId, [string, string[]][]> = {
  espirito: [
    ["Primeiro silêncio", ["Meditar 5 minutos", "Respirar fundo 10 vezes"]], ["Gratidão", ["Anotar 3 gratidões", "Agradecer alguém de verdade", "Repetir por 3 dias"]],
    ["Momento sagrado", ["Reservar 10 min de silêncio", "Fazer uma oração ou reflexão"]], ["Diário interior", ["Escrever 5 entradas no diário", "Descrever uma emoção difícil"]],
    ["Presença", ["Meditar 7 dias seguidos", "Ficar 1 hora sem celular"]], ["Natureza", ["Caminhar ao ar livre sem fones", "Ver o pôr do sol com calma", "Passar um dia na natureza"]],
    ["Perdão", ["Escrever uma carta de perdão", "Soltar um ressentimento antigo"]], ["Retiro de silêncio", ["Passar 2h em silêncio", "Ficar 1 dia sem telas", "Meditar 20 minutos"]],
    ["Propósito", ["Escrever sua missão de vida", "Definir 3 valores inegociáveis"]], ["Compaixão", ["Fazer um ato de bondade anônimo", "Ouvir alguém sem interromper"]],
    ["Desapego", ["Doar 5 itens", "Ficar 24h sem reclamar"]], ["Iluminado", ["Meditar por 90 dias", "Reler seu propósito por 4 semanas"]],
  ],
  mente: [
    ["Primeira página", ["Ler 10 páginas", "Anotar uma ideia"]], ["Leitor", ["Ler 20 min por 7 dias", "Terminar 1 livro"]], ["Curioso", ["Assistir uma aula", "Explicar algo novo a alguém"]],
    ["Foco profundo", ["1 sessão de 50 min sem distração", "Notificações off por 1 dia"]], ["Memória", ["Resumir um capítulo de cabeça", "Revisar as notas da semana"]], ["Escritor", ["Escrever 3 notas", "Compartilhar um texto"]],
    ["Idioma", ["Estudar 15 min por 7 dias", "Conversar em outro idioma"]], ["Estudo sólido", ["Fazer 5 sessões de estudo", "Concluir um curso"]],
    ["Pensamento crítico", ["Ler um ponto de vista oposto", "Escrever prós e contras de uma decisão"]], ["Leitor voraz", ["Ler 5 livros", "Ler 30 dias seguidos"]],
    ["Criador", ["Criar um projeto do zero", "Mostrar o projeto a alguém"]], ["Mestre", ["Ensinar algo que domina", "Concluir 3 cursos"]],
  ],
  riqueza: [
    ["Orçamento", ["Listar despesas fixas", "Criar o primeiro orçamento"]], ["Registro", ["Anotar gastos por 7 dias", "Categorizar o mês"]], ["Corte de gastos", ["Cancelar uma assinatura inútil", "3 dias sem gasto supérfluo"]],
    ["Primeira reserva", ["Guardar R$ 100", "Abrir uma conta separada"]], ["Meta clara", ["Definir uma meta financeira", "Calcular quanto guardar por mês"]], ["Renda extra", ["Listar 3 ideias de renda", "Testar uma delas"]],
    ["Dívida zero", ["Listar todas as dívidas", "Quitar a menor delas"]], ["Reserva de emergência", ["Guardar 1 mês de gastos", "Guardar 3 meses de gastos"]],
    ["Educação financeira", ["Ler um livro de finanças", "Entender um investimento"]], ["Investidor", ["Fazer o primeiro aporte", "Aportar 3 meses seguidos"]],
    ["Patrimônio", ["Acompanhar o patrimônio por 1 mês", "Revisar a carteira"]], ["Liberdade", ["Investir por 12 meses", "Renda passiva cobrindo 1 conta"]],
  ],
  disciplina: [
    ["Primeiro passo", ["Concluir 1 hábito", "Planejar o dia seguinte"]], ["Rotina matinal", ["Acordar no mesmo horário por 3 dias", "Arrumar a cama"]], ["Foco no dia", ["Definir 3 prioridades", "Concluir as 3 prioridades"]],
    ["Sequência 7", ["Streak de 7 dias", "Nenhum hábito esquecido na semana"]], ["Sem adiar", ["Fazer a tarefa mais difícil primeiro", "Resolver 1 pendência antiga"]], ["Ambiente limpo", ["Organizar a mesa", "Organizar o quarto"]],
    ["Sequência 30", ["Streak de 30 dias", "Fazer 4 revisões semanais"]], ["Fricção zero", ["Preparar tudo na véspera", "Remover uma distração do ambiente"]],
    ["Dizer não", ["Recusar algo que drenaria seu tempo", "Proteger 1h só para você"]], ["Vencer a preguiça", ["Fazer algo que não queria", "Cumprir o plano num dia ruim"]],
    ["Constância", ["Streak de 60 dias", "Bater todas as metas da semana"]], ["Inabalável", ["Streak de 100 dias", "Nenhum dia perdido no mês"]],
  ],
  vitalidade: [
    ["Hidratado", ["Beber 8 copos de água", "Repetir por 3 dias"]], ["Sono", ["Dormir 7h ou mais", "Mesmo horário por 3 noites"]], ["Alimentação", ["Montar um prato equilibrado", "3 dias sem refrigerante"]],
    ["Sono reparador", ["7h+ por 14 noites", "Telas off 1h antes de dormir"]], ["Caminhada", ["Caminhar 30 minutos", "7.000 passos por 5 dias"]], ["Postura e alongamento", ["Alongar 10 min por 7 dias", "Corrigir a postura no trabalho"]],
    ["Dieta em dia", ["Seguir o plano por 7 dias", "Cozinhar 5 refeições"]], ["Energia", ["Sol de manhã por 7 dias", "Passar um dia sem açúcar"]], ["Check-up", ["Marcar um exame de rotina", "Fazer o exame"]],
    ["Corpo limpo", ["Seguir a dieta por 30 dias", "14 dias sem álcool"]], ["Recuperação", ["Um dia inteiro de descanso", "Sessão de respiração"]], ["Vitalidade total", ["Sono 7h+ por 30 noites", "Exames em dia"]],
  ],
  forca: [
    ["Despertar", ["Registrar 1 treino", "Alongar depois do treino"]], ["Hábito", ["Treinar 3 dias na semana", "Aquecer antes de todo treino"]], ["Base", ["Aprender 5 exercícios compostos", "Registrar suas cargas"]],
    ["Constância de ferro", ["3 treinos por semana, 4 semanas", "Não faltar a um treino planejado"]], ["Carga progressiva", ["Subir a carga em 3 exercícios", "Treinar com boa técnica"]], ["Cardio", ["Correr ou pedalar 20 min", "3 sessões de cardio na semana"]],
    ["Titã", ["Bater um recorde de carga", "Treinar 40 vezes"]], ["Resistência", ["50 flexões no dia", "Prancha de 1 minuto"]], ["Mobilidade", ["Alongar 10 min por 14 dias", "Fazer um treino de mobilidade"]],
    ["Atleta", ["Completar uma prova ou desafio", "12 semanas seguidas treinando"]], ["Físico forte", ["Chegar à meta de peso ou medida", "Registrar fotos de evolução"]], ["Lenda", ["Treinar 100 vezes", "Bater 3 recordes pessoais"]],
  ],
};

// Desafios: missões com várias frentes ao mesmo tempo, nas camadas altas (nós 4, 7, 10 e 11).
type BossDef = [string, [ActionId, number, string][]];
const BOSS: Record<AttrId, Record<number, BossDef>> = {
  espirito: { 4: ["Semana de presença", [["meditacao", 5, "Meditar"], ["nota", 3, "Escrever no diário"], ["atividade", 2, "Caminhar ao ar livre"]]], 7: ["Dia de retiro", [["meditacao", 3, "Meditar"], ["nota", 1, "Registrar a experiência"], ["habito", 1, "Ficar sem telas"]]], 10: ["Desapego total", [["habito", 7, "Hábito de desapego"], ["nota", 2, "Reflexões escritas"]]], 11: ["Provação final", [["meditacao", 21, "Meditar"], ["nota", 7, "Diário"], ["atividade", 4, "Natureza"]]] },
  mente: { 4: ["Semana de foco", [["estudo", 5, "Sessões de estudo"], ["leitura", 3, "Leituras"], ["nota", 2, "Resumos"]]], 7: ["Maratona de estudo", [["estudo", 8, "Sessões de estudo"], ["nota", 3, "Resumos"]]], 10: ["Projeto autoral", [["estudo", 6, "Sessões do projeto"], ["nota", 4, "Anotações"], ["habito", 2, "Entregas"]]], 11: ["Provação final", [["leitura", 15, "Leituras"], ["estudo", 15, "Estudo"], ["nota", 8, "Notas"]]] },
  riqueza: { 4: ["Mês organizado", [["financeiro", 20, "Registros no financeiro"], ["nota", 4, "Revisões"]]], 7: ["Reserva forte", [["financeiro", 12, "Aportes e registros"], ["estudo", 3, "Estudo financeiro"]]], 10: ["Carteira em dia", [["financeiro", 15, "Registros"], ["nota", 4, "Revisões"], ["estudo", 2, "Estudo"]]], 11: ["Provação final", [["financeiro", 40, "Registros"], ["estudo", 6, "Estudo"], ["nota", 8, "Revisões"]]] },
  disciplina: { 4: ["Semana perfeita", [["habito", 15, "Hábitos feitos"], ["nota", 2, "Planejamentos"]]], 7: ["Mês sem falhas", [["habito", 25, "Hábitos feitos"], ["nota", 4, "Revisões semanais"]]], 10: ["Sem desculpas", [["habito", 30, "Hábitos feitos"], ["treino", 4, "Treinos"], ["nota", 4, "Revisões"]]], 11: ["Provação final", [["habito", 60, "Hábitos feitos"], ["nota", 12, "Revisões"], ["treino", 10, "Treinos"]]] },
  vitalidade: { 4: ["Semana saudável", [["agua", 7, "Dias de água"], ["sono", 5, "Noites boas"], ["dieta", 5, "Refeições na dieta"]]], 7: ["Quinzena de energia", [["agua", 14, "Dias de água"], ["sono", 10, "Noites boas"], ["dieta", 10, "Refeições"], ["atividade", 5, "Atividades"]]], 10: ["Reset do corpo", [["dieta", 14, "Refeições"], ["sono", 10, "Noites boas"], ["atividade", 6, "Atividades"]]], 11: ["Provação final", [["dieta", 30, "Refeições"], ["sono", 30, "Noites boas"], ["atividade", 15, "Atividades"], ["agua", 30, "Dias de água"]]] },
  forca: { 4: ["Semana de ferro", [["treino", 4, "Treinos"], ["atividade", 2, "Cardio"], ["sono", 4, "Noites boas"]]], 7: ["Mês de força", [["treino", 12, "Treinos"], ["atividade", 4, "Cardio"], ["dieta", 8, "Refeições"]]], 10: ["Pré-prova", [["treino", 16, "Treinos"], ["atividade", 8, "Cardio"], ["sono", 10, "Noites boas"]]], 11: ["Provação final", [["treino", 40, "Treinos"], ["atividade", 15, "Cardio"], ["dieta", 20, "Refeições"]]] },
};

// Cada missão simples vira uma ação + meta de repetições (derivadas do texto).
const RULES: [RegExp, ActionId][] = [
  [/medit|respir|silêncio|oração|reflex/i, "meditacao"],
  [/gratid|agradec|diário|escrev|nota|texto|carta|reler|missão de vida|valores|resumir|compartilhar|anotar/i, "nota"],
  [/\bler\b|leitura|livro|página|capítulo/i, "leitura"],
  [/curso|aula|estud|idioma|projeto|ensin|explicar|ponto de vista|prós e contras|memória|sessão de/i, "estudo"],
  [/treino|treinar|carga|flexões|prancha|exercício|recorde|prova|físico|fotos|alongar|mobilidade|aquec/i, "treino"],
  [/correr|cardio|pedalar|caminh|passos|natureza|pôr do sol|ar livre/i, "atividade"],
  [/água|copos/i, "agua"],
  [/dorm|sono|noite|telas|descanso|exame|sol de manhã/i, "sono"],
  [/dieta|prato|refei|cozinhar|açúcar|refrigerante|álcool/i, "dieta"],
  [/orçamento|gasto|despesa|assinatura|dívida|guardar|reserva|aporte|invest|renda|patrimônio|financ|carteira|r\$/i, "financeiro"],
];
const nOf = (t: string) => {
  const m = t.match(/(\d[\d.]*)\s*(dias|noites|semanas|meses|vezes|sessões|livros|treinos|copos|notas|entradas|refeições|revisões|recordes|cursos|aulas)/i);
  return m ? Math.min(parseInt(m[1].replace(".", ""), 10), 100) : 1;
};
const typeOf = (t: string, n: number): QuestType =>
  /por semana|na semana/i.test(t) ? "semanal" : n > 1 && /seguid|streak|\d+ (dias|noites|semanas)/i.test(t) ? "sequencia" : n > 1 ? "acumulativa" : "unica";
const diffOf = (n: number) => (n >= 30 ? 3 : n >= 7 ? 2 : 1);

function buildTree(id: AttrId): NodeDef[] {
  const allowed = ATTR_ACTIONS[id];
  const fit = (ev: ActionId): ActionId => (allowed.includes(ev) ? ev : "habito");
  return RAW[id].map(([name, texts], i) => {
    const quests: Quest[] = texts.map(t => {
      const n = nOf(t);
      const ev = fit((RULES.find(([r]) => r.test(t)) || [null, "habito" as ActionId])[1] as ActionId);
      return { t, ev, n, type: typeOf(t, n), diff: diffOf(n) };
    });
    const boss = BOSS[id][i];
    if (boss) {
      const parts: Part[] = boss[1].map(([ev, n, l]) => ({ ev: fit(ev), n, l }));
      quests.push({ t: boss[0], ev: null, n: parts.reduce((a, p) => a + p.n, 0), type: "desafio", diff: i === 11 ? 3 : 2, parts });
    }
    return { name, quests };
  });
}
export const TREES: Record<AttrId, NodeDef[]> = Object.fromEntries(ATTRS.map(a => [a.id, buildTree(a.id)])) as Record<AttrId, NodeDef[]>;

// ---------------------------------------------------------------------------
// Progresso (calculado das tarefas concluídas)
// ---------------------------------------------------------------------------

// Para cada habilidade e missão: contagem (missão simples) ou lista de contagens por frente (desafio).
export type QProg = number | number[];
export type Progress = Record<AttrId, QProg[][]>;
export type Computed = { progress: Progress; extraXP: Record<AttrId, number>; tagged: number };

const blank = (): Progress =>
  Object.fromEntries(ATTRS.map(a => [a.id, TREES[a.id].map(n => n.quests.map(q => (q.parts ? q.parts.map(() => 0) : 0)))])) as Progress;

export const qTotal = (q: Quest) => (q.parts ? q.parts.reduce((a, p) => a + p.n, 0) : q.n);
export const qCurrent = (q: Quest, v: QProg) => (q.parts ? q.parts.reduce((a, p, j) => a + Math.min((v as number[])[j] || 0, p.n), 0) : Math.min(v as number, q.n));
export const qDone = (q: Quest, v: QProg) => qCurrent(q, v) >= qTotal(q);

export const nodeDone = (c: Computed, a: AttrId, i: number) => TREES[a][i].quests.every((q, k) => qDone(q, c.progress[a][i][k]));
export const nodeCount = (c: Computed, a: AttrId, i: number) => TREES[a][i].quests.filter((q, k) => qDone(q, c.progress[a][i][k])).length;
export const nodeProg = (c: Computed, a: AttrId, i: number) =>
  TREES[a][i].quests.reduce((s, q, k) => s + qCurrent(q, c.progress[a][i][k]) / qTotal(q), 0) / TREES[a][i].quests.length;
export const nodeUnlocked = (c: Computed, a: AttrId, i: number) => i === 0 || PARENTS[i].some(p => nodeDone(c, a, p));
export type NodeState = "done" | "active" | "locked";
export const nodeState = (c: Computed, a: AttrId, i: number): NodeState => (nodeDone(c, a, i) ? "done" : nodeUnlocked(c, a, i) ? "active" : "locked");

export const questXP = (i: number, q: Quest) => (10 + LAYOUT[i][0] * 6) * q.diff;
export const nodeBonus = (i: number) => 30 + LAYOUT[i][0] * 15;
export const nodeXP = (a: AttrId, i: number) => TREES[a][i].quests.reduce((s, q) => s + questXP(i, q), 0) + nodeBonus(i);
export const nodeHasBoss = (a: AttrId, i: number) => TREES[a][i].quests.some(q => q.type === "desafio");

// Repete, na ordem em que foram feitas, cada tarefa concluída que tem etiqueta: ela avança a primeira
// missão pendente do atributo dela que usa aquela ação (e, num desafio, a primeira frente que usa a ação).
// Cada dia marcado de um hábito com etiqueta conta como uma tarefa concluída de dificuldade média.
export function habitEvents(habits: { id: string; createdAt: string; completedDates: string[]; category?: string }[]): Task[] {
  const out: Task[] = [];
  for (const h of habits) {
    if (!parseTag(h.category)) continue;
    for (const d of h.completedDates) {
      out.push({ id: `h-${h.id}-${d}`, title: "", date: d, createdAt: `${d}T12:00:00`, priority: "medium", completed: true, category: h.category } as Task);
    }
  }
  return out;
}

export function computeProgress(tasks: Task[]): Computed {
  const c: Computed = { progress: blank(), extraXP: { espirito: 0, mente: 0, riqueza: 0, disciplina: 0, vitalidade: 0, forca: 0 }, tagged: 0 };
  const list = tasks
    .filter(t => t.completed && parseTag(t.category))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const t of list) {
    const tag = parseTag(t.category)!;
    const id = tag.attr.id;
    c.tagged += 1;
    c.extraXP[id] += taskAttrXP(t);
    const tree = TREES[id];
    for (let i = 0; i < 12; i++) {
      if (!nodeUnlocked(c, id, i)) continue;
      let hit = false;
      for (let k = 0; k < tree[i].quests.length; k++) {
        const q = tree[i].quests[k];
        const v = c.progress[id][i][k];
        if (q.parts) {
          const j = q.parts.findIndex((p, jj) => p.ev === tag.action && ((v as number[])[jj] || 0) < p.n);
          if (j >= 0) { (v as number[])[j] += 1; hit = true; }
        } else if (q.ev === tag.action && (v as number) < q.n) {
          c.progress[id][i][k] = (v as number) + 1;
          hit = true;
        }
        if (hit) break;
      }
      if (hit) break;
    }
  }
  return c;
}

export function attrXP(c: Computed, a: AttrId): number {
  let x = c.extraXP[a];
  TREES[a].forEach((n, i) => {
    n.quests.forEach((q, k) => { if (qDone(q, c.progress[a][i][k])) x += questXP(i, q); });
    if (nodeDone(c, a, i)) x += nodeBonus(i);
  });
  return x;
}
export const attrLevel = (xp: number) => 1 + Math.floor(xp / 180);

// Os atributos se comparam entre si: ponto do radar = XP ÷ XP do maior; % = fatia no total.
export type AttrStat = { attr: Attr; xp: number; share: number; rel: number; level: number; nodes: number; quests: number };
export function attrStats(c: Computed): AttrStat[] {
  const xp = ATTRS.map(a => attrXP(c, a.id));
  const total = xp.reduce((a, b) => a + b, 0);
  const max = Math.max(...xp, 0);
  return ATTRS.map((attr, i) => ({
    attr,
    xp: xp[i],
    share: total ? Math.round((xp[i] / total) * 100) : 0,
    rel: max ? xp[i] / max : 0,
    level: attrLevel(xp[i]),
    nodes: TREES[attr.id].filter((_, n) => nodeDone(c, attr.id, n)).length,
    quests: TREES[attr.id].reduce((s, n, ni) => s + n.quests.filter((q, k) => qDone(q, c.progress[attr.id][ni][k])).length, 0),
  }));
}
