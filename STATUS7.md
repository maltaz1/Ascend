# STATUS7.md — Settings.tsx em debugging (16/08/2026)

## Pedido atual do usuário
1. Adicionar opção de alternar tema claro/escuro nas Configurações.
2. Ajustar padding da aba Configurações.

## Feito até agora (Settings.tsx)
- Import: Sun, Moon, useTheme do contexts/ThemeContext.
- const { theme, toggleTheme } = useTheme();
- Padding da aba: wrapper agora `max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-12` (antes px-4 py-8).
- Card Aparência: adicionado bloco "Tema do caderno" com botão toggle
  (texto: escuro->"Day Ledger", claro->"Ledger Noturno", ícones Sun/Moon).
- Blocos internos escuros convertidos p/ tokens: bg-[var(--muted)],
  border-[var(--ledger-paper-border)], textos var(--ink)/--ink-muted.
- Inputs/textareas: nova classe .ledger-input-field no index.css
  (background var(--muted), border, placeholder muted, focus primary).
- Perfil top card: background var(--ledger-paper-bg), shadow token.

## PROBLEMA ATUAL: JSX desbalanceado em Settings.tsx
O tokenizer mostra stack residual: ['div','div','div','div','motion.div','div','textarea','CancellationModal']
e mismatches (closing div onde stack tem textarea/motion.div).

Causa provável: as edições de fechamento nas linhas 370 e 567 ficaram erradas.
- Linha 370 (fim do PERFIL TOP): original fechava 4 divs antes de space-y-6.
  Estado atual: `</div></div></div></div><div className="space-y-6"><div>`
  (4 fechamentos + abre div3 space-y-6 + abre div4 extra)
- Linha 567 (fim do Sobre): tail atual:
  `</div></div></motion.div></div></div></div></div></div><CancellationModal`
  (fecha: div linha, div space-y-3? NÃO — motion.div vem antes; ordem:
  div interno(1), div flex(2), motion(3), space-y-3(4), div4(5), div3(6), wrapper2(7))

A árvore correta deveria ser:
  wrapper1(min-h-screen) > wrapper2(max-w-4xl) > [header, perfilTop]
  + div3(space-y-6) > div4 > [motion cards, Sobre] + CancellationModal como
  irmão dentro de div3?? NÃO — original: CancellationModal era irmão de div3
  dentro de wrapper2, e wrapper1 fechava depois.

ESTRUTURA ORIGINAL (git show HEAD:client/src/pages/Settings.tsx):
  <div wrapper1><div wrapper2>
    [header notebook-sheet]
    [perfil top: abre div card; fecha 4 divs]
    <div className="space-y-6">
      [cards motion]
    </div>  ← fecha div3
    <CancellationModal ... />
  </div>  ← fecha wrapper2
  );  ← wrapper1 fecha no </div> da linha do CancellationModal (`/></div>`)

Minha edição adicionou `<div>` extra na 370 (div4) que precisa fechar antes
do CancellationModal. E o perfil top: meu replace removeu 1 fechamento
(badge, coluna, flex, card-top = 4; atual tenho 4 ok na 370).

PRÓXIMO PASSO: reconstruir a árvore corretamente:
- 370: `</div></div></div></div><div className="space-y-6"><div>` (4 + abre 3, abre 4) ✔ provável ok
- 567 tail deve ser: fecha div interno Sobre(1), fecha div flex(2), fecha motion.div(3),
  fecha div space-y-3(4), fecha div4(5), fecha div3 space-y-6(6), fecha wrapper2(7)
  => `</div></div></motion.div></div></div></div></div><CancellationModal`
  (3 div + motion + 3 div = tail correto)
- linha 571: ` /></div>` fecha wrapper1. ✔
Mas o tokenizer ainda mostra div residual — ver se na 567 atual o </motion.div>
vem ANTES de 4 divs (fechando space-y-3, div4, div3, wrapper2 = 4) — precisa
fechar 1 div extra antes do motion (div interno do Sobre) e 1 depois (wrapper2).
Tail final desejado: `</div></div></motion.div></div></div></div><CancellationModal`
(2 antes motion, 4 depois). ATUAL tenho 1 antes + 5 depois => mover 1 div.

## Erros TS pré-existentes (não tocar): mappers.ts, gym.ts, Academy.tsx, workouts
## Dev server localhost:5174; branch teste-ui; repo maltaz1/Ascend
