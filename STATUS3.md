# Status — rodada "tirar furos de espiral + linhas em todas as abas" (16/08/2026)

## Pedido do usuário
1. Remover os furos de espiral (elemento notebook-holes) dos headers — imagem mostrou a barra com 3 furos pretos + linha vermelha que ficou feia.
2. Manter/colocar as linhas de caderno (pauta notebook-page) em todas as abas.

## Feito até agora
- `scripts/fix_headers.py`: remove `<div className="notebook-holes" ...><span/><span/><span/></div>` via regex em todas as pages (seguro, mantém a linha).
- Restauradas 12 páginas do HEAD 150ea8c e holes removidos com o fix_headers (OK, zero holes restantes em todos).
- `Layout.tsx`: removido `background: "#1c1c24"` inline do `<main className="fz-main-content notebook-page">` — agora a pauta + margem vermelha do notebook-page aparece em TODAS as abas (o inline sobrescrevia o CSS).
- `Notes.tsx`: adicionada classe notebook-page no container principal (linha ~409) e no painel do editor (linha ~528), pois o Notes tem container próprio de tela cheia.
- Falta ainda: verificar se o CSS notebook-page usa background-image combinado com o background-color do container Notes (#111118) — pode precisar checar visualmente.

## Atenção
- Academy.tsx tem outro spans de holes inline na linha com "Fichas de Treino" (formato `<span className="notebook-holes"...>...</span>` em uma linha própria — o fix_headers já removeu? grep mostrou 12 arquivos com 1 remoção cada, e `grep -c` final mostrou Academy.tsx:1 — VERIFICAR: pode ter sobranto em Academy (o span formatado diferente do div). Rodar `grep -rn notebook-holes client/src/` e re-rodar build.
- Build deve passar antes de commitar.

## Commit/push
Depois de validar: `git add -A && git commit -m "ui: remover furos de espiral e aplicar pauta de caderno em todas as abas"` + `git push origin teste-ui`.

## Contexto prévio
- Branch: teste-ui; último commit enviado: 150ea8c.
- notebook-page CSS (index.css ~653): background-color #17171f + margem vermelha linear-gradient + repeating-linear-gradient pauta fina rgba(148,150,170,0.075) a cada 30px.
- Dev server: porta 5174.
