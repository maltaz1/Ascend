# Status — terceira direção de fundo (16/08/2026)

## Sequência do pedido do usuário
1. Linhas de caderno → usuário não gostou
2. Grão de papel + vignetes (noise SVG 0.09, vineta roxa sup. dir., âmbar inf. esq.) → "faça outro jeito"
3. ATUAL: "Cartolina noturna" — sem ruído, sem padrão repetitivo

## Nova direção aplicada (index.css ~linha 147, body)
- background-color: #12111a
- Uma única luz de "abajur": radial 90% 55% at 50% -18%, roxa suave (0.13→0.05→transparent)
- Contraluz âmbar vindo de baixo: radial 110% 70% at 50% 130% (0.05→transparent)
- Sem noise SVG, sem pauta, sem vignetes laterais

## notebook-page (main) ainda tem o noise antigo — manter ou remover?
- Decisão: remover noise das páginas também (consistência com o body limpo),
  deixar notebook-page apenas com os radial-gradients iguais ao body.
  (Se não remover, o main terá noise e o body não — inconsistente.)

## Notas
- Build já passou antes da última edição (preciso rodar de novo)
- Commits anteriores: e25c757 (grão), f4a81d6 (sem furos), 150ea8c, 25b6add
- Branch: teste-ui, repo maltaz1/Ascend
- Próximos: build, ver Dashboard + Financeiro, decidir sobre notebook-page,
  commit "ui: fundo cartolina noturna com iluminação de abajur" e push
