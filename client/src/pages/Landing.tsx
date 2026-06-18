import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fadeUpReveal as fadeUp } from '@/lib/animations';
import LegalModal from '@/components/LegalModal';
import { TermsContent, PrivacyContent, SupportContent } from '@/lib/legalContent';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-hero-bg-EvuzUMvwhPb4GgYFs4uUr2.webp';
const LOGO = '/favicon.png';

const FEATURES_ALUNO = [
  { num: '01', icon: '📋', title: 'Diário de Treinos', desc: 'Registre cada sessão com data, duração e técnicas treinadas. Construa um histórico completo da sua jornada no tatame.' },
  { num: '02', icon: '🥋', title: 'Evolução de Faixa', desc: 'Acompanhe seu progresso rumo à próxima faixa com horas acumuladas no tatame e marcos de conquista.' },
  { num: '03', icon: '🏃', title: 'Outros Treinos', desc: 'Corrida, ciclismo, musculação, natação — registre atividades complementares e ganhe XP extras pela dedicação.' },
  { num: '04', icon: '🏅', title: 'Competições', desc: 'Registre torneios, colocações e categorias. Ganhe XP bônus por pódio e exiba suas medalhas no perfil público.' },
  { num: '05', icon: '⚔️', title: 'Desafios', desc: 'Participe de desafios criados pelo professor. Compita com colegas de academia e suba no ranking da turma.' },
  { num: '06', icon: '📤', title: 'Compartilhamento', desc: 'Gere cards visuais dos seus treinos e conquistas para compartilhar nas redes sociais. Mostre sua evolução.' },
];

const FEATURES_ACADEMIA = [
  { num: '01', icon: '👥', title: 'Painel de Alunos', desc: 'Visão completa da turma com frequência, evolução e status de cada aluno. Identifique quem está sumindo e quem se destaca.' },
  { num: '02', icon: '📣', title: 'Feed da Academia', desc: 'Publique avisos, dicas e novidades diretamente no app dos seus alunos. Comunicação centralizada e instantânea.' },
  { num: '03', icon: '💰', title: 'Gestão de Mensalidades', desc: 'Controle cobranças, pagamentos e status financeiro de cada aluno. Notificações automáticas de vencimento.' },
  { num: '04', icon: '⚔️', title: 'Criação de Desafios', desc: 'Crie e gerencie desafios de treino para motivar a turma. Defina metas, acompanhe o ranking e premie os mais dedicados.' },
  { num: '05', icon: '📅', title: 'Agendamento de Aulas', desc: 'Grade de horários publicada no app. Alunos confirmam presença e você controla a frequência com precisão.' },
  { num: '06', icon: '📊', title: 'Relatórios', desc: 'Frequência, progresso e dados da academia em tempo real. Tome decisões baseadas em dados, não em suposições.' },
  { num: '07', icon: '⭐', title: 'Avaliações', desc: 'Alunos avaliam a academia no app. Acompanhe o NPS, leia os feedbacks e melhore continuamente a experiência.' },
  { num: '08', icon: '🎖️', title: 'Promoções de Faixa', desc: 'Registre graduações e acompanhe critérios de promoção por aluno — horas no tatame, frequência e tempo na faixa.' },
];

const FEATURES_COMUNIDADE = [
  { num: '01', icon: '🌐', title: 'Feed Global', desc: 'Acompanhe treinos, conquistas e posts de praticantes de todo o Brasil. Curta, comente e interaja com a comunidade BJJ.' },
  { num: '02', icon: '🏆', title: 'Ranking Geral', desc: 'Veja quem são os atletas mais dedicados do app. Rankings por XP, frequência, medalhas e desafios completados.' },
  { num: '03', icon: '🎯', title: 'Conquistas', desc: 'Sistema de conquistas e badges desbloqueáveis. Cada marco no tatame é reconhecido e celebrado pela comunidade.' },
  { num: '04', icon: '🔍', title: 'Busca de Academias', desc: 'Encontre academias cadastradas no BJJRats, veja avaliações de alunos e conecte-se com a equipe mais próxima.' },
];

const LANDING_PLANS = [
  { slug: 'aluno', icon: '🥋', name: 'Aluno', desc: 'Registre treinos, acompanhe sua evolução e participe da comunidade.', price: 19.90, color: '#3B82F6', popular: false, features: ['Registro de treinos', 'Histórico completo', 'Sequência (streak)', 'Comunidade', 'Conquistas', 'Competições', 'Metas e desafios'] },
  { slug: 'professor', icon: '👨‍🏫', name: 'Professor Particular', desc: 'Gerencie seus alunos com exclusividade e acompanhe cada um.', price: 47.90, color: '#8B5CF6', popular: false, features: ['Painel do professor', 'Alunos ilimitados', 'Matrículas e pagamentos', 'Promoções de faixa', 'Chamada (check-in)', 'Agenda de aulas', 'Atendimento exclusivo'] },
  { slug: 'academia', icon: '🏛️', name: 'Academia', desc: 'Gestão completa com múltiplos professores, CRM e relatórios.', price: 97.90, color: '#CC0000', popular: false, features: ['Dashboard administrativo', 'Gestão de usuários', 'CRM completo', 'Múltiplos professores', 'Relatórios', 'Analytics financeiro', 'Todos os recursos professores'] },
];

const AppleSVG = () => (
  <svg width="20" height="24" viewBox="0 0 814 1000" fill="#AAA" xmlns="http://www.w3.org/2000/svg">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.9-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.9 0 111.3 2.6 168.3 80.1zm-198.5-119.5c31.2-36.9 53.4-88.1 53.4-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.2-71.3z"/>
  </svg>
);

const GooglePlaySVG = () => (
  <svg width="20" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gp1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00C6FF" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="#0072FF" stopOpacity="0.85"/>
      </linearGradient>
      <linearGradient id="gp2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.85"/>
      </linearGradient>
      <linearGradient id="gp3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4E50" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="#C0392B" stopOpacity="0.85"/>
      </linearGradient>
      <linearGradient id="gp4" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#56AB2F" stopOpacity="0.85"/>
        <stop offset="100%" stopColor="#A8E063" stopOpacity="0.85"/>
      </linearGradient>
    </defs>
    <path d="M30 10 L260 256 L30 502 Q10 490 10 256 Q10 22 30 10Z" fill="url(#gp1)"/>
    <path d="M30 10 L260 256 L430 170 L100 0 Q60 -5 30 10Z" fill="url(#gp2)"/>
    <path d="M30 502 L260 256 L430 342 L100 512 Q60 517 30 502Z" fill="url(#gp4)"/>
    <path d="M430 170 L260 256 L430 342 L482 256 Z" fill="url(#gp3)"/>
  </svg>
);

function StoreBadge({ type, url }: { type: 'apple' | 'google'; url?: string }) {
  const isApple = type === 'apple';
  const hasLink = !!url;
  const content = (
    <>
      {!hasLink && <span className="lp-store-soon">Em breve</span>}
      <span className="lp-store-icon">{isApple ? <AppleSVG /> : <GooglePlaySVG />}</span>
      <div className="lp-store-text">
        <span className="lp-store-sub">{isApple ? 'Baixe na' : 'Disponível no'}</span>
        <span className="lp-store-name">{isApple ? 'App Store' : 'Google Play'}</span>
      </div>
    </>
  );
  const linkStyle: React.CSSProperties = hasLink ? { cursor: 'pointer', opacity: 1, textDecoration: 'none' } : {};
  const Tag = hasLink ? 'a' : 'div';
  const extraProps = hasLink ? { href: url, target: '_blank', rel: 'noopener noreferrer' as const } : {};
  return (
    <Tag {...extraProps} className="lp-store-btn" style={linkStyle} title={`${hasLink ? 'Baixar na' : 'Em breve na'} ${isApple ? 'App Store' : 'Google Play'}`}>
      {content}
    </Tag>
  );
}

function CounterNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 1500;
        const step = (target / duration) * 16;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <div ref={ref} className="lp-counter">{count}{suffix}</div>;
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [playStoreUrl, setPlayStoreUrl] = useState('');
  const [popularPlanSlug, setPopularPlanSlug] = useState('professor');
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'support' | null>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.6]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.lp-mobile-menu') && !t.closest('.lp-hamburger')) setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(data => {
        if (data.app_store_url) setAppStoreUrl(data.app_store_url);
        if (data.play_store_url) setPlayStoreUrl(data.play_store_url);
        if (data.popular_plan_slug) setPopularPlanSlug(data.popular_plan_slug);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen overflow-x-hidden w-full">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-[200] bjj-glass-strong h-14 flex items-center justify-between px-4 lg:px-8 border-b border-[rgba(204,0,0,0.12)]">
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={LOGO} alt="BJJRats" className="w-[30px] h-[30px] object-contain drop-shadow-[0_0_10px_rgba(204,0,0,0.3)]" />
          <span className="text-[1.2rem] font-black tracking-[0.05em] font-['Barlow_Condensed']">
            <span className="text-white">BJJ</span><span className="text-[#CC0000]">RATS</span>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {['ALUNOS', 'ACADEMIA', 'COMUNIDADE'].map(item => (
            <button key={item} onClick={() => scrollTo(item.toLowerCase())}
              className="bjj-btn-ghost !text-[0.7rem] !tracking-[0.12em] !px-3 hover:!text-white"
            >{item}</button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2.5">
          <button onClick={() => navigate('/login')}
            className="!text-[0.8rem] !py-2 !px-6 bg-[#1A1A1A] text-white hover:bg-[#252525] border border-[#333] rounded-lg font-black uppercase tracking-[0.1em] transition-all duration-200 font-['Barlow_Condensed'] whitespace-nowrap hover:-translate-y-0.5"
          >ENTRAR</button>
          <button onClick={() => navigate('/register')}
            className="bjj-btn-primary !text-[0.8rem] !py-2 !px-6 whitespace-nowrap"
          >CRIAR CONTA</button>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <button onClick={() => navigate('/login')}
            className="bjj-btn-primary !text-[0.65rem] !py-1.5 !px-3"
          >ENTRAR</button>
          <button className="lp-hamburger" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} aria-label="Menu">
            <span className={`lp-bar ${menuOpen ? 'lp-bar1-open' : ''}`} />
            <span className={`lp-bar ${menuOpen ? 'lp-bar2-open' : ''}`} />
            <span className={`lp-bar ${menuOpen ? 'lp-bar3-open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lp-mobile-menu">
          <button onClick={() => scrollTo('alunos')} className="lp-mob-item">ALUNOS</button>
          <button onClick={() => scrollTo('academia')} className="lp-mob-item">ACADEMIA</button>
          <button onClick={() => scrollTo('comunidade')} className="lp-mob-item">COMUNIDADE</button>
          <hr className="lp-mob-hr" />
          <button onClick={() => { navigate('/register'); setMenuOpen(false); }} className="lp-mob-item text-[#CC0000]">CRIAR CONTA →</button>
          <button onClick={() => { navigate('/login'); setMenuOpen(false); }} className="lp-mob-item text-[#888]">ENTRAR →</button>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className="relative min-h-svh flex items-end pt-14 overflow-hidden">
        <motion.img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ y: heroParallax }} />
        <motion.div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-transparent" style={{ opacity: heroOpacity }} />
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 pb-14 sm:pb-16 lg:pb-20">
          <motion.div className="flex items-center gap-3.5 mb-8"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <img src={LOGO} alt="BJJRats" className="w-[54px] h-[54px] object-contain drop-shadow-[0_0_18px_rgba(204,0,0,0.4)]" />
            <span className="text-[2.4rem] font-black leading-none tracking-[0.03em] font-['Barlow_Condensed']">
              <span className="text-white">BJJ</span><span className="text-[#CC0000]">RATS</span>
            </span>
          </motion.div>

          <motion.div className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#CC0000] mb-4 font-['Barlow_Condensed']"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.05 }}
          >
            <span className="w-1.5 h-1.5 bg-[#CC0000] rounded-full animate-pulse shrink-0" />
            ACESSO ABERTO — FASE BETA
          </motion.div>

          <motion.h1 className="text-[clamp(3.5rem,14vw,8rem)] font-black uppercase leading-[0.88] mb-5 font-['Barlow_Condensed']"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          >
            TREINE.<br />EVOLUA.<br /><span className="text-[#CC0000]">DOMINE.</span>
          </motion.h1>

          <motion.p className="text-[clamp(0.875rem,2.5vw,1rem)] text-[#CCC] leading-relaxed max-w-[520px] mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
          >
            O app feito para praticantes e professores de Jiu-Jitsu. Registre cada treino, acompanhe sua jornada até a próxima faixa e construa a comunidade da sua academia.
          </motion.p>

          <div className="flex flex-col gap-5">
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => navigate('/register')}
                className="bg-[#CC0000] text-white text-[0.95rem] font-black uppercase tracking-[0.1em] px-6 py-3.5 border-none inline-flex items-center gap-1.5 transition-all hover:bg-[#FF0000] hover:shadow-[0_0_25px_rgba(204,0,0,0.4)] font-['Barlow_Condensed'] rounded-xl"
              >
                CRIAR CONTA
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button onClick={() => navigate('/login')}
                className="bg-transparent text-white text-[0.9rem] font-bold uppercase tracking-[0.08em] px-6 py-3.5 border border-white/30 inline-flex items-center gap-1.5 transition-all hover:border-white/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] font-['Barlow_Condensed'] rounded-xl"
              >
                JÁ TENHO CONTA
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#444] font-['Barlow_Condensed']">Baixe o app:</span>
              <div className="flex gap-2.5 flex-wrap">
                <StoreBadge type="apple" url={appStoreUrl} />
                <StoreBadge type="google" url={playStoreUrl} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="bg-[#0D0D0D] border-t-2 border-[#CC0000] border-b border-[#1A1A1A] py-10 px-5">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
          {[
            { target: 6, suffix: '+', label: 'FUNCIONALIDADES', sub: 'PARA ALUNOS' },
            { target: 8, suffix: '+', label: 'FERRAMENTAS', sub: 'PARA ACADEMIAS' },
            { target: 4, suffix: '+', label: 'RECURSOS', sub: 'DE COMUNIDADE' },
            { target: 100, suffix: '%', label: 'FOCADO', sub: 'EM BJJ' },
          ].map((s, i) => (
            <motion.div key={i} className="text-center" {...fadeUp(i * 0.1)}>
              <CounterNumber target={s.target} suffix={s.suffix} />
              <div className="text-[0.875rem] font-black uppercase tracking-[0.05em] mt-1 font-['Barlow_Condensed']">{s.label}</div>
              <div className="text-[0.6rem] text-[#555] uppercase tracking-[0.1em] mt-0.5 font-['Barlow_Condensed']">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== SEÇÃO: O APP ===== */}
      <section className="py-16 px-5 sm:py-20 sm:px-6 lg:py-24 lg:px-8 bg-[#0A0A0A]">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp()} className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#CC0000] mb-3 font-['Barlow_Condensed']">O APP</motion.div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-10 bg-[#CC0000] shrink-0" />
            <span className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#666] font-['Barlow_Condensed']">TUDO QUE ESTÁ DENTRO</span>
          </div>
          <motion.h2 className="text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-[0.9] mb-4 font-['Barlow_Condensed']"
            {...fadeUp(0.1)}
          >FEITO PARA<br />O TATAME.</motion.h2>
          <motion.p className="text-[clamp(0.875rem,2vw,0.95rem)] text-[#888] leading-relaxed max-w-[480px] mb-8 font-['Barlow']"
            {...fadeUp(0.15)}
          >Três universos distintos — Aluno, Academia e Comunidade — cada um com suas ferramentas, integrados em um único app.</motion.p>

          {/* ALUNOS */}
          <div id="alunos" className="flex items-center gap-3.5 mt-14 mb-6 pb-5 border-b-2 border-[#CC0000] flex-wrap">
            <span className="bg-[#0F0000] text-[#CC0000] text-[0.58rem] font-black uppercase tracking-[0.18em] px-3 py-1 border border-[#CC0000]/30 font-['Barlow_Condensed'] rounded-md">Para Alunos</span>
            <span className="text-[1.25rem] font-black uppercase tracking-[-0.01em] font-['Barlow_Condensed']">SUA JORNADA NO TATAME</span>
            <span className="ml-auto text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#444] font-['Barlow_Condensed']">6 FUNCIONALIDADES</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1A1A1A] rounded-xl overflow-hidden">
            {FEATURES_ALUNO.map((f, i) => (
              <motion.div key={f.num} className="bg-[#0A0A0A] p-6 border-l-2 border-transparent hover:border-[#CC0000] transition-all duration-200 hover:bg-[#0D0000] group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[2.5rem] font-black leading-none text-[rgba(204,0,0,0.15)] font-['Barlow_Condensed'] group-hover:text-[rgba(204,0,0,0.3)] transition-colors">{f.num}</span>
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#CC0000] mb-2 font-['Barlow_Condensed']">Para Alunos</div>
                <h3 className="text-[1.25rem] font-black uppercase mb-2 font-['Barlow_Condensed']">{f.title}</h3>
                <p className="text-[0.875rem] text-[#888] leading-relaxed font-['Barlow']">{f.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <button onClick={() => navigate('/register')}
              className="bg-none border-none text-[#CC0000] text-[0.72rem] font-bold uppercase tracking-[0.1em] inline-flex items-center gap-1.5 transition-all hover:gap-3 hover:opacity-80 p-0 font-['Barlow_Condensed']"
            >
              CRIAR CONTA
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-[#444] font-['Barlow_Condensed']">Cadastro gratuito · Acesso imediato</span>
          </div>

          {/* ACADEMIA */}
          <div id="academia" className="flex items-center gap-3.5 mt-20 mb-6 pb-5 border-b-2 border-[#0EA5E9] flex-wrap">
            <span className="bg-[#020D14] text-[#0EA5E9] text-[0.58rem] font-black uppercase tracking-[0.18em] px-3 py-1 border border-[#0EA5E9]/20 font-['Barlow_Condensed'] rounded-md">Para Academias</span>
            <span className="text-[1.25rem] font-black uppercase tracking-[-0.01em] font-['Barlow_Condensed']">GERENCIE SUA EQUIPE</span>
            <span className="ml-auto text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#444] font-['Barlow_Condensed']">8 FUNCIONALIDADES</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1A1A1A] rounded-xl overflow-hidden">
            {FEATURES_ACADEMIA.map((f, i) => (
              <motion.div key={f.num} className="bg-[#0A0A0A] p-6 border-l-2 border-transparent hover:border-[#0EA5E9] transition-all duration-200 hover:bg-[#020D14] group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.05 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[2.5rem] font-black leading-none text-[rgba(14,165,233,0.15)] font-['Barlow_Condensed'] group-hover:text-[rgba(14,165,233,0.3)] transition-colors">{f.num}</span>
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#0EA5E9] mb-2 font-['Barlow_Condensed']">Para Academias</div>
                <h3 className="text-[1.25rem] font-black uppercase mb-2 font-['Barlow_Condensed']">{f.title}</h3>
                <p className="text-[0.875rem] text-[#888] leading-relaxed font-['Barlow']">{f.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <button onClick={() => navigate('/register')}
              className="bg-none border-none text-[#0EA5E9] text-[0.72rem] font-bold uppercase tracking-[0.1em] inline-flex items-center gap-1.5 transition-all hover:gap-3 hover:opacity-80 p-0 font-['Barlow_Condensed']"
            >
              CRIAR CONTA
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-[#444] font-['Barlow_Condensed']">Cadastro gratuito · Acesso imediato</span>
          </div>

          {/* COMUNIDADE */}
          <div id="comunidade" className="flex items-center gap-3.5 mt-20 mb-6 pb-5 border-b-2 border-[#22C55E] flex-wrap">
            <span className="bg-[#021208] text-[#22C55E] text-[0.58rem] font-black uppercase tracking-[0.18em] px-3 py-1 border border-[#22C55E]/20 font-['Barlow_Condensed'] rounded-md">Comunidade</span>
            <span className="text-[1.25rem] font-black uppercase tracking-[-0.01em] font-['Barlow_Condensed']">CONECTE-SE COM O BJJ</span>
            <span className="ml-auto text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#444] font-['Barlow_Condensed']">4 FUNCIONALIDADES</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1A1A1A] rounded-xl overflow-hidden">
            {FEATURES_COMUNIDADE.map((f, i) => (
              <motion.div key={f.num} className="bg-[#0A0A0A] p-6 border-l-2 border-transparent hover:border-[#22C55E] transition-all duration-200 hover:bg-[#021208] group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.07 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[2.5rem] font-black leading-none text-[rgba(34,197,94,0.15)] font-['Barlow_Condensed'] group-hover:text-[rgba(34,197,94,0.3)] transition-colors">{f.num}</span>
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#22C55E] mb-2 font-['Barlow_Condensed']">Comunidade</div>
                <h3 className="text-[1.25rem] font-black uppercase mb-2 font-['Barlow_Condensed']">{f.title}</h3>
                <p className="text-[0.875rem] text-[#888] leading-relaxed font-['Barlow']">{f.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <button onClick={() => navigate('/login')}
              className="bg-none border-none text-[#22C55E] text-[0.72rem] font-bold uppercase tracking-[0.1em] inline-flex items-center gap-1.5 transition-all hover:gap-3 hover:opacity-80 p-0 font-['Barlow_Condensed']"
            >
              EXPLORAR COMUNIDADE
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-[#444] font-['Barlow_Condensed']">Aberta para todos · Gratuito</span>
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section className="py-16 px-5 bg-[#0A0A0A] border-t border-[#1A1A1A]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-10">
            <span className="lp-badge">ASSINATURAS</span>
            <h2 className="lp-title">Escolha seu plano</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LANDING_PLANS.map((plan, i) => {
              const isPopular = plan.slug === popularPlanSlug;
              return (
              <motion.div
                key={plan.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-xl flex flex-col"
                style={{
                  background: isPopular ? '#111' : '#0D0D0D',
                  border: isPopular ? '2px solid ' + plan.color : '1px solid #222',
                  padding: '1.75rem 1.5rem',
                  position: 'relative',
                }}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[0.55rem] font-black uppercase tracking-[0.12em] px-3 py-1 rounded-full"
                    style={{ background: plan.color, color: '#FFF' }}
                  >MAIS POPULAR</span>
                )}
                <div className="text-[2rem] mb-1">{plan.icon}</div>
                <h3 className="text-[1.1rem] font-black uppercase tracking-[0.1em] text-white font-['Barlow_Condensed'] m-0">{plan.name}</h3>
                <p className="text-[0.75rem] text-[#666] font-['Barlow_Condensed'] mb-4" style={{ minHeight: '2.5rem' }}>{plan.desc}</p>
                <div className="mb-5">
                  <span className="text-[2rem] font-black font-['Barlow_Condensed']" style={{ color: plan.color }}>R$ {plan.price.toFixed(2)}</span>
                  <span className="text-[0.7rem] text-[#666] font-['Barlow_Condensed']">/mês</span>
                </div>
                <ul className="list-none p-0 m-0 flex-1 flex flex-col gap-1.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[0.8rem] text-[#BBB] font-['Barlow_Condensed']">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full text-white text-[0.8rem] font-black uppercase tracking-[0.1em] py-3 border-none rounded-lg cursor-pointer transition-all font-['Barlow_Condensed']"
                  style={{ background: plan.color }}
                >
                  ASSINAR
                </button>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* ===== FASE BETA ===== */}
      <section className="py-16 px-5 bg-[#0D0D0D] border-t-2 border-[#CC0000]">
        <div className="max-w-[640px] mx-auto text-center">
          <motion.div className="inline-flex items-center gap-2 bg-[#1A0000] border border-[#CC0000]/30 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#CC0000] px-3.5 py-1.5 mb-5 font-['Barlow_Condensed'] rounded-lg"
            {...fadeUp()}
          >
            <span className="w-1.5 h-1.5 bg-[#CC0000] rounded-full animate-pulse shrink-0" />
            ACESSO ABERTO — FASE BETA
          </motion.div>
          <motion.h2 className="text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-[0.9] mb-4 font-['Barlow_Condensed']" {...fadeUp(0.05)}>
            ENTRE NO<br /><span className="text-[#CC0000]">TATAME DIGITAL.</span>
          </motion.h2>
          <motion.p className="text-[clamp(0.875rem,2vw,0.95rem)] text-[#888] leading-relaxed max-w-[600px] mx-auto mb-8 font-['Barlow']" {...fadeUp(0.1)}>
            O BJJRats já está no ar. <strong className="text-[#AAA] font-medium">Crie sua conta gratuitamente</strong>, registre seus treinos e explore todas as funcionalidades durante a fase de testes.
          </motion.p>
          <motion.div className="flex flex-col items-center gap-3.5" {...fadeUp(0.15)}>
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => navigate('/register')}
                className="bg-[#CC0000] text-white text-[0.95rem] font-black uppercase tracking-[0.1em] px-7 py-4 inline-flex items-center gap-2 transition-all hover:bg-[#FF0000] hover:shadow-[0_0_25px_rgba(204,0,0,0.4)] font-['Barlow_Condensed'] rounded-xl"
              >
                CRIAR CONTA
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button onClick={() => navigate('/login')}
              className="bg-none border-none text-[0.75rem] font-bold uppercase tracking-[0.08em] text-[#555] cursor-pointer font-['Barlow_Condensed']"
            >JÁ TENHO CONTA → ENTRAR</button>
          </motion.div>

          <div className="flex items-center justify-center gap-3.5 mt-8 flex-wrap">
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#444] font-['Barlow_Condensed']">Baixe o app:</span>
            <div className="flex gap-2.5 flex-wrap">
              <StoreBadge type="apple" url={appStoreUrl} />
              <StoreBadge type="google" url={playStoreUrl} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 flex-wrap mt-6">
            {['ACESSO VIA WEB', 'CADASTRO GRATUITO', 'FASE DE TESTES ABERTA'].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-[0.7rem] text-[#444] uppercase tracking-[0.05em] font-['Barlow_Condensed']">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CC000066" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 px-5 bg-[#080808] border-t border-[#1A1A1A]">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img src={LOGO} alt="BJJRats" className="w-6 h-6 object-contain" />
              <span className="text-base font-black tracking-[0.05em] font-['Barlow_Condensed']">
                <span className="text-white">BJJ</span><span className="text-[#CC0000]">RATS</span>
              </span>
            </div>
            <p className="text-[0.7rem] text-[#444] uppercase tracking-[0.05em] max-w-[220px] leading-relaxed font-['Barlow_Condensed']">
              O app feito para praticantes e professores de Jiu-Jitsu.
            </p>
          </div>

          <div>
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-[#444] mb-3 font-['Barlow_Condensed']">BAIXE O APP</div>
            <div className="flex gap-2.5 flex-wrap">
              <StoreBadge type="apple" url={appStoreUrl} />
              <StoreBadge type="google" url={playStoreUrl} />
            </div>
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <a href="https://www.instagram.com/bjjrats" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#444] no-underline transition-colors hover:text-[#CC0000] font-['Barlow_Condensed']"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              @BJJRATS
            </a>
            <span onClick={() => setLegalModal('support')} className="text-[0.65rem] text-[#555] uppercase tracking-[0.1em] no-underline transition-colors hover:text-[#CC0000] font-['Barlow_Condensed'] cursor-pointer">Suporte</span>
            <span onClick={() => setLegalModal('terms')} className="text-[0.65rem] text-[#555] uppercase tracking-[0.1em] no-underline transition-colors hover:text-[#CC0000] font-['Barlow_Condensed'] cursor-pointer">Termos</span>
            <span onClick={() => setLegalModal('privacy')} className="text-[0.65rem] text-[#555] uppercase tracking-[0.1em] no-underline transition-colors hover:text-[#CC0000] font-['Barlow_Condensed'] cursor-pointer">Privacidade</span>
          </div>

          <p className="text-[0.65rem] text-[#333] uppercase tracking-[0.1em] font-['Barlow_Condensed']">
            © 2026 THE BJJRATS. TODOS OS DIREITOS RESERVADOS.
          </p>
        </div>

        {/* Modais legais */}
      <LegalModal open={legalModal === 'terms'} title="Termos de Uso" onClose={() => setLegalModal(null)}>
        <TermsContent />
      </LegalModal>

      <LegalModal open={legalModal === 'privacy'} title="Política de Privacidade" onClose={() => setLegalModal(null)}>
        <PrivacyContent />
      </LegalModal>

      <LegalModal open={legalModal === 'support'} title="Suporte" onClose={() => setLegalModal(null)}>
        <SupportContent />
      </LegalModal>

        {/* RAOS Tecnologia */}
        <div className="max-w-[1200px] mx-auto mt-6 pt-5 border-t border-[#111] flex justify-center">
          <a href="https://raostecnologia.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 no-underline group transition-opacity">
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-[#555] font-['Barlow_Condensed'] opacity-40 group-hover:opacity-70 transition-opacity">Desenvolvido por</span>
            <img src="/raos-logo.png" alt="RAOS Tecnologia" className="h-[26px] w-auto object-contain opacity-65 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </footer>

      <style>{`
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes lp-slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .lp-counter {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 2.5rem;
          color: #CC0000;
          line-height: 1;
        }
        @media (min-width: 640px) { .lp-counter { font-size: 3rem; } }

        .lp-hamburger {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 6px 4px;
        }
        .lp-bar {
          display: block;
          width: 22px;
          height: 2px;
          background: #FFF;
          transition: all 0.25s ease;
          transform-origin: center;
        }
        .lp-bar1-open { transform: translateY(7px) rotate(45deg); }
        .lp-bar2-open { opacity: 0; transform: scaleX(0); }
        .lp-bar3-open { transform: translateY(-7px) rotate(-45deg); }

        .lp-mobile-menu {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          z-index: 190;
          background: rgba(10,10,10,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(204,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          animation: lp-slide-down 0.2s ease;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        .lp-mob-item {
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          color: #CCC;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          padding: 1rem 1.5rem;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, padding-left 0.2s;
        }
        .lp-mob-item:hover { background: rgba(204,0,0,0.08); color: #FFF; padding-left: 1.75rem; }
        .lp-mob-hr { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }

        .lp-store-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          background: #111;
          border: 1px solid #252525;
          border-radius: 8px;
          padding: 0.5rem 0.875rem 0.5rem 0.75rem;
          cursor: not-allowed;
          opacity: 0.52;
          transition: opacity 0.2s,border-color 0.2s;
          user-select: none;
        }
        .lp-store-btn:hover { opacity: 0.68; border-color: #333; }
        .lp-store-soon {
          position: absolute;
          top: -8px;
          right: 6px;
          background: #1C1C1C;
          border: 1px solid #2E2E2E;
          border-radius: 3px;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.44rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #555;
          padding: 0.1rem 0.4rem;
          white-space: nowrap;
        }
        .lp-store-icon { display: flex; align-items: center; flex-shrink: 0; }
        .lp-store-text { display: flex; flex-direction: column; }
        .lp-store-sub {
          font-family: 'Barlow', sans-serif;
          font-size: 0.5rem;
          color: #666;
          letter-spacing: 0.02em;
          line-height: 1;
          margin-bottom: 0.15rem;
        }
        .lp-store-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          color: #aaa;
          line-height: 1;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}

