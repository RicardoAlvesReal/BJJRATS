// BJJRats Privacy Policy Page
// Design: Dark theme, Barlow Condensed headings, clean legal text

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#E5E5E5', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1A1A1A', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-logo-hero-mmgzpqY4ZnMgeAjjykaT4c.webp"
          alt="BJJRats"
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
        />
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.1em', color: '#FFFFFF' }}>
          BJJRATS
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2.5rem', letterSpacing: '0.05em', color: '#FFFFFF', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Política de Privacidade
        </h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
          Última atualização: 31 de março de 2026
        </p>

        <div style={{ lineHeight: '1.8', fontSize: '0.9375rem' }}>

          <Section title="1. Introdução">
            <p>
              O BJJRats ("nós", "nosso" ou "aplicativo") é um aplicativo de rastreamento de treinos de Jiu-Jitsu Brasileiro desenvolvido por Roberto Abreu. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo móvel e website.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Ao usar o BJJRats, você concorda com as práticas descritas nesta política.
            </p>
          </Section>

          <Section title="2. Informações que Coletamos">
            <p><strong style={{ color: '#CC0000' }}>2.1 Informações fornecidas por você:</strong></p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
              <li>Nome de usuário e endereço de e-mail (para criação de conta)</li>
              <li>Dados de treinos (técnicas praticadas, duração, notas)</li>
              <li>Fotos e vídeos que você optar por adicionar aos seus registros de treino</li>
              <li>Graduação e academia de Jiu-Jitsu</li>
            </ul>

            <p><strong style={{ color: '#CC0000' }}>2.2 Informações coletadas automaticamente:</strong></p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Dados de uso do aplicativo (frequência de treinos, funcionalidades utilizadas)</li>
              <li>Informações do dispositivo (modelo, sistema operacional, versão do app)</li>
              <li>Dados de diagnóstico para correção de erros</li>
            </ul>
          </Section>

          <Section title="3. Uso da Câmera e Galeria de Fotos">
            <p>
              O BJJRats solicita permissão de acesso à <strong style={{ color: '#FFFFFF' }}>câmera</strong> e à <strong style={{ color: '#FFFFFF' }}>galeria de fotos</strong> do seu dispositivo exclusivamente para as seguintes finalidades:
            </p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
              <li>Capturar fotos para adicionar ao seu perfil de usuário</li>
              <li>Registrar imagens de treinos para seu diário pessoal</li>
              <li>Compartilhar conquistas e progressos com a comunidade BJJRats</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              <strong style={{ color: '#CC0000' }}>Importante:</strong> Nunca acessamos sua câmera ou galeria sem sua ação explícita. As fotos são armazenadas de forma segura e não são compartilhadas com terceiros sem seu consentimento.
            </p>
          </Section>

          <Section title="4. Como Usamos suas Informações">
            <p>Utilizamos suas informações para:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
              <li>Fornecer e melhorar os serviços do BJJRats</li>
              <li>Personalizar sua experiência de treino</li>
              <li>Gerar estatísticas e relatórios de progresso para você</li>
              <li>Enviar notificações sobre o aplicativo (com sua permissão)</li>
              <li>Garantir a segurança e integridade da plataforma</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </Section>

          <Section title="5. Compartilhamento de Informações">
            <p>
              <strong style={{ color: '#FFFFFF' }}>Não vendemos suas informações pessoais.</strong> Podemos compartilhar dados apenas nas seguintes situações:
            </p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
              <li><strong>Com outros usuários:</strong> Apenas informações que você optar por tornar públicas (perfil, conquistas)</li>
              <li><strong>Provedores de serviço:</strong> Parceiros técnicos que nos ajudam a operar o aplicativo (hospedagem, análise de dados), sob acordos de confidencialidade</li>
              <li><strong>Requisitos legais:</strong> Quando exigido por lei ou autoridade competente</li>
            </ul>
          </Section>

          <Section title="6. Armazenamento e Segurança">
            <p>
              Seus dados são armazenados em servidores seguros. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Contudo, nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
            </p>
          </Section>

          <Section title="7. Seus Direitos (LGPD)">
            <p>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Solicitar a portabilidade dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Solicitar a exclusão da sua conta e todos os dados associados</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              Para exercer esses direitos, entre em contato: <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000' }}>contato@thebjjrats.com</a>
            </p>
          </Section>

          <Section title="8. Retenção de Dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são removidos em até 30 dias, exceto quando a retenção for necessária para cumprimento de obrigações legais.
            </p>
          </Section>

          <Section title="9. Crianças">
            <p>
              O BJJRats não é destinado a menores de 13 anos. Não coletamos intencionalmente informações de crianças. Se tomarmos conhecimento de que coletamos dados de uma criança, excluiremos essas informações imediatamente.
            </p>
          </Section>

          <Section title="10. Alterações nesta Política">
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por meio do aplicativo ou por e-mail. O uso continuado do BJJRats após as alterações constitui aceitação da nova política.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              Se tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em contato:
            </p>
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderLeft: '3px solid #CC0000', borderRadius: '0 4px 4px 0' }}>
              <p><strong style={{ color: '#FFFFFF' }}>BJJRats</strong></p>
              <p>Responsável: Roberto Abreu</p>
              <p>E-mail: <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000' }}>contato@thebjjrats.com</a></p>
              <p>Website: <a href="https://www.thebjjrats.com" style={{ color: '#CC0000' }}>www.thebjjrats.com</a></p>
            </div>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #1A1A1A', padding: '1.5rem 2rem', textAlign: 'center', color: '#444', fontSize: '0.8125rem' }}>
        © 2026 BJJRats. Todos os direitos reservados.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontWeight: 700,
        fontSize: '1.125rem',
        letterSpacing: '0.05em',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid #1A1A1A'
      }}>
        {title}
      </h2>
      <div style={{ color: '#B0B0B0' }}>{children}</div>
    </div>
  );
}
