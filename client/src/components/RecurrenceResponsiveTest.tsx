/**
 * Componente de teste para validar responsividade da funcionalidade de recorrência
 * Este arquivo é apenas para referência de testes - pode ser removido em produção
 */

import React from 'react';

export function RecurrenceResponsiveTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans' }}>
      <h2>Guia de Testes de Responsividade</h2>

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Desktop */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Desktop (> 1024px)
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>RecurrenceIndicator deve estar ao lado do título</li>
            <li>RecurrenceTaskMenu deve estar visível ao lado do botão de delete</li>
            <li>RecurrenceSection deve exibir grid 2 colunas para opções</li>
            <li>Modal deve ter maxWidth de 480px</li>
            <li>Histórico deve ter layout de tabela com colunas bem distribuídas</li>
          </ul>
        </div>

        {/* Tablet */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Tablet (768px - 1024px)
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>RecurrenceIndicator pode quebrar para nova linha se necessário</li>
            <li>RecurrenceTaskMenu deve ser acessível com toque</li>
            <li>RecurrenceSection deve manter grid 2 colunas</li>
            <li>Padding deve ser reduzido para 16px</li>
            <li>Histórico deve ter scroll horizontal se necessário</li>
          </ul>
        </div>

        {/* Mobile */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Mobile (< 640px)
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>RecurrenceIndicator deve ter tamanho 'sm' (10px, 2px 4px)</li>
            <li>RecurrenceTaskMenu deve ter min-width de 160px</li>
            <li>RecurrenceSection deve exibir grid 1 coluna</li>
            <li>Botões devem ter altura mínima de 44px para toque</li>
            <li>Padding deve ser 12px</li>
            <li>Histórico deve ter cards empilhados verticalmente</li>
            <li>Status badges devem ser compactas</li>
          </ul>
        </div>

        {/* Testes de Interação */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Testes de Interação
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>Hover em RecurrenceIndicator deve mostrar efeito sutil</li>
            <li>Clique em RecurrenceTaskMenu deve abrir dropdown</li>
            <li>Clique fora do menu deve fechar dropdown</li>
            <li>Transições devem ser suaves (0.2s - 0.3s)</li>
            <li>Animações devem ser fluidas em 60fps</li>
            <li>Toque em botões deve ter feedback visual</li>
          </ul>
        </div>

        {/* Testes de Acessibilidade */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Testes de Acessibilidade
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>Todos os botões devem ser focáveis com Tab</li>
            <li>Cores devem ter contraste suficiente (WCAG AA)</li>
            <li>Ícones devem ter labels ou aria-labels</li>
            <li>Modais devem ter focus trap</li>
            <li>Inputs devem ter labels associados</li>
            <li>Mensagens de erro devem ser claras</li>
          </ul>
        </div>

        {/* Checklist de Consistência Visual */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(107, 114, 128, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(107, 114, 128, 0.2)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
            Checklist de Consistência Visual
          </h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>✓ Cores seguem paleta Ascend (roxo #A855F7 para recorrência)</li>
            <li>✓ Tipografia usa Space Grotesk e DM Sans</li>
            <li>✓ Espaçamentos seguem grid de 4px</li>
            <li>✓ Border radius consistente (6px, 8px)</li>
            <li>✓ Sombras suaves e consistentes</li>
            <li>✓ Ícones de lucide-react com tamanho apropriado</li>
            <li>✓ Estados visuais claros (hover, active, disabled)</li>
            <li>✓ Transições suaves em todos os elementos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
