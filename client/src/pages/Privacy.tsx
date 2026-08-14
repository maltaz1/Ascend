import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Mail } from "lucide-react";

export default function Privacy() {
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
          <Shield size={20} style={{ color: "#8b5cf6" }} />
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              color: "#fff",
            }}
          >
            Política de Privacidade
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
          Como protegemos seus dados
        </h2>

        <p style={{ color: "#d1d5db", fontSize: 15, lineHeight: 1.7, margin: "0 0 32px" }}>
          O Ascend valoriza a privacidade dos seus usuários. Esta política descreve de forma
          transparente quais dados coletamos, como os utilizamos e quais são os seus direitos
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>

        {/* Section 1 */}
        <Section title="1. Dados que coletamos" subtitle="Informações necessárias para funcionamento do aplicativo">
          <DataItem
            category="Dados de cadastro"
            items={["E-mail", "Nome (opcional)", "Senha (armazenada de forma criptografada pelo Supabase)"]}
          />
          <DataItem
            category="Dados de perfil"
            items={["Nome de exibição", "Foto de perfil (URL)"]}
          />
          <DataItem
            category="Dados de uso do aplicativo"
            items={["Tarefas criadas e concluídas", "Hábitos e streaks diários", "Metas e progresso", "Registros de exercícios e sessões de treino", "Registros de refeições e dados nutricionais", "Transações financeiras e categorias", "Notas e pastas de notas", "Conversas de oração (texto)"]}
          />
          <DataItem
            category="Dados técnicos"
            items={["Tipo de dispositivo e navegador (via Vercel Analytics)", "Dados de sessão (armazenados localmente no IndexedDB/LocalStorage)", "Logs de erros para diagnóstico técnico"]}
          />
        </Section>

        {/* Section 2 */}
        <Section title="2. Finalidade de cada dado coletado">
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <th style={thStyle}>Dado</th>
                <th style={thStyle}>Finalidade</th>
                <th style={thStyle}>Base legal</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>E-mail e senha</td>
                <td style={tdStyle}>Criação de conta e autenticação</td>
                <td style={tdStyle}>Execução de contrato</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Nome e avatar</td>
                <td style={tdStyle}>Personalização do perfil</td>
                <td style={tdStyle}>Consentimento</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Tarefas, hábitos, metas</td>
                <td style={tdStyle}>Funcionalidade principal do app</td>
                <td style={tdStyle}>Execução de contrato</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Dados de dieta e treino</td>
                <td style={tdStyle}>Funcionalidade principal do app</td>
                <td style={tdStyle}>Execução de contrato</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Dados financeiros</td>
                <td style={tdStyle}>Funcionalidade principal do app</td>
                <td style={tdStyle}>Execução de contrato</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Notas e orações</td>
                <td style={tdStyle}>Funcionalidade principal do app</td>
                <td style={tdStyle}>Consentimento</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Status PRO (is_pro)</td>
                <td style={tdStyle}>Controle de acesso ao plano pago</td>
                <td style={tdStyle}>Execução de contrato</td>
              </tr>
              <tr>
                <td style={tdStyle}>Dados de uso (Vercel)</td>
                <td style={tdStyle}>Análise de tráfego e melhorias</td>
                <td style={tdStyle}>Interesse legítimo</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Section 3 */}
        <Section title="3. Armazenamento e segurança">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Seus dados são armazenados nos seguintes locais:
          </p>
          <ul style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li><strong>Supabase (servidor):</strong> Dados de autenticação, perfil, tarefas, metas, hábitos, treinos, dieta, financeiro, notas e orações. Armazenados em banco PostgreSQL com criptografia em repouso e em trânsito (TLS).</li>
            <li><strong>IndexedDB / LocalStorage (dispositivo):</strong> Cache local do estado do aplicativo para funcionamento offline e melhor performance. Sincronizado com o servidor quando há conexão.</li>
            <li><strong>Storagem Supabase:</strong> Imagem de perfil (se utilizada).</li>
          </ul>
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
            O tempo de retenção dos dados é o período em que sua conta estiver ativa.
            Após a exclusão da conta, os dados pessoais são removidos conforme descrito
            na seção 7.
          </p>
        </Section>

        {/* Section 4 */}
        <Section title="4. Compartilhamento com terceiros">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            O Ascend compartilha dados apenas quando estritamente necessário:
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <th style={thStyle}>Terceiro</th>
                <th style={thStyle}>Dados compartilhados</th>
                <th style={thStyle}>Finalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Supabase</td>
                <td style={tdStyle}>E-mail, nome, dados do app</td>
                <td style={tdStyle}>Banco de dados e autenticação</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Cakto (pagamentos)</td>
                <td style={tdStyle}>E-mail, status de pagamento</td>
                <td style={tdStyle}>Processamento de pagamento</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #2a2a32" }}>
                <td style={tdStyle}>Vercel Analytics</td>
                <td style={tdStyle}>Página visitada, tipo de dispositivo</td>
                <td style={tdStyle}>Análise de uso</td>
              </tr>
              <tr>
                <td style={tdStyle}>OpenAI (via API)</td>
                <td style={tdStyle}>Texto das conversas de oração</td>
                <td style={tdStyle}>Funcionalidade de IA</td>
              </tr>
            </tbody>
          </table>
          <p style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.7, marginTop: 16, fontStyle: "italic" }}>
            Não vendemos, alugamos ou comercializamos seus dados pessoais para terceiros.
          </p>
        </Section>

        {/* Section 5 */}
        <Section title="5. Cookies e tecnologias similares">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            O Ascend não utiliza cookies de rastreamento ou publicidade. Utilizamos apenas:
          </p>
          <ul style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li><strong>Sessão de autenticação:</strong> Armazenada localmente no navegador para manter o usuário logado (sessão JWT do Supabase).</li>
            <li><strong>Cache local:</strong> IndexedDB e LocalStorage para funcionamento offline e performance.</li>
          </ul>
        </Section>

        {/* Section 6 */}
        <Section title="6. Seus direitos (LGPD)">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
            Conforme a Lei Geral de Proteção de Dados, você tem os seguintes direitos:
          </p>
          <ul style={{ color: "#d1d5db", fontSize: 14, lineHeight: 2, paddingLeft: 20, margin: 0 }}>
            <li><strong>Acesso:</strong> Solicitar uma cópia de todos os seus dados pessoais.</li>
            <li><strong>Correção:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
            <li><strong>Anonimização:</strong> Solicitar a anonimização de dados que não são mais necessários.</li>
            <li><strong>Portabilidade:</strong> Solicitar a transferência de seus dados para outro serviço.</li>
            <li><strong>Eliminação:</strong> Solicitar a exclusão de dados desnecessários, excessivos ou tratados em desconformidade com a lei.</li>
            <li><strong>Informação:</strong> Solicitar informações sobre o compartilhamento de dados com entidades públicas ou privadas.</li>
            <li><strong>Revogação de consentimento:</strong> Retirar o consentimento a qualquer momento.</li>
            <li><strong>Oposição:</strong> Opor-se ao tratamento realizado com base no interesse legítimo.</li>
          </ul>
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
            Para exercer seus direitos, acesse <strong>Configurações &gt; Privacidade e Dados</strong> dentro do aplicativo ou envie um e-mail para{" "}
            <a href="mailto:ascendprod1@gmail.com" style={{ color: "#8b5cf6", textDecoration: "none" }}>
              ascendprod1@gmail.com
            </a>.
          </p>
        </Section>

        {/* Section 7 */}
        <Section title="7. Exclusão de conta">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
            Você pode solicitar a exclusão da sua conta a qualquer momento. Ao excluir a conta:
          </p>
          <ul style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Sua conta de autenticação (Supabase Auth) será removida.</li>
            <li>Todos os seus dados pessoais serão excluídos das tabelas do banco de dados.</li>
            <li>Dados estatísticos anonimizados poderão ser mantidos para fins de análise agregada.</li>
            <li>Sua sessão será encerrada em todos os dispositivos.</li>
          </ul>
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
            Para excluir sua conta, acesse <strong>Configurações &gt; Privacidade e Dados &gt; Excluir Conta</strong>. Por segurança, o processo exige a confirmação da sua senha antes da exclusão (reautenticação), impedindo que sessões abertas por terceiros apaguem seus dados.
          </p>
        </Section>

        {/* Section 8 */}
        <Section title="8. Dados de crianças e adolescentes">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7 }}>
            O Ascend não é direcionado a menores de idade. Caso um menor de 18 anos utilize
            o aplicativo, recomendamos que os responsáveis legais acompanhem o uso e entrem
            em contato conosco para qualquer dúvida sobre o tratamento de dados.
          </p>
        </Section>

        {/* Section 9 */}
        <Section title="9. Alterações nesta política">
          <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7 }}>
            Podemos atualizar esta política de tempos em tempos. Em caso de mudanças
            significativas, notificaremos os usuários por e-mail ou dentro do aplicativo.
            O uso continuado do Ascend após a atualização implica na aceitação dos novos termos.
          </p>
        </Section>

        {/* Section 10 */}
        <Section title="10. Contato">
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
              <Mail size={20} style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <p style={{ margin: 0, color: "#f5f5f5", fontSize: 14, fontWeight: 600 }}>
                ascendprod1@gmail.com
              </p>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                E-mail de contato para questões de privacidade
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
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
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
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 16px" }}>{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function DataItem({
  category,
  items,
}: {
  category: string;
  items: string[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: "#a78bfa", fontSize: 13, fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {category}
      </p>
      <ul style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #2a2a32",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
  color: "#d1d5db",
  lineHeight: 1.6,
  borderBottom: "1px solid #2a2a32",
};
