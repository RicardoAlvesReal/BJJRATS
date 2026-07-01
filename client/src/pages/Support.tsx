import { Link } from "wouter";

export default function Support() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A0505] to-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#CC0000]/20 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img
                src="/favicon.png"
                alt="BJJRats"
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(204,0,0,0.5)]"
              />
              <span className="font-['Barlow_Condensed'] font-bold text-2xl tracking-wider text-[#CC0000]">
                BJJRATS
              </span>
            </a>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-black/40 backdrop-blur-sm border border-[#CC0000]/20 rounded-lg p-8">
          <h1 className="font-['Barlow_Condensed'] font-bold text-4xl tracking-wider text-[#CC0000] mb-2">
            SUPORTE
          </h1>
          <p className="text-gray-400 mb-8">
            Estamos aqui para ajudar você a aproveitar ao máximo o BJJRats.
          </p>

          {/* FAQ Section */}
          <section className="mb-12">
            <h2 className="font-['Barlow_Condensed'] font-bold text-2xl tracking-wider text-white mb-6">
              Perguntas Frequentes
            </h2>
            
            <div className="space-y-6">
              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  Como registro meu primeiro treino?
                </h3>
                <p className="text-gray-300 text-sm">
                  Após fazer login, clique no botão "Adicionar Treino" na tela inicial. Preencha os detalhes do seu treino (duração, tipo, técnicas praticadas) e salve. Seu XP será atualizado automaticamente!
                </p>
              </div>

              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  Como funciona o sistema de XP e níveis?
                </h3>
                <p className="text-gray-300 text-sm">
                  Cada treino registrado gera pontos de experiência (XP) baseados na duração e tipo de treino. Conforme você acumula XP, você sobe de nível — de Faixa Branca até Elite. Cada nível representa sua evolução no BJJ!
                </p>
              </div>

              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  Posso conectar com minha academia?
                </h3>
                <p className="text-gray-300 text-sm">
                  Sim! Vá em Configurações → Academia e insira o código da sua academia. Você poderá ver os treinos dos seus colegas e participar de desafios em equipe.
                </p>
              </div>

              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  Como defino metas de treino?
                </h3>
                <p className="text-gray-300 text-sm">
                  Na aba "Metas", clique em "Nova Meta" e escolha o tipo (treinos por semana, técnicas a dominar, preparação para competição). Acompanhe seu progresso em tempo real!
                </p>
              </div>

              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  O app funciona offline?
                </h3>
                <p className="text-gray-300 text-sm">
                  Sim! Você pode registrar treinos offline. Os dados serão sincronizados automaticamente quando você se conectar à internet novamente.
                </p>
              </div>

              <div className="border-l-2 border-[#CC0000] pl-4">
                <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-2">
                  Como cancelo minha conta?
                </h3>
                <p className="text-gray-300 text-sm">
                  Acesse a <Link href="/excluir-conta"><a className="text-[#CC0000] hover:underline font-semibold">página de exclusão de conta</a></Link> ou vá em Perfil → Zona de risco → Excluir conta. Seus dados serão permanentemente removidos após confirmação.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="mb-12">
            <h2 className="font-['Barlow_Condensed'] font-bold text-2xl tracking-wider text-white mb-6">
              Entre em Contato
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#CC0000]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-[#CC0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-['Barlow_Condensed'] font-semibold text-white mb-1">Email</h3>
                  <a href="mailto:contato@thebjjrats.com" className="text-[#CC0000] hover:underline">
                    contato@thebjjrats.com
                  </a>
                  <p className="text-gray-400 text-sm mt-1">
                    Responderemos em até 24 horas úteis.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#CC0000]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-[#CC0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-['Barlow_Condensed'] font-semibold text-white mb-1">Telefone</h3>
                  <a href="tel:+5524999862226" className="text-[#CC0000] hover:underline">
                    +55 (24) 99986-2226
                  </a>
                  <p className="text-gray-400 text-sm mt-1">
                    Horário de atendimento: Seg-Sex, 9h às 18h (horário de Brasília).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#CC0000]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-[#CC0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-['Barlow_Condensed'] font-semibold text-white mb-1">Website</h3>
                  <a href="https://www.thebjjrats.com" target="_blank" rel="noopener noreferrer" className="text-[#CC0000] hover:underline">
                    www.thebjjrats.com
                  </a>
                  <p className="text-gray-400 text-sm mt-1">
                    Visite nosso site para mais informações e recursos.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Support */}
          <section>
            <h2 className="font-['Barlow_Condensed'] font-bold text-2xl tracking-wider text-white mb-6">
              Suporte Técnico
            </h2>
            
            <div className="bg-[#CC0000]/10 border border-[#CC0000]/30 rounded-lg p-6">
              <h3 className="font-['Barlow_Condensed'] font-semibold text-lg text-white mb-3">
                Problemas técnicos ou bugs?
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Se você encontrou um bug ou está tendo problemas técnicos com o app, envie um email para{" "}
                <a href="mailto:contato@thebjjrats.com" className="text-[#CC0000] hover:underline font-semibold">
                  contato@thebjjrats.com
                </a>{" "}
                com os seguintes detalhes:
              </p>
              <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
                <li>Modelo do seu dispositivo (iPhone, iPad, Android)</li>
                <li>Versão do sistema operacional</li>
                <li>Descrição detalhada do problema</li>
                <li>Screenshots ou vídeos (se possível)</li>
                <li>Passos para reproduzir o erro</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#CC0000]/20 bg-black/40 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 BJJRats. Todos os direitos reservados.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link href="/privacy-policy">
              <a className="text-gray-400 hover:text-[#CC0000] text-sm transition-colors">
                Política de Privacidade
              </a>
            </Link>
            <Link href="/support">
              <a className="text-gray-400 hover:text-[#CC0000] text-sm transition-colors">
                Suporte
              </a>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
