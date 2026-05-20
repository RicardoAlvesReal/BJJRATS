// BJJRats PWA — Landing Page
// Design: "Cage Fighter" — Brutalismo Tático
// Mobile-first: menu hamburger, hero adaptado, todas as seções responsivas
// v2: separação Alunos / Academia / Comunidade, dois botões de perfil, badges SVG de loja
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-hero-bg-EvuzUMvwhPb4GgYFs4uUr2.webp';
const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663343500922/eZPracQhphsa87KDbjhHAd/bjjrats-logo-hero-mmgzpqY4ZnMgeAjjykaT4c.webp';

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

// SVG do logo Apple
const AppleSVG = () => (
  <svg width="20" height="24" viewBox="0 0 814 1000" fill="#AAA" xmlns="http://www.w3.org/2000/svg">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.9-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.9 0 111.3 2.6 168.3 80.1zm-198.5-119.5c31.2-36.9 53.4-88.1 53.4-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.2-71.3z"/>
  </svg>
);

// SVG do logo Google Play
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

// Componente de badge de loja (desativado)
function StoreBadge({ type }: { type: 'apple' | 'google' }) {
  return (
    <div className="lp-store-btn" title={type === 'apple' ? 'Em breve na App Store' : 'Em breve no Google Play'}>
      <span className="lp-store-soon">Em breve</span>
      <span className="lp-store-icon">{type === 'apple' ? <AppleSVG /> : <GooglePlaySVG />}</span>
      <div className="lp-store-text">
        <span className="lp-store-sub">{type === 'apple' ? 'Baixe na' : 'Disponível no'}</span>
        <span className="lp-store-name">{type === 'apple' ? 'App Store' : 'Google Play'}</span>
      </div>
    </div>
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

  return (
    <div className="lp-root">
      {/* ===== NAVBAR ===== */}
      <nav className="lp-nav">
        <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={LOGO} alt="BJJRats" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          <span className="lp-logo-text"><span style={{ color: '#FFF' }}>BJJ</span><span style={{ color: '#CC0000' }}>RATS</span></span>
        </div>

        {/* Desktop links */}
        <div className="lp-desk-links">
          <button onClick={() => scrollTo('alunos')} className="lp-nav-link">ALUNOS</button>
          <button onClick={() => scrollTo('academia')} className="lp-nav-link">ACADEMIA</button>
          <button onClick={() => scrollTo('comunidade')} className="lp-nav-link">COMUNIDADE</button>
        </div>

        {/* Desktop CTA — dois botões de perfil */}
        <div className="lp-desk-cta">
          <button onClick={() => navigate('/login?perfil=professor')} className="lp-btn-ghost">SOU PROFESSOR</button>
          <button onClick={() => navigate('/login?perfil=aluno')} className="lp-btn-red">SOU ALUNO</button>
        </div>

        {/* Mobile right */}
        <div className="lp-mob-right">
          <button onClick={() => navigate('/login')} className="lp-btn-red lp-btn-sm">ENTRAR</button>
          <button className="lp-hamburger" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} aria-label="Menu">
            <span className={menuOpen ? 'lp-bar lp-bar1-open' : 'lp-bar'} />
            <span className={menuOpen ? 'lp-bar lp-bar2-open' : 'lp-bar'} />
            <span className={menuOpen ? 'lp-bar lp-bar3-open' : 'lp-bar'} />
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
          <button onClick={() => { navigate('/login?perfil=aluno'); setMenuOpen(false); }} className="lp-mob-item" style={{ color: '#CC0000' }}>SOU ALUNO →</button>
          <button onClick={() => { navigate('/login?perfil=professor'); setMenuOpen(false); }} className="lp-mob-item" style={{ color: '#888' }}>SOU PROFESSOR →</button>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className="lp-hero">
        <img src={HERO_BG} alt="" className="lp-hero-bg" />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">

          {/* Logomarca grande */}
          <div className="lp-hero-logo-block">
            <img src={LOGO} alt="BJJRats" className="lp-hero-logo-img" />
            <span className="lp-hero-wordmark"><span style={{ color: '#FFF' }}>BJJ</span><span style={{ color: '#CC0000' }}>RATS</span></span>
          </div>

          <div className="lp-badge">
            <span className="lp-badge-dot" />
            ACESSO ABERTO — FASE BETA
          </div>
          <h1 className="lp-hero-h1">
            TREINE.<br />EVOLUA.<br /><span style={{ color: '#CC0000' }}>DOMINE.</span>
          </h1>
          <p className="lp-hero-p">
            O app feito para praticantes e professores de Jiu-Jitsu. Registre cada treino, acompanhe sua jornada até a próxima faixa e construa a comunidade da sua academia.
          </p>

          {/* Dois botões de perfil */}
          <div className="lp-hero-cta">
            <div className="lp-hero-btn-row">
              <button onClick={() => navigate('/login?perfil=aluno')} className="lp-hero-btn-red">
                SOU ALUNO
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button onClick={() => navigate('/login?perfil=professor')} className="lp-hero-btn-ghost">
                SOU PROFESSOR
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Badges de loja */}
            <div className="lp-store-group">
              <span className="lp-store-group-label">Baixe o app:</span>
              <div className="lp-store-badges">
                <StoreBadge type="apple" />
                <StoreBadge type="google" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="lp-stats-sec">
        <div className="lp-stats-grid">
          {[
            { target: 6, suffix: '+', label: 'FUNCIONALIDADES', sub: 'PARA ALUNOS' },
            { target: 8, suffix: '+', label: 'FERRAMENTAS', sub: 'PARA ACADEMIAS' },
            { target: 4, suffix: '+', label: 'RECURSOS', sub: 'DE COMUNIDADE' },
            { target: 100, suffix: '%', label: 'FOCADO', sub: 'EM BJJ' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <CounterNumber target={s.target} suffix={s.suffix} />
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SEÇÃO: O APP ===== */}
      <section className="lp-sec">
        <div className="lp-inner">
          <div className="lp-eyebrow">O APP</div>
          <div className="lp-rule-row"><div className="lp-rule" /><span className="lp-rule-text">TUDO QUE ESTÁ DENTRO</span></div>
          <h2 className="lp-h2">FEITO PARA<br />O TATAME.</h2>
          <p className="lp-p" style={{ maxWidth: '480px' }}>Três universos distintos — Aluno, Academia e Comunidade — cada um com suas ferramentas, integrados em um único app.</p>

          {/* ─── BLOCO ALUNOS ─── */}
          <div id="alunos" className="lp-block-header lp-bh-aluno">
            <span className="lp-block-pill lp-bp-aluno">Para Alunos</span>
            <span className="lp-block-title">SUA JORNADA NO TATAME</span>
            <span className="lp-block-count">6 FUNCIONALIDADES</span>
          </div>
          <div className="lp-feat-grid">
            {FEATURES_ALUNO.map(f => (
              <div key={f.num} className="lp-feat-card lp-fc-aluno">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="lp-feat-num lp-fn-aluno">{f.num}</span>
                  <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
                </div>
                <div className="lp-feat-tag lp-ft-aluno">Para Alunos</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-block-cta">
            <button onClick={() => navigate('/login?perfil=aluno')} className="lp-bcta-link lp-bcta-aluno">
              ENTRAR COMO ALUNO
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="lp-bcta-note">Cadastro gratuito · Acesso imediato</span>
          </div>

          {/* ─── BLOCO ACADEMIA ─── */}
          <div id="academia" className="lp-block-header lp-bh-academia">
            <span className="lp-block-pill lp-bp-academia">Para Academias</span>
            <span className="lp-block-title">GERENCIE SUA EQUIPE</span>
            <span className="lp-block-count">8 FUNCIONALIDADES</span>
          </div>
          <div className="lp-feat-grid">
            {FEATURES_ACADEMIA.map(f => (
              <div key={f.num} className="lp-feat-card lp-fc-academia">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="lp-feat-num lp-fn-academia">{f.num}</span>
                  <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
                </div>
                <div className="lp-feat-tag lp-ft-academia">Para Academias</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-block-cta">
            <button onClick={() => navigate('/login?perfil=professor')} className="lp-bcta-link lp-bcta-academia">
              ENTRAR COMO PROFESSOR
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="lp-bcta-note">Painel completo · Gestão da turma</span>
          </div>

          {/* ─── BLOCO COMUNIDADE ─── */}
          <div id="comunidade" className="lp-block-header lp-bh-comunidade">
            <span className="lp-block-pill lp-bp-comunidade">Comunidade</span>
            <span className="lp-block-title">CONECTE-SE COM O BJJ</span>
            <span className="lp-block-count">4 FUNCIONALIDADES</span>
          </div>
          <div className="lp-feat-grid">
            {FEATURES_COMUNIDADE.map(f => (
              <div key={f.num} className="lp-feat-card lp-fc-comunidade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="lp-feat-num lp-fn-comunidade">{f.num}</span>
                  <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
                </div>
                <div className="lp-feat-tag lp-ft-comunidade">Comunidade</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-block-cta">
            <button onClick={() => navigate('/login')} className="lp-bcta-link lp-bcta-comunidade">
              EXPLORAR COMUNIDADE
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="lp-bcta-note">Aberta para todos · Gratuito</span>
          </div>

        </div>
      </section>

      {/* ===== FASE BETA ===== */}
      <section className="lp-sec lp-sec-waitlist">
        <div className="lp-waitlist-wrap">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1A0000', border: '1px solid #CC000044', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.15em', color: '#CC0000', textTransform: 'uppercase', padding: '0.35rem 0.875rem', marginBottom: '1.25rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CC0000', animation: 'lp-pulse 1.5s infinite', flexShrink: 0 }} />
            ACESSO ABERTO — FASE BETA
          </div>
          <h2 className="lp-h2" style={{ textAlign: 'center' }}>ENTRE NO<br /><span style={{ color: '#CC0000' }}>TATAME DIGITAL.</span></h2>
          <p className="lp-p-center">O BJJRats já está no ar. <strong style={{ color: '#AAA', fontWeight: 500 }}>Crie sua conta gratuitamente</strong>, registre seus treinos e explore todas as funcionalidades durante a fase de testes.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
            <div className="lp-hero-btn-row" style={{ justifyContent: 'center' }}>
              <button onClick={() => navigate('/register?perfil=aluno')} className="lp-btn-cta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                SOU ALUNO — CRIAR CONTA
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button onClick={() => navigate('/register?perfil=professor')} className="lp-btn-cta-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                SOU PROFESSOR — CRIAR CONTA
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', cursor: 'pointer' }}>
              JÁ TENHO CONTA → ACESSAR O APP
            </button>
          </div>

          {/* Badges de loja na seção beta */}
          <div className="lp-store-group" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            <span className="lp-store-group-label">Baixe o app:</span>
            <div className="lp-store-badges">
              <StoreBadge type="apple" />
              <StoreBadge type="google" />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {['ACESSO VIA WEB', 'CADASTRO GRATUITO', 'FASE DE TESTES ABERTA'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CC000066" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src={LOGO} alt="BJJRats" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              <span className="lp-logo-text" style={{ fontSize: '1rem' }}><span style={{ color: '#FFF' }}>BJJ</span><span style={{ color: '#CC0000' }}>RATS</span></span>
            </div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', maxWidth: '220px', lineHeight: 1.6 }}>
              O app feito para praticantes e professores de Jiu-Jitsu.
            </p>
          </div>

          {/* Badges de loja no footer */}
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#444', marginBottom: '0.75rem' }}>BAIXE O APP</div>
            <div className="lp-store-badges">
              <StoreBadge type="apple" />
              <StoreBadge type="google" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://www.instagram.com/bjjrats"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-social-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              @BJJRATS
            </a>
            <a href="/support" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#CC0000')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
              Suporte
            </a>
            <a href="/privacy-policy" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#CC0000')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
              Privacidade
            </a>
          </div>

          <p className="lp-footer-copy">© 2026 THE BJJRATS. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </footer>

      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes lp-slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .lp-root{background:#0A0A0A;color:#FFF;font-family:'Barlow',sans-serif;overflow-x:hidden;width:100%}

        /* NAV */
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:200;background:rgba(10,10,10,0.97);backdrop-filter:blur(8px);border-bottom:1px solid #1A1A1A;display:flex;align-items:center;justify-content:space-between;padding:0 1rem;height:56px}
        .lp-logo{display:flex;align-items:center;gap:0.5rem;cursor:pointer;flex-shrink:0}
        .lp-logo-text{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.2rem;letter-spacing:0.05em}
        .lp-desk-links{display:none;align-items:center;gap:0.25rem}
        .lp-desk-cta{display:none;align-items:center;gap:0.5rem}
        .lp-nav-link{background:none;border:none;color:#888;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;transition:color 0.15s;padding:0.5rem 0.75rem}
        .lp-nav-link:hover{color:#FFF}
        .lp-btn-red{background:#CC0000;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;padding:0.5rem 1rem;border:none;cursor:pointer;transition:background 0.15s;white-space:nowrap}
        .lp-btn-red:hover{background:#FF0000}
        .lp-btn-sm{font-size:0.7rem;padding:0.4rem 0.75rem}
        .lp-btn-ghost{background:transparent;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;padding:0.5rem 1rem;border:1px solid #333;cursor:pointer;transition:border-color 0.15s;white-space:nowrap}
        .lp-btn-ghost:hover{border-color:#888}
        .lp-mob-right{display:flex;align-items:center;gap:0.5rem}
        .lp-hamburger{background:none;border:none;cursor:pointer;display:flex;flex-direction:column;gap:5px;padding:6px 4px}
        .lp-bar{display:block;width:22px;height:2px;background:#FFF;transition:all 0.25s ease;transform-origin:center}
        .lp-bar1-open{transform:translateY(7px) rotate(45deg)}
        .lp-bar2-open{opacity:0;transform:scaleX(0)}
        .lp-bar3-open{transform:translateY(-7px) rotate(-45deg)}

        /* MOBILE MENU */
        .lp-mobile-menu{position:fixed;top:56px;left:0;right:0;z-index:190;background:#0D0D0D;border-bottom:2px solid #CC0000;display:flex;flex-direction:column;animation:lp-slide-down 0.2s ease}
        .lp-mob-item{background:none;border:none;border-bottom:1px solid #1A1A1A;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;text-transform:uppercase;letter-spacing:0.1em;padding:1rem 1.5rem;text-align:left;cursor:pointer;transition:background 0.15s}
        .lp-mob-item:hover{background:#1A1A1A}
        .lp-mob-hr{border:none;border-top:1px solid #1A1A1A;margin:0}

        /* HERO */
        .lp-hero{min-height:100svh;position:relative;display:flex;align-items:flex-end;padding-top:56px}
        .lp-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
        .lp-hero-overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.75) 55%,rgba(0,0,0,0.2) 100%)}
        .lp-hero-content{position:relative;z-index:2;padding:2.5rem 1.25rem 3.5rem;max-width:1200px;width:100%;margin:0 auto}

        /* Hero logo */
        .lp-hero-logo-block{display:flex;align-items:center;gap:0.875rem;margin-bottom:2rem}
        .lp-hero-logo-img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(204,0,0,0.4))}
        .lp-hero-wordmark{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:2.4rem;line-height:1;letter-spacing:0.03em}

        .lp-badge{display:inline-flex;align-items:center;gap:0.5rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.2em;color:#CC0000;margin-bottom:1rem}
        .lp-badge-dot{width:6px;height:6px;background:#CC0000;border-radius:50%;animation:lp-pulse 2s infinite;flex-shrink:0}
        .lp-hero-h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(3.5rem,14vw,8rem);text-transform:uppercase;line-height:0.88;margin-bottom:1.25rem}
        .lp-hero-p{color:#CCC;line-height:1.6;margin-bottom:2rem;font-size:clamp(0.875rem,2.5vw,1rem);max-width:520px}
        .lp-hero-cta{display:flex;flex-direction:column;gap:1.25rem}
        .lp-hero-btn-row{display:flex;gap:0.75rem;flex-wrap:wrap}
        .lp-hero-btn-red{background:#CC0000;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.95rem;text-transform:uppercase;letter-spacing:0.1em;padding:0.9rem 1.5rem;border:none;cursor:pointer;transition:background 0.15s;display:inline-flex;align-items:center;gap:0.4rem}
        .lp-hero-btn-red:hover{background:#FF0000}
        .lp-hero-btn-ghost{background:transparent;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.08em;padding:0.9rem 1.5rem;border:1px solid rgba(255,255,255,0.3);cursor:pointer;transition:border-color 0.15s;display:inline-flex;align-items:center;gap:0.4rem}
        .lp-hero-btn-ghost:hover{border-color:rgba(255,255,255,0.6)}

        /* STORE BADGES */
        .lp-store-group{display:flex;align-items:center;gap:0.875rem;flex-wrap:wrap}
        .lp-store-group-label{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.58rem;text-transform:uppercase;letter-spacing:0.14em;color:#444}
        .lp-store-badges{display:flex;gap:0.625rem;flex-wrap:wrap}
        .lp-store-btn{position:relative;display:inline-flex;align-items:center;gap:0.65rem;background:#111;border:1px solid #252525;border-radius:8px;padding:0.5rem 0.875rem 0.5rem 0.75rem;cursor:not-allowed;opacity:0.52;transition:opacity 0.2s,border-color 0.2s;user-select:none}
        .lp-store-btn:hover{opacity:0.68;border-color:#333}
        .lp-store-soon{position:absolute;top:-8px;right:6px;background:#1C1C1C;border:1px solid #2E2E2E;border-radius:3px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.44rem;text-transform:uppercase;letter-spacing:0.1em;color:#555;padding:0.1rem 0.4rem;white-space:nowrap}
        .lp-store-icon{display:flex;align-items:center;flex-shrink:0}
        .lp-store-text{display:flex;flex-direction:column}
        .lp-store-sub{font-family:'Barlow',sans-serif;font-size:0.5rem;color:#666;letter-spacing:0.02em;line-height:1;margin-bottom:0.15rem}
        .lp-store-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.88rem;color:#aaa;line-height:1;letter-spacing:0.01em}

        /* STATS */
        .lp-stats-sec{background:#0D0D0D;border-top:2px solid #CC0000;border-bottom:1px solid #1A1A1A;padding:2.5rem 1.25rem}
        .lp-stats-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem 1rem}
        .lp-counter{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:2.5rem;color:#CC0000;line-height:1}
        .lp-stat-label{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;margin-top:0.25rem}
        .lp-stat-sub{font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;color:#555;text-transform:uppercase;letter-spacing:0.1em;margin-top:0.125rem}

        /* SECTIONS */
        .lp-sec{padding:4rem 1.25rem;background:#0A0A0A}
        .lp-sec-dark{background:#0D0D0D}
        .lp-sec-border{border-top:1px solid #1A1A1A}
        .lp-sec-waitlist{background:#0D0D0D;border-top:2px solid #CC0000}
        .lp-inner{max-width:1200px;margin:0 auto}
        .lp-eyebrow{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.2em;color:#CC0000;margin-bottom:0.75rem}
        .lp-rule-row{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem}
        .lp-rule{width:4px;height:2.5rem;background:#CC0000;flex-shrink:0}
        .lp-rule-text{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.2em;color:#666}
        .lp-h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(2rem,8vw,4.5rem);text-transform:uppercase;line-height:0.9;margin-bottom:1rem}
        .lp-p{color:#888;line-height:1.7;margin-bottom:2rem;font-size:clamp(0.875rem,2vw,0.95rem)}
        .lp-p-center{color:#888;line-height:1.7;margin:0 auto 2rem;font-size:clamp(0.875rem,2vw,0.95rem);max-width:600px}

        /* BLOCK HEADERS */
        .lp-block-header{display:flex;align-items:center;gap:0.875rem;margin-top:3.5rem;margin-bottom:1.5rem;padding-bottom:1.25rem;flex-wrap:wrap}
        .lp-bh-aluno{border-bottom:2px solid #CC0000}
        .lp-bh-academia{border-bottom:2px solid #0EA5E9;margin-top:5rem}
        .lp-bh-comunidade{border-bottom:2px solid #22C55E;margin-top:5rem}
        .lp-block-pill{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.58rem;text-transform:uppercase;letter-spacing:0.18em;padding:0.28rem 0.75rem;flex-shrink:0}
        .lp-bp-aluno{background:#0F0000;color:#CC0000;border:1px solid #CC000050}
        .lp-bp-academia{background:#020D14;color:#0EA5E9;border:1px solid #0EA5E938}
        .lp-bp-comunidade{background:#021208;color:#22C55E;border:1px solid #22C55E38}
        .lp-block-title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.25rem;text-transform:uppercase;letter-spacing:-0.01em}
        .lp-block-count{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.58rem;text-transform:uppercase;letter-spacing:0.12em;color:#444;flex-shrink:0}

        /* FEATURE GRID */
        .lp-feat-grid{display:grid;grid-template-columns:1fr;gap:1px;background:#1A1A1A}
        .lp-feat-card{background:#0A0A0A;padding:1.5rem;border-left:3px solid transparent;transition:border-color 0.2s,background 0.2s;position:relative;overflow:hidden}
        .lp-fc-aluno:hover{border-left-color:#CC0000;background:#0D0000}
        .lp-fc-academia:hover{border-left-color:#0EA5E9;background:#020D14}
        .lp-fc-comunidade:hover{border-left-color:#22C55E;background:#021208}
        .lp-feat-num{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:2.5rem;line-height:1}
        .lp-fn-aluno{color:rgba(204,0,0,0.15)}
        .lp-fn-academia{color:rgba(14,165,233,0.15)}
        .lp-fn-comunidade{color:rgba(34,197,94,0.15)}
        .lp-feat-tag{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:0.5rem}
        .lp-ft-aluno{color:#CC0000}
        .lp-ft-academia{color:#0EA5E9}
        .lp-ft-comunidade{color:#22C55E}
        .lp-feat-title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.25rem;text-transform:uppercase;margin-bottom:0.5rem}
        .lp-feat-desc{color:#888;font-size:0.875rem;line-height:1.6}

        /* BLOCK CTA */
        .lp-block-cta{display:flex;align-items:center;gap:1.25rem;margin-top:1.5rem;flex-wrap:wrap}
        .lp-bcta-link{background:none;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;transition:gap 0.2s,opacity 0.2s;padding:0}
        .lp-bcta-link:hover{gap:0.7rem;opacity:0.8}
        .lp-bcta-aluno{color:#CC0000}
        .lp-bcta-academia{color:#0EA5E9}
        .lp-bcta-comunidade{color:#22C55E}
        .lp-bcta-note{font-family:'Barlow Condensed',sans-serif;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;color:#444}

        /* WAITLIST */
        .lp-waitlist-wrap{max-width:640px;margin:0 auto;text-align:center}
        .lp-btn-cta{background:#CC0000;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.95rem;text-transform:uppercase;letter-spacing:0.1em;padding:1rem 1.75rem;border:none;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;gap:0.4rem}
        .lp-btn-cta:hover{background:#FF0000;transform:translateY(-2px)}
        .lp-btn-cta-ghost{background:transparent;color:#FFF;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:0.95rem;text-transform:uppercase;letter-spacing:0.1em;padding:1rem 1.75rem;border:1px solid #333;cursor:pointer;transition:all 0.15s;display:inline-flex;align-items:center;gap:0.4rem}
        .lp-btn-cta-ghost:hover{border-color:#888;transform:translateY(-2px)}

        /* FOOTER */
        .lp-footer{background:#080808;border-top:1px solid #1A1A1A;padding:2.5rem 1.25rem}
        .lp-footer-inner{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;align-items:flex-start;gap:2rem}
        .lp-social-btn{background:none;border:none;color:#444;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;transition:color 0.15s}
        .lp-social-btn:hover{color:#CC0000}
        .lp-footer-copy{font-family:'Barlow Condensed',sans-serif;font-size:0.65rem;color:#333;text-transform:uppercase;letter-spacing:0.1em}

        /* ===== TABLET 640px+ ===== */
        @media (min-width:640px){
          .lp-nav{padding:0 1.5rem;height:60px}
          .lp-mobile-menu{top:60px}
          .lp-hero-content{padding:3rem 1.5rem 4rem}
          .lp-stats-grid{grid-template-columns:repeat(4,1fr)}
          .lp-feat-grid{grid-template-columns:repeat(2,1fr)}
          .lp-footer-inner{flex-direction:row;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
          .lp-sec{padding:5rem 1.5rem}
          .lp-counter{font-size:3rem}
        }

        /* ===== DESKTOP 1024px+ ===== */
        @media (min-width:1024px){
          .lp-nav{padding:0 2rem;height:64px}
          .lp-mobile-menu{top:64px}
          .lp-desk-links{display:flex}
          .lp-desk-cta{display:flex}
          .lp-mob-right{display:none}
          .lp-hero-content{padding:4rem 2rem 5rem}
          .lp-sec{padding:6rem 2rem}
          .lp-feat-grid{grid-template-columns:repeat(3,1fr)}
        }
      `}</style>
    </div>
  );
}
