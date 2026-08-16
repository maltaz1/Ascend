import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Mail } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #111118)",
        color: "#f5f5f5",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle, #2a2a32)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          background: "var(--bg-primary, #111118)",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "var(--bg-secondary, #1a1a22)",
            border: "1px solid var(--border-subtle, #2a2a32)",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#9ca3af",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={20} style={{ color: "var(--primary)" }} />
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              color: "#fff",
            }}
          >
            Termos de Uso
          </h1>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        <div style={{ marginBottom: 8, color: "#9ca3af", fontSize: 13 }}>
          Última atualização: 30 de julho de 2026
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 16px",
            lineHeight: 1.2,
          }}
        >
          Regras para utilização do Ascend
        </h2>

        <p style={{ color: "#d1d5db", fontSize: 15, lineHeight: 1.7, margin: "0 0 32px" }}>
          Ao criar uma conta e utilizar o Ascend, você concorda com os termos abaixo.
          Leia com atenção antes de prosseguir.
        </p>

        {/* 1 */}
        <Section title="1. Aceitação dos Termos">
          <p style={bodyStyle}>
            Ao se cadastrar ou utilizar o Ascend, você declara que leu, compreendeu e
            concorda com estes Termos de Uso. Caso não concorde com qualquer disposição,
            solicitamos que não utilize o aplicativo.
          </p>
        </Section>

        {/* 2 */}
        <Section title="2. Elegibilidade">
          <p style={bodyStyle}>
            Para utilizar o Ascend, você deve ter pelo menos 16 anos de idade.
            Usuários entre 16 e 18 anos devem possuir autorização dos responsáveis legais.
            O fornecimento de informações falsas ou enganosas durante o cadastro
            configura violação destes termos.
          </p>
        </Section>

        {/* 3 */}
        <Section title="3. Plano Gratuito (Ascend Free)">
          <p style={bodyStyle}>O plano gratuito oferece acesso às seguintes funcionalidades:</p>
          <ul style={listStyle}>
            <li>Criação de até <strong>1 tarefa por semana</strong></li>
            <li>Acompanhamento de até <strong>3 hábitos</strong></li>
            <li>Criação de até <strong>1 meta</strong></li>
            <li>Acesso ao Dashboard, Hoje, Calendário e Configurações</li>
            <li>Sistema de XP e streaks diários</li>
          </ul>
          <p style={bodyStyle}>
            As demais funcionalidades (dieta, financeiro, academia, notas, oração,
            tarefas ilimitadas, metas ilimitadas e hábitos ilimitados) estão disponíveis
            exclusivamente no plano PRO.
          </p>
        </Section>

        {/* 4 */}
        <Section title="4. Plano PRO (Ascend PRO)">
          <p style={bodyStyle}>O plano PRO é um serviço pago que oferece:</p>
          <ul style={listStyle}>
            <li>Tarefas, metas e hábitos ilimitados</li>
            <li>Módulos de Dieta, Financeiro, Academia, Notas e Oração</li>
            <li>Relatórios de evolução</li>
            <li>Suporte prioritário</li>
          </ul>
          <p style={bodyStyle}>
            O pagamento é processado pela plataforma <strong>Cakto</strong>. Ao realizar
            o pagamento, você concorda com os termos de cobrança recorrente (se aplicável).
          </p>
        </Section>

        {/* 5 */}
        <Section title="5. Pagamento e Cancelamento">
          <p style={bodyStyle}>
            O pagamento do Ascend PRO é processado pela plataforma Cakto. O valor cobrado
            será informado no momento da assinatura.
          </p>
          <p style={bodyStyle}>
            Para solicitar o cancelamento, acesse <strong>Configurações &gt; Cancelamento</strong>
            dentro do aplicativo. Após a solicitação:
          </p>
          <ul style={listStyle}>
            <li>O acesso ao plano PRO continuará disponível até o final do período já pago.</li>
            <li>Não serão realizados novos cobranças.</li>
            <li>Após o término do período, a conta voltará ao plano gratuito automaticamente.</li>
            <li>Não há reembolso para períodos já pagos, exceto conforme exigido por lei.</li>
          </ul>
        </Section>

        {/* 6 */}
        <Section title="6. Responsabilidades do Usuário">
          <p style={bodyStyle}>Você se compromete a:</p>
          <ul style={listStyle}>
            <li>Utilizar o Ascend apenas para fins lícitos e em conformidade com a lei.</li>
            <li>Não compartilhar sua conta com terceiros.</li>
            <li>Não utilizar o aplicativo para armazenar dados de terceiros sem o consentimento deles.</li>
            <li>Não tentar contornar as limitações do plano gratuito ou acessar funcionalidades PRO sem pagamento.</li>
            <li>Não realizar engenharia reversa, descompilação ou qualquer tentativa de acessar o código-fonte não disponível.</li>
            <li>Não publicar conteúdo ofensivo, discriminatório, ameaçador ou ilegal em qualquer funcionalidade do app.</li>
          </ul>
        </Section>

        {/* 7 */}
        <Section title="7. Propriedade Intelectual">
          <p style={bodyStyle}>
            O Ascend, incluindo sua marca, design, interface, logotipos e funcionalidades,
            é propriedade intelectual exclusiva dos seus desenvolvedores. É proibida a
            reprodução, distribuição ou utilização não autorizada de qualquer elemento
            visual ou funcional do aplicativo.
          </p>
          <p style={bodyStyle}>
            Os dados inseridos pelo usuário (tarefas, hábitos, metas, notas, etc.)
            permanecem como propriedade do próprio usuário. O Ascend não reivindica
            posse sobre o conteúdo criado pelos usuários.
          </p>
        </Section>

        {/* 8 */}
        <Section title="8. Limitação de Responsabilidade">
          <p style={bodyStyle}>
            O Ascend é fornecido "como está" ("as is"), sem garantias expressas ou
            implícitas. Não nos responsabilizamos por:
          </p>
          <ul style={listStyle}>
            <li>Perda de dados decorrente de falhas técnicas, interrupções de serviço ou atos de força maior.</li>
            <li>Decisões tomadas com base nas informações exibidas no aplicativo (financeiras, de saúde, etc.).</li>
            <li>Interrupções temporárias do serviço para manutenção ou atualizações.</li>
            <li>Indisponibilidade causada por fatores externos (problemas no Supabase, Cakto, internet do usuário, etc.).</li>
          </ul>
          <p style={bodyStyle}>
            Recomendamos manter backups periódicos dos seus dados importantes.
          </p>
        </Section>

        {/* 9 */}
        <Section title="9. Suspensão e Encerramento">
          <p style={bodyStyle}>
            O Ascend se reserva o direito de suspender ou encerrar contas em casos de:
          </p>
          <ul style={listStyle}>
            <li>Violação destes Termos de Uso.</li>
            <li>Uso abusivo ou fraude no sistema de pagamento.</li>
            <li>Atividade que comprometa a segurança ou o funcionamento do aplicativo.</li>
            <li>Conteúdo ilegal ou ofensivo identificado no aplicativo.</li>
          </ul>
          <p style={bodyStyle}>
            Em caso de suspensão, o usuário será notificado e terá a oportunidade
            de entrar em contato para resolver a situação.
          </p>
        </Section>

        {/* 10 */}
        <Section title="10. Privacidade">
          <p style={bodyStyle}>
            O tratamento dos seus dados pessoais é regulado pela{" "}
            <a href="/privacy" style={{ color: "var(--primary)", textDecoration: "none" }}>
              Política de Privacidade
            </a>{" "}
            do Ascend, que é parte integrante destes Termos de Uso.
          </p>
        </Section>

        {/* 11 */}
        <Section title="11. Alterações nos Termos">
          <p style={bodyStyle}>
            O Ascend pode atualizar estes Termos de Uso periodicamente. Em caso de
            mudanças significativas, os usuários serão notificados por e-mail ou dentro
            do aplicativo. O uso continuado após a atualização constitui aceitação dos
            novos termos.
          </p>
        </Section>

        {/* 12 */}
        <Section title="12. Foro e Legislação Aplicável">
          <p style={bodyStyle}>
            Estes Termos de Uso são regidos pela legislação brasileira. Qualquer
            controvérsia decorrente da relação entre o usuário e o Ascend será
            submetida ao foro da comarca do domicílio do usuário, ressalvado o direito
            de escolha de foro mais adequado conforme a lei.
          </p>
        </Section>

        {/* 13 */}
        <Section title="13. Contato">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 24px",
              background: "var(--bg-secondary, #1a1a22)",
              borderRadius: 16,
              border: "1px solid var(--border-subtle, #2a2a32)",
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p style={{ margin: 0, color: "#f5f5f5", fontSize: 14, fontWeight: 600 }}>
                ascendprod1@gmail.com
              </p>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                Para dúvidas sobre estes Termos de Uso
              </p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

/* ── Helper Components ── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 20,
          fontWeight: 600,
          color: "#fff",
          margin: "0 0 12px",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

const bodyStyle: React.CSSProperties = {
  color: "#d1d5db",
  fontSize: 14,
  lineHeight: 1.7,
  marginBottom: 12,
};

const listStyle: React.CSSProperties = {
  color: "#d1d5db",
  fontSize: 14,
  lineHeight: 2,
  paddingLeft: 20,
  margin: "0 0 16px",
};
