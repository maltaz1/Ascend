# STATUS — correção Login (16/08)

## Pedido do usuário
1. Corrigir erro nos inputs do formulário de cadastro/login:
   texto do input SOBREPOSTO ao ícone (na imagem: "Seu nome" com símbolo
   por cima, "sáu@email.com", "Mi" na senha). Causa: .asc-input tem
   `padding: 11px 40px 9px 2px` e .asc-field-icon em left:2px — o texto
   colide com o ícone. Corrigir padding-left para ~24px.
   Arquivo: client/src/pages/Login.tsx, regra .asc-input (linha ~687).
2. Trocar cor ÂMBAR por ROXO na tela de login:
   --accent = #f59e0b (âmbar, usado no Login). Usos de var(--accent)
   no Login.tsx (trocar por var(--primary)):
   - linha 227: .asc-hero-title span (título do hero)
   - linha 353: .asc-xp-mini-fill (barra XP da demo)
   - linha 436: label de stat (tamanho 11px uppercase)
   - linha 468: label (11px, rotate 1.5deg)
   - linha 526: .asc-stat-num.orange (usado como cor laranja de stat — pode manter? usuário quer trocar; substituir)
   - linha 840: .asc-xp-label .r (texto da barra XP demo)
   - linha 969: stroke da XP bar (demo circular)
   - linha 1004: .asc-habit-dot background (demo hábitos)
   Estratégia: trocar todos `var(--accent)` por `var(--primary)` no Login.tsx
   (o arquivo é a tela de login; --primary já é o roxo da marca #8B5CF6).

## Estado
- Dev server: http://localhost:5174
- Repo: /home/ubuntu/Ascend, branch teste-ui.
- Compilar: `cd /home/ubuntu/Ascend && npx tsc --noEmit` (8 erros pré-existentes da main: workouts/Academy — ignorar).
- Erros TS anteriores do STATUS8 resolvidos e já commitados (3553b3c, 76d4167).

## Após correção
- Validar tela de login: / (ou /login) e tela de cadastro — inputs legíveis, sem sobreposição, cores roxas.
- Commitar e push para teste-ui.
