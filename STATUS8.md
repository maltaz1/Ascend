# STATUS — remoção dos ícones flutuantes coloridos (16/08)

## Pedido do usuário
Remover "tudo nesse estilo": ícones coloridos flutuantes/soltos sobre o
fundo (zap roxo, seta trending verde, quadrado com check verde) —
exemplo dado: imagem mostra o topo do card métrica com ícone Zap roxo
em quadrado de borda + TrendingUp verde flutuante.

## Feito até agora
1. Dashboard.tsx MetricCard:
   - REMOVIDO o div quadrado (30x30, borda colorida) com o ícone colorido.
   - REMOVIDOS TrendingUp/TrendingDown flutuantes.
   - REMOVIDAS props icon/trend/variant das 4 chamadas MetricCard.
   - REMOVIDOS imports não usados (Zap, CheckSquare, Flame, TrendingUp,
     TrendingDown, AlertTriangle).
   - MAS o tipo TS do MetricCard ainda exige icon/variant => ERROS TS
     nas chamadas (linhas ~721-739) e ExpandableSection exige icon
     (linha 751, uso legítimo em Insights).

## Pendente
2. Tornar icon/trend/variant OPTIONAIS no tipo do MetricCard (Dashboard.tsx
   linha ~146: `icon: React.ElementType` -> `icon?: React.ElementType`,
   remover `variant` obrigatório ou torná-lo optional).
3. ExpandableSection na linha ~751: adicionar de volta `icon={Calendar}`?
   NÃO — o regex removeu TODAS as props icon=, inclusive as legítimas do
   ExpandableSection (Insights ~751 usa Calendar). Verificar chamadas
   ExpandableSection restantes e re-adicionar icon={Calendar} etc.
   ExpandableSection usa o quadrado com borda violeta + ícone primary
   (linhas 89-100) — o usuário pediu remover esse estilo TAMBÉM?
   A imagem mostra o ícone em quadrado; ExpandableSection tem o mesmo
   padrão. Remover o quadrado do ExpandableSection também (mas manter
   a prop icon opcional para não quebrar tipos).
4. Procurar outros lugares com estilo parecido (quadrado com borda
   colorida + ícone colorido flutuante): grep por `border: "1px solid rgba`
   e ícones coloridos via prop `color=` em todo client/src/pages.
   Candidatos: Habits habit-insight-icon (TrendingUp), Diet, etc.
   Nota: hab-insight usa ícone verde em div .habit-insight-icon — avaliar
   se remover. O usuário mandou remover "tudo nesse estilo".
5. Validar Dashboard claro/escuro, depois git commit/push teste-ui.

## Contexto técnico
- Repo: /home/ubuntu/Ascend, branch teste-ui.
- Compilar: `cd /home/ubuntu/Ascend && npx tsc --noEmit`
- Dev server: http://localhost:5174 (porta pode mudar; verificar com curl
  -o /dev/null -w '%{http_code}' http://localhost:5174)
- Tema claro: .dark removido do body; toggle no Layout + Settings.
