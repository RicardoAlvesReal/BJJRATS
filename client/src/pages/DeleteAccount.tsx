import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const PROFILE_TAB_KEY = "bjjrats:app:active-tab";

export default function DeleteAccount() {
  const { user, loading } = useAuth();

  const openAccountDeletion = () => {
    try {
      sessionStorage.setItem(PROFILE_TAB_KEY, "profile");
    } catch {
      // Navigation still works when sessionStorage is unavailable.
    }

    window.location.href = user ? "/app" : "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1A0505] to-[#0A0A0A] text-white">
      <header className="border-b border-[#CC0000]/20 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
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
          <Link href="/support">
            <a className="font-['Barlow_Condensed'] text-sm tracking-wider text-gray-400 hover:text-[#CC0000] transition-colors">
              SUPORTE
            </a>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-14 max-w-4xl">
        <section className="bg-black/45 backdrop-blur-sm border border-[#CC0000]/20 rounded-lg p-6 md:p-8">
          <p className="font-['Barlow_Condensed'] text-[#CC0000] font-bold tracking-[0.18em] text-sm mb-3">
            PRIVACIDADE E LGPD
          </p>
          <h1 className="font-['Barlow_Condensed'] font-black text-4xl md:text-5xl tracking-wider text-white mb-4 uppercase">
            Exclusão de conta
          </h1>
          <p className="text-gray-300 leading-relaxed max-w-3xl mb-8">
            Use esta página para solicitar ou iniciar a exclusão permanente da sua conta BJJRats e dos dados pessoais associados ao seu perfil.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="border border-[#2A2A2A] bg-[#0F0F0F] rounded-lg p-5">
              <h2 className="font-['Barlow_Condensed'] font-bold text-xl tracking-wider text-white mb-3 uppercase">
                Excluir pelo app
              </h2>
              <ol className="text-gray-300 text-sm leading-relaxed space-y-2 list-decimal list-inside">
                <li>Entre na sua conta BJJRats.</li>
                <li>Acesse a aba Perfil.</li>
                <li>Role até Zona de risco.</li>
                <li>Toque em Excluir conta e confirme digitando EXCLUIR.</li>
              </ol>
            </div>

            <div className="border border-[#2A2A2A] bg-[#0F0F0F] rounded-lg p-5">
              <h2 className="font-['Barlow_Condensed'] font-bold text-xl tracking-wider text-white mb-3 uppercase">
                Solicitar por email
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                Se você não consegue acessar sua conta, envie uma solicitação pelo email cadastrado informando que deseja excluir sua conta BJJRats.
              </p>
              <a
                href="mailto:contato@thebjjrats.com?subject=Exclus%C3%A3o%20de%20conta%20BJJRats"
                className="text-[#CC0000] hover:underline font-semibold text-sm"
              >
                contato@thebjjrats.com
              </a>
            </div>
          </div>

          <div className="border border-[#CC0000]/30 bg-[#CC0000]/10 rounded-lg p-5 mb-8">
            <h2 className="font-['Barlow_Condensed'] font-bold text-xl tracking-wider text-white mb-3 uppercase">
              O que será removido
            </h2>
            <ul className="text-gray-300 text-sm leading-relaxed space-y-2 list-disc list-inside">
              <li>Dados de perfil, acesso e preferências da conta.</li>
              <li>Histórico de treinos, metas, competições e registros associados.</li>
              <li>Vínculos com academia, professor, comunidade e notificações.</li>
            </ul>
            <p className="text-gray-400 text-xs leading-relaxed mt-4">
              Alguns dados podem ser mantidos temporariamente quando a retenção for necessária para segurança, prevenção de fraude, cumprimento legal, obrigações fiscais ou defesa de direitos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={openAccountDeletion}
              disabled={loading}
              className="bg-[#CC0000] hover:bg-[#A00000] disabled:opacity-60 disabled:cursor-not-allowed text-white font-['Barlow_Condensed'] font-black tracking-wider uppercase px-6 py-3 rounded-md transition-colors"
            >
              {user ? "Abrir perfil para excluir" : "Entrar para excluir conta"}
            </button>
            <Link href="/privacy-policy">
              <a className="border border-[#333] hover:border-[#CC0000] text-gray-300 hover:text-white font-['Barlow_Condensed'] font-bold tracking-wider uppercase px-6 py-3 rounded-md text-center transition-colors">
                Ver política de privacidade
              </a>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}