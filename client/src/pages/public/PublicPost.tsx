// Design: "Cage Fighter" — Brutalismo Tático
// Página pública de post do Feed — compartilhável via WhatsApp/Instagram
import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import api from '@/lib/api';

interface Post {
  id: string;
  text: string;
  photoURL?: string;
  type: string;
  authorName: string;
  academyName: string;
  academyLogo?: string;
  createdAtStr?: string;
  createdAt?: { seconds: number };
  likes?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  aviso: 'AVISO',
  novidade: 'NOVIDADE',
  resultado: 'RESULTADO',
  treino: 'TREINO',
  geral: 'POST',
};

const TYPE_COLORS: Record<string, string> = {
  aviso: '#E6A817',
  novidade: '#CC0000',
  resultado: '#C9A227',
  treino: '#0D9E6E',
  geral: '#555',
};

function formatDate(post: Post): string {
  if (post.createdAtStr) return post.createdAtStr;
  if (post.createdAt?.seconds) {
    return new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  return '';
}

export default function PublicPost() {
  const params = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.posts.get(params.postId);
        const p: Post = {
          id: d.id,
          text: d.text || '',
          photoURL: d.photoURL,
          type: d.type || 'geral',
          authorName: d.authorName || 'Professor',
          academyName: d.academyName || d.authorName || 'Academia',
          academyLogo: d.academyLogo || d.academyLogoUrl,
          createdAtStr: d.createdAtStr,
          createdAt: d.createdAt,
          likes: d.likes || [],
        };
        setPost(p);
        // Meta tags OG para WhatsApp/Telegram
        document.title = `${p.academyName} — ${TYPE_LABELS[p.type] || 'Post'} | BJJRats`;
        const setMeta = (prop: string, content: string) => {
          let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement;
          if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
          el.setAttribute('content', content);
        };
        setMeta('og:title', `${p.academyName} — ${TYPE_LABELS[p.type] || 'Post'}`);
        setMeta('og:description', p.text.substring(0, 200));
        if (p.photoURL) setMeta('og:image', p.photoURL);
        setMeta('og:url', window.location.href);
        setMeta('og:type', 'article');
        setMeta('og:site_name', 'BJJRats');
      } catch (err) {
        console.error('Erro ao carregar post:', err);
        setNotFound(true);
      }
      finally { setLoading(false); }
    };
    load();
  }, [params.postId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.academyName, text: post?.text?.substring(0, 100), url });
      } catch { /* cancelado */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        prompt('Copie o link:', url);
      }
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid #CC0000', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}>CARREGANDO...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (notFound || !post) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', background: '#111', border: '2px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '1.5rem' }}>📡</div>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '0.5rem' }}>POST NÃO ENCONTRADO</p>
      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', color: '#555', marginBottom: '2rem', lineHeight: 1.5 }}>
        Este post pode ter sido removido ou o link está incorreto.
      </p>
      <Link href="/" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}>
        CONHECER O BJJRATS
      </Link>
    </div>
  );

  const typeColor = TYPE_COLORS[post.type] || '#555';
  const dateStr = formatDate(post);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '2px solid #CC0000', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #CC0000', background: '#1A0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {post.academyLogo
              ? <img src={post.academyLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#CC0000' }}>{(post.academyName || 'A').substring(0, 2).toUpperCase()}</span>}
          </div>
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>{post.academyName}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.6rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em' }}>BJJRATS</p>
          </div>
        </div>
        <Link href="/" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', textDecoration: 'none', border: '1px solid #222', padding: '0.375rem 0.75rem' }}>
          SITE
        </Link>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.25rem' }}>

        {/* Type badge + meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ background: typeColor + '22', border: `1px solid ${typeColor}`, color: typeColor, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.2rem 0.5rem' }}>
            {TYPE_LABELS[post.type] || 'POST'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(post.likes?.length ?? 0) > 0 && (
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#555' }}>
                ❤️ {post.likes!.length}
              </span>
            )}
            {dateStr && (
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444', textTransform: 'uppercase' }}>{dateStr}</span>
            )}
          </div>
        </div>

        {/* Photo */}
        {post.photoURL && (
          <div style={{ marginBottom: '1rem', background: '#111', overflow: 'hidden' }}>
            <img src={post.photoURL} alt="" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '400px' }} />
          </div>
        )}

        {/* Text */}
        {post.text && (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderLeft: `3px solid ${typeColor}`, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '1rem', color: '#FFFFFF', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{post.text}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #1E1E1E' }}>
              Prof. {post.authorName}
            </p>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/app" style={{ background: '#CC0000', color: '#FFF', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            🥋 ABRIR NO APP
          </Link>
          <button
            onClick={handleShare}
            style={{ background: 'none', border: '1px solid #333', color: copied ? '#0D9E6E' : '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.875rem', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            {copied ? '✓ LINK COPIADO' : 'COMPARTILHAR LINK'}
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #1E1E1E', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.65rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Publicado via <span style={{ color: '#CC0000' }}>BJJRATS</span> — O app do praticante de Jiu-Jitsu
          </p>
        </div>
      </div>
    </div>
  );
}
