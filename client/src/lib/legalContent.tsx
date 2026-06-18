// BJJRats — Conteúdo legal completo (idêntico às páginas /terms e /privacy-policy)
import React from 'react';

const S: React.CSSProperties = { marginBottom: '1.5rem' };
const H2: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '1rem',
  textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.05em',
  marginBottom: '0.5rem', borderLeft: '3px solid #CC0000', paddingLeft: '0.75rem',
};
const P: React.CSSProperties = { fontSize: '0.85rem', color: '#AAA', lineHeight: 1.7, margin: 0 };
const UL: React.CSSProperties = { marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#AAA', lineHeight: 1.7 };

export function TermsContent() {
  return (
    <>
      <section style={S}>
        <h2 style={H2}>1. Aceitação dos Termos</h2>
        <p style={P}>
          Ao acessar ou utilizar o BJJRats (&ldquo;Plataforma&rdquo;), você concorda com estes Termos e Condições de Uso.
          Caso não concorde com qualquer disposição, não utilize a Plataforma.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>2. Descrição do Serviço</h2>
        <p style={P}>
          O BJJRats é uma plataforma SaaS para gestão de academias de Jiu-Jitsu, incluindo registro de treinos,
          acompanhamento de evolução de faixa, gestão de mensalidades, comunidade e ferramentas para professores
          e academias. As funcionalidades podem variar conforme o plano contratado.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>3. Cadastro e Conta</h2>
        <p style={P}>
          Para utilizar a Plataforma, você deve criar uma conta fornecendo informações verdadeiras e atualizadas.
          Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades
          realizadas em sua conta. O BJJRats reserva-se o direito de suspender ou encerrar contas que violem estes Termos.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>4. Planos e Pagamentos</h2>
        <p style={P}>
          Os planos de assinatura são contratados por recorrência mensal, com renovação automática.
          Os valores vigentes são os exibidos no momento da contratação. O cancelamento pode ser solicitado
          a qualquer momento e terá efeito ao final do ciclo de cobrança atual, sem reembolso proporcional.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>5. Conduta do Usuário</h2>
        <p style={P}>
          Ao utilizar a Plataforma, você concorda em não: publicar conteúdo ilegal, ofensivo, discriminatório
          ou que viole direitos de terceiros; utilizar a Plataforma para fins não autorizados; tentar acessar
          áreas restritas sem autorização; ou violar qualquer lei aplicável. O BJJRats reserva-se o direito
          de remover conteúdo e suspender contas que violem estas regras.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>6. Propriedade Intelectual</h2>
        <p style={P}>
          A Plataforma, seu código-fonte, design, logotipo e conteúdo original são propriedade do BJJRats.
          O conteúdo publicado pelos usuários (treinos, posts, fotos) permanece de propriedade do usuário,
          que concede ao BJJRats licença não exclusiva para exibição na Plataforma.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>7. Limitação de Responsabilidade</h2>
        <p style={P}>
          O BJJRats é fornecido &ldquo;como está&rdquo;. Não garantimos disponibilidade ininterrupta ou ausência
          de erros. Em nenhuma circunstância o BJJRats será responsável por danos indiretos, incidentais ou
          consequenciais decorrentes do uso da Plataforma.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>8. Privacidade</h2>
        <p style={P}>
          O tratamento de dados pessoais é regido por nossa Política de Privacidade,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>9. Alterações nos Termos</h2>
        <p style={P}>
          O BJJRats pode modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas
          por e-mail ou por aviso na Plataforma com antecedência mínima de 15 dias. O uso continuado após a
          vigência dos novos termos constitui aceitação.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>10. Contato</h2>
        <p style={P}>
          Dúvidas sobre estes Termos? Entre em contato:{' '}
          <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000' }}>contato@thebjjrats.com</a>
        </p>
      </section>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <section style={S}>
        <h2 style={H2}>1. Introdução</h2>
        <p style={P}>
          O BJJRats (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo; ou &ldquo;aplicativo&rdquo;) é um aplicativo de
          rastreamento de treinos de Jiu-Jitsu brasileiro, arquitetado por RATS SISTEMAS e desenvolvido por
          RAOS Tecnologia. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas
          informações pessoais quando você utiliza nosso aplicativo móvel e website.
        </p>
        <p style={{ ...P, marginTop: '0.75rem' }}>
          Ao usar o BJJRats, você concorda com as práticas descritas nesta política.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>2. Informações que Coletamos</h2>
        <p style={P}><strong style={{ color: '#CCC' }}>2.1 Informações fornecidas por você:</strong></p>
        <ul style={UL}>
          <li>Nome de usuário e endereço de e-mail (para criação de conta)</li>
          <li>Dados de treinos (técnicas praticadas, duração, notas)</li>
          <li>Fotos e vídeos que você optar por adicionar aos seus registros de treino</li>
          <li>Graduação e academia de Jiu-Jitsu</li>
        </ul>

        <p style={{ ...P, marginTop: '0.75rem' }}><strong style={{ color: '#CCC' }}>2.2 Informações coletadas automaticamente:</strong></p>
        <ul style={UL}>
          <li>Dados de uso do aplicativo (frequência de treinos, funcionalidades utilizadas)</li>
          <li>Informações do dispositivo (modelo, sistema operacional, versão do app)</li>
          <li>Dados de diagnóstico para correção de erros</li>
        </ul>
      </section>

      <section style={S}>
        <h2 style={H2}>3. Uso da Câmera e Galeria de Fotos</h2>
        <p style={P}>
          O BJJRats solicita permissão de acesso à <strong style={{ color: '#FFF' }}>câmera</strong> e à{' '}
          <strong style={{ color: '#FFF' }}>galeria de fotos</strong> do seu dispositivo exclusivamente para
          as seguintes finalidades:
        </p>
        <ul style={{ ...UL, marginTop: '0.75rem' }}>
          <li>Capturar fotos para adicionar ao seu perfil de usuário</li>
          <li>Registrar imagens de treinos para seu diário pessoal</li>
          <li>Compartilhar conquistas e progressos com a comunidade BJJRats</li>
        </ul>
        <p style={{ ...P, marginTop: '0.75rem' }}>
          <strong style={{ color: '#CC0000' }}>Importante:</strong> Nunca acessamos sua câmera ou galeria sem
          sua ação explícita. As fotos são armazenadas de forma segura e não são compartilhadas com terceiros
          sem seu consentimento.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>4. Como Usamos suas Informações</h2>
        <p style={P}>Utilizamos suas informações para:</p>
        <ul style={UL}>
          <li>Fornecer e melhorar os serviços do BJJRats</li>
          <li>Personalizar sua experiência de treino</li>
          <li>Gerar estatísticas e relatórios de progresso para você</li>
          <li>Enviar notificações sobre o aplicativo (com sua permissão)</li>
          <li>Garantir a segurança e integridade da plataforma</li>
          <li>Cumprir obrigações legais</li>
        </ul>
      </section>

      <section style={S}>
        <h2 style={H2}>5. Compartilhamento de Informações</h2>
        <p style={P}>
          <strong style={{ color: '#FFF' }}>Não vendemos suas informações pessoais.</strong> Podemos compartilhar
          dados apenas nas seguintes situações:
        </p>
        <ul style={{ ...UL, marginTop: '0.75rem' }}>
          <li><strong style={{ color: '#CCC' }}>Com outros usuários:</strong> Apenas informações que você optar por tornar públicas (perfil, conquistas)</li>
          <li><strong style={{ color: '#CCC' }}>Provedores de serviço:</strong> Parceiros técnicos que nos ajudam a operar o aplicativo (hospedagem, análise de dados), sob acordos de confidencialidade</li>
          <li><strong style={{ color: '#CCC' }}>Requisitos legais:</strong> Quando exigido por lei ou autoridade competente</li>
        </ul>
      </section>

      <section style={S}>
        <h2 style={H2}>6. Armazenamento e Segurança</h2>
        <p style={P}>
          Seus dados são armazenados em servidores seguros. Adotamos medidas técnicas e organizacionais para
          proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Contudo,
          nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>7. Seus Direitos (LGPD)</h2>
        <p style={P}>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
        <ul style={{ ...UL, marginTop: '0.75rem' }}>
          <li>Confirmar a existência de tratamento dos seus dados</li>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
          <li>Solicitar a portabilidade dos seus dados</li>
          <li>Revogar o consentimento a qualquer momento</li>
          <li>Solicitar a exclusão da sua conta e todos os dados associados</li>
        </ul>
        <p style={{ ...P, marginTop: '0.75rem' }}>
          Para exercer esses direitos, entre em contato:{' '}
          <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000' }}>contato@thebjjrats.com</a>
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>8. Retenção de Dados</h2>
        <p style={P}>
          Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são removidos
          em até 30 dias, exceto quando a retenção for necessária para cumprimento de obrigações legais.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>9. Crianças</h2>
        <p style={P}>
          O BJJRats não é destinado a menores de 13 anos. Não coletamos intencionalmente informações de crianças.
          Se tomarmos conhecimento de que coletamos dados de uma criança, excluiremos essas informações imediatamente.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>10. Alterações nesta Política</h2>
        <p style={P}>
          Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças
          significativas por meio do aplicativo ou por e-mail. O uso continuado do BJJRats após as alterações
          constitui aceitação da nova política.
        </p>
      </section>

      <section style={S}>
        <h2 style={H2}>11. Contato</h2>
        <p style={P}>
          Se tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em contato:
        </p>
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#1A1A1A', borderLeft: '3px solid #CC0000' }}>
          <p style={{ ...P, color: '#CCC' }}><strong style={{ color: '#FFF' }}>BJJRats</strong></p>
          <p style={P}>Responsável: RATS SISTEMAS</p>
          <p style={P}>E-mail: <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000' }}>contato@thebjjrats.com</a></p>
          <p style={P}>Website: <a href="https://www.thebjjrats.com" style={{ color: '#CC0000' }}>www.thebjjrats.com</a></p>
        </div>
      </section>
    </>
  );
}

export function SupportContent() {
  return (
    <>
      <section style={S}>
        <h2 style={H2}>Perguntas Frequentes</h2>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>Como registro meu primeiro treino?</h3>
          <p style={P}>Após fazer login, clique no botão "Adicionar Treino" na tela inicial. Preencha os detalhes do seu treino (duração, tipo, técnicas praticadas) e salve. Seu XP será atualizado automaticamente!</p>
        </div>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>Como funciona o sistema de XP e níveis?</h3>
          <p style={P}>Cada treino registrado gera pontos de experiência (XP) baseados na duração e tipo de treino. Conforme você acumula XP, você sobe de nível — de Faixa Branca até Elite. Cada nível representa sua evolução no BJJ!</p>
        </div>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>Posso conectar com minha academia?</h3>
          <p style={P}>Sim! Vá em Configurações → Academia e insira o código da sua academia. Você poderá ver os treinos dos seus colegas e participar de desafios em equipe.</p>
        </div>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>Como defino metas de treino?</h3>
          <p style={P}>Na aba "Metas", clique em "Nova Meta" e escolha o tipo (treinos por semana, técnicas a dominar, preparação para competição). Acompanhe seu progresso em tempo real!</p>
        </div>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>O app funciona offline?</h3>
          <p style={P}>Sim! Você pode registrar treinos offline. Os dados serão sincronizados automaticamente quando você se conectar à internet novamente.</p>
        </div>

        <div style={{ ...S, borderLeft: '2px solid #CC0000', paddingLeft: '0.75rem' }}>
          <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.95rem', color: '#FFF', marginBottom: '0.25rem' }}>Como cancelo minha conta?</h3>
          <p style={P}>Vá em Configurações → Conta → Excluir Conta. Seus dados serão permanentemente removidos após confirmação.</p>
        </div>
      </section>

      <section style={S}>
        <h2 style={H2}>Entre em Contato</h2>

        <div style={{ ...S, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(204,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.15rem' }}>
            <svg width="14" height="14" fill="none" stroke="#CC0000" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.9rem', marginBottom: '0.15rem' }}>Email</h3>
            <a href="mailto:contato@thebjjrats.com" style={{ color: '#CC0000', fontSize: '0.85rem' }}>contato@thebjjrats.com</a>
            <p style={{ ...P, fontSize: '0.8rem', marginTop: '0.15rem' }}>Responderemos em até 24 horas úteis.</p>
          </div>
        </div>

        <div style={{ ...S, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(204,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.15rem' }}>
            <svg width="14" height="14" fill="none" stroke="#CC0000" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </div>
          <div>
            <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.9rem', marginBottom: '0.15rem' }}>Telefone</h3>
            <a href="tel:+5524999862226" style={{ color: '#CC0000', fontSize: '0.85rem' }}>+55 (24) 99986-2226</a>
            <p style={{ ...P, fontSize: '0.8rem', marginTop: '0.15rem' }}>Horário de atendimento: Seg-Sex, 9h às 18h (horário de Brasília).</p>
          </div>
        </div>

        <div style={{ ...S, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(204,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.15rem' }}>
            <svg width="14" height="14" fill="none" stroke="#CC0000" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          </div>
          <div>
            <h3 style={{ ...H2, borderLeft: 'none', paddingLeft: 0, fontSize: '0.9rem', marginBottom: '0.15rem' }}>Website</h3>
            <a href="https://www.thebjjrats.com" target="_blank" rel="noopener noreferrer" style={{ color: '#CC0000', fontSize: '0.85rem' }}>www.thebjjrats.com</a>
            <p style={{ ...P, fontSize: '0.8rem', marginTop: '0.15rem' }}>Visite nosso site para mais informações e recursos.</p>
          </div>
        </div>
      </section>
    </>
  );
}
