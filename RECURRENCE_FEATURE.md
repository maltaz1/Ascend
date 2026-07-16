# Funcionalidade de Tarefas Recorrentes - Documentação

## Visão Geral

A funcionalidade de Tarefas Recorrentes permite que os usuários criem tarefas que se repetem automaticamente em intervalos regulares (diários, semanais, mensais, anuais) ou em padrões personalizados.

## Arquitetura

### Tipos e Interfaces

Todos os tipos estão definidos em `/client/src/types/recurrence.ts`:

- **RecurrenceType**: `'never' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom'`
- **RecurrenceEndType**: `'never' | 'after_occurrences' | 'on_date'`
- **RecurrenceConfig**: Configuração completa da recorrência
- **RecurringTask**: Tarefa com dados de recorrência
- **RecurrenceHistory**: Histórico de ocorrências

### Componentes

#### 1. **RecurrenceSection** (`/client/src/components/RecurrenceSection.tsx`)
Interface para configurar recorrência no modal de criação/edição de tarefas.

**Props:**
- `recurrence: RecurrenceConfig` - Configuração atual
- `onChange: (recurrence: RecurrenceConfig) => void` - Callback de mudança

**Funcionalidades:**
- Seleção de tipo de recorrência (7 opções)
- Configuração personalizada (intervalo + unidade)
- Seleção de dias da semana para recorrência semanal
- Configuração de término (nunca, após X ocorrências, em data específica)

#### 2. **RecurrenceIndicator** (`/client/src/components/RecurrenceIndicator.tsx`)
Badge visual discreta que indica o tipo de recorrência de uma tarefa.

**Props:**
- `type: RecurrenceType` - Tipo de recorrência
- `size?: 'sm' | 'md'` - Tamanho do indicador

**Estilos:**
- Cor roxa (#A855F7) para manter consistência visual
- Ícone de rotação (🔁) para indicar recorrência
- Tamanho pequeno para não poluir a interface

#### 3. **RecurrenceTaskMenu** (`/client/src/components/RecurrenceTaskMenu.tsx`)
Menu de ações para tarefas recorrentes.

**Ações disponíveis:**
- Editar recorrência
- Pular esta ocorrência
- Pausar/Retomar recorrência
- Excluir apenas esta ocorrência
- Excluir toda a recorrência

**Props:**
- `isRecurring: boolean` - Se a tarefa é recorrente
- `recurrenceStatus?: 'active' | 'paused'` - Status da recorrência
- Callbacks para cada ação

#### 4. **RecurrenceDetailsModal** (`/client/src/components/RecurrenceDetailsModal.tsx`)
Modal que exibe detalhes completos da recorrência e histórico.

**Abas:**
1. **Detalhes**: Tipo, próxima ocorrência, status, término
2. **Histórico**: Concluídas, puladas, perdidas

**Dados mockados:** Demonstra como o histórico será exibido

#### 5. **RecurrenceHistory** (`/client/src/pages/RecurrenceHistory.tsx`)
Página completa com histórico de todas as tarefas recorrentes.

**Funcionalidades:**
- Filtros: Todas, Concluídas, Puladas, Perdidas
- Lista ordenada por data (mais recentes primeiro)
- Indicadores visuais por status
- Resumo estatístico

## Integração no Tasks.tsx

### Modificações realizadas:

1. **Tipo Task estendido:**
   ```typescript
   type Task = {
     // ... campos existentes
     recurrence?: RecurrenceConfig;
     isRecurring?: boolean;
   };
   ```

2. **Modal de criação:**
   - Adicionado botão "Adicionar recorrência"
   - Integrado RecurrenceSection
   - Suporte a criação de tarefas recorrentes

3. **TaskItem atualizado:**
   - Exibe RecurrenceIndicator quando recorrente
   - Integrado RecurrenceTaskMenu
   - Callbacks para ações de recorrência

4. **Callbacks de ação:**
   - `onEditRecurrence`: Editar configuração
   - `onSkipOccurrence`: Pular ocorrência
   - `onTogglePause`: Pausar/Retomar
   - `onDeleteOccurrence`: Excluir ocorrência
   - `onDeleteRecurrence`: Excluir toda recorrência

## Estilos e Animações

Arquivo: `/client/src/styles/recurrence.css`

### Animações:
- **fadeInSlide**: Entrada suave de indicadores
- **subtlePulse**: Efeito hover discreto
- **gentleRotate**: Rotação suave do ícone
- **completeTask**: Animação de conclusão
- **slideInNext**: Entrada da próxima ocorrência

### Estados visuais:
- `task-recurring-active`: Tarefa ativa (opacidade 100%)
- `task-recurring-paused`: Tarefa pausada (opacidade 60%)
- `task-recurring-completed`: Tarefa concluída (opacidade 80%)

### Responsividade:
- Ajustes para mobile (< 640px)
- Tamanhos reduzidos de indicadores
- Menu adaptado para telas pequenas

## Cores e Design

### Paleta de cores:
- **Recorrência ativa**: Roxo (#A855F7)
- **Concluída**: Verde (#10B981)
- **Pulada**: Âmbar (#F59E0B)
- **Perdida**: Vermelho (#EF4444)
- **Pausada**: Cinza (#6b7280)

### Tipografia:
- Labels: DM Sans, 12px, peso 500
- Títulos: Space Grotesk, 20px, peso 700
- Conteúdo: DM Sans, 14px, peso 500

## Dados Mockados

### Histórico de exemplo (RecurrenceHistory.tsx):
```typescript
const MOCK_HISTORY: RecurringTaskHistory[] = [
  {
    id: '1',
    title: 'Exercício matinal',
    type: 'daily',
    completed: [
      { date: '2026-07-15', completedAt: '2026-07-15T07:30:00' },
      // ...
    ],
    skipped: [
      { date: '2026-07-12' },
      // ...
    ],
    lost: [
      { date: '2026-07-11' },
    ],
  },
  // ...
];
```

## Fluxo de Uso

### Criar tarefa recorrente:
1. Clicar em "Nova Tarefa"
2. Preencher título, descrição, data, prioridade
3. Clicar em "+ Adicionar recorrência"
4. Selecionar tipo de recorrência
5. Configurar término (opcional)
6. Clicar em "Adicionar Tarefa"

### Gerenciar tarefa recorrente:
1. Visualizar indicador roxo na tarefa
2. Clicar no menu (⋮) para ver ações
3. Escolher ação desejada:
   - Editar recorrência
   - Pular ocorrência
   - Pausar/Retomar
   - Excluir ocorrência ou toda recorrência

### Visualizar histórico:
1. Acessar "Histórico Recorrente" no menu lateral
2. Filtrar por status (todas, concluídas, puladas, perdidas)
3. Visualizar resumo estatístico

## Próximos Passos (Backend)

Para integração com backend, será necessário:

1. **Tabela de recorrências:**
   - Armazenar configurações de RecurrenceConfig
   - Relacionar com tabela de tarefas

2. **Tabela de ocorrências:**
   - Registrar cada ocorrência gerada
   - Rastrear status (concluída, pulada, perdida)

3. **Endpoints API:**
   - POST `/api/tasks/recurring` - Criar tarefa recorrente
   - PUT `/api/tasks/:id/recurrence` - Atualizar recorrência
   - GET `/api/tasks/:id/history` - Obter histórico
   - POST `/api/tasks/:id/skip-occurrence` - Pular ocorrência
   - POST `/api/tasks/:id/pause-recurrence` - Pausar
   - DELETE `/api/tasks/:id/recurrence` - Deletar recorrência

4. **Lógica de geração:**
   - Gerar próximas ocorrências baseado em RecurrenceConfig
   - Executar job para criar ocorrências futuras
   - Marcar ocorrências como perdidas quando passam da data

## Notas Importantes

- ✅ Todo o frontend está funcional com estados locais
- ✅ Interface segue identidade visual do Ascend
- ✅ Componentes reutilizáveis e bem organizados
- ✅ Responsivo para mobile
- ✅ Animações suaves e microinterações
- ⏳ Backend ainda não implementado (aguardando integração)

## Arquivos Criados/Modificados

### Criados:
- `/client/src/types/recurrence.ts`
- `/client/src/components/RecurrenceSection.tsx`
- `/client/src/components/RecurrenceIndicator.tsx`
- `/client/src/components/RecurrenceTaskMenu.tsx`
- `/client/src/components/RecurrenceDetailsModal.tsx`
- `/client/src/pages/RecurrenceHistory.tsx`
- `/client/src/styles/recurrence.css`

### Modificados:
- `/client/src/pages/Tasks.tsx` - Integração de recorrência
- `/client/src/App.tsx` - Adição de rota para histórico
- `/client/src/components/Layout.tsx` - Adição de link na navegação

## Testes Recomendados

- [ ] Criar tarefa recorrente diária
- [ ] Criar tarefa recorrente semanal com dias específicos
- [ ] Criar tarefa recorrente personalizada
- [ ] Testar cada ação do menu
- [ ] Verificar responsividade em mobile
- [ ] Testar filtros no histórico
- [ ] Validar animações e transições
