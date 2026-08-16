# Refinamentos solicitados (16/08/2026, rodada 2)

## 1. Linhas de caderno ficaram "bem feias"
O usuário mostrou a imagem da margem esquerda com furos e linha vermelha — o problema principal é a página de caderno no Layout (`.notebook-page`) cujo `repeating-linear-gradient` com linhas violeta translúcidas em TODO o fundo ficou feio. O usuário quer linhas de caderno de verdade (pauta clássica), mas bem executadas.

Decisão de redesign:
- `.notebook-page`: manter a pauta mas com linhas horizontais suaves e sutis (cor de pauta cinza-azulado #2e2e3a, opacity baixa), mais finas (1px a cada 32px) e sem o radial-gradients estranhos. Talvez adicionar linha vertical de margem vermelha à esquerda também na página inteira (estilo caderno escolar: margem + pauta).
- `.notebook-sheet--margined::before`: linha vermelha atual está escura demais (#9d4a4a opaca); clarear para #c0564a com opacity 0.7.
- Furos de espiral estão ok (o usuário não reclamou dos furos, mas o conjunto "ficou feio" — manter).

## 2. Select nativo com fundo branco e texto ilegível
Os `<select className="ledger-input">` têm estilo inline `background: transparent`, mas isso não afeta os `<option>` — que no fundo escuro do browser aparecem com fundo branco/claro, texto escuro em fundo branco, ilegível no contexto. Corrigir:
- Adicionar `color-scheme: dark` nos selects (make o dropdown dark no Chrome/Edge).
- Estilo inline extra não é necessário; adicionar regra global `.ledger-input select` não — melhor regra: `.ledger-input { color-scheme: dark; }` e também para selects nativos em geral.

## 3. Emojis nos seletores (imagem: "[A] Alimentação")
Trocar o sistema de iniciais `[A]`, `[T]`... por emojis reais: 🍔 Alimentação, 🚌 Transporte, 🏠 Moradia, 🎮 Lazer & Estilo de Vida, 💪 Saúde & Bem-Estar, 🛍️ Compras & Pessoal, 🎓 Educação, 🧾 Outros / Imprevistos, 💰 Salário, 💻 Freelance, 📈 Investimentos, 🧩 Outros (renda).
Onde aparece o padrão `[icon]` em selects/options e também em stamps de categoria do Financial (verificar renderização de categorias no painel — linhas com `[A]` também?).

Arquivos a editar:
- client/src/index.css (notebook-page, notebook-sheet--margined, select color-scheme)
- client/src/pages/Financial.tsx (CATEGORY_ICONS → emojis, PREDEFINED_CATEGORIES icon → emoji, INCOME_CATEGORIES, e stamps [A])
- client/src/pages/Notes.tsx (select de pasta — verificar se tem iniciais)
- client/src/components/AppointmentModal.tsx (categorias de compromisso — verificar texto)
- Verificar também Habits (select de cor? recorrência?), Academy, Diet (seletores), Prayer (sugestões já têm emojis).
