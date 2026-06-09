import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, Check, ExternalLink, Megaphone, X } from 'lucide-react';
import api, { type Announcement, type Notification } from '@/lib/api';

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getNotificationTitle(notification: Notification) {
  return notification.title || notification.type?.replace(/_/g, ' ').toUpperCase() || 'NOTIFICACAO';
}

function getNotificationMessage(notification: Notification) {
  return notification.message || notification.body || '';
}

interface NotificationBellProps {
  placement?: 'fixed' | 'inline';
}

export default function NotificationBell({ placement = 'fixed' }: NotificationBellProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [urgent, setUrgent] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [announcementRows, notificationRows] = await Promise.all([
        api.announcements.list(),
        api.notifications.list(),
      ]);
      setAnnouncements(announcementRows);
      setNotifications(notificationRows);
      setUrgent(current => current || announcementRows.find(item => item.urgent) || null);
    } catch {
      // Silencioso: o sino nao deve quebrar o app inteiro.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const unreadNotifications = notifications.filter(item => !item.read);
  const totalCount = unreadNotifications.length + announcements.length;

  const items = useMemo(() => {
    return [
      ...announcements.map(item => ({
        id: item.id,
        kind: 'announcement' as const,
        urgent: !!item.urgent,
        title: item.title,
        message: item.content,
        source: item.sourceName || (item.scope === 'global' ? 'BJJRats' : 'Notificação'),
        createdAt: item.createdAt,
        linkUrl: item.linkUrl || '',
        linkText: item.linkText || 'ABRIR',
      })),
      ...notifications.map(item => ({
        id: item.id,
        kind: 'notification' as const,
        urgent: false,
        unread: !item.read,
        title: getNotificationTitle(item),
        message: getNotificationMessage(item),
        source: item.fromName || 'Notificacao',
        createdAt: item.createdAt,
        linkUrl: '',
        linkText: '',
      })),
    ].sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [announcements, notifications]);

  const dismissAnnouncement = async (id: string) => {
    setAnnouncements(prev => {
      const next = prev.filter(item => item.id !== id);
      if (urgent?.id === id) setUrgent(next.find(item => item.urgent) || null);
      return next;
    });
    try {
      await api.announcements.dismiss(id);
    } catch {
      await load();
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
    try {
      await api.notifications.markRead(id);
    } catch {
      await load();
    }
  };

  const containerStyle: CSSProperties = placement === 'inline'
    ? { position: 'relative', zIndex: 10020, flexShrink: 0 }
    : { position: 'fixed', top: '0.75rem', right: '0.75rem', zIndex: 10020 };

  return (
    <>
      <div style={containerStyle}>
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          aria-label="Abrir notificações"
          title="Notificações"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: totalCount > 0 ? '1px solid #CC0000' : '1px solid #2A2A2A',
            background: '#0D0D0D',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
            position: 'relative',
          }}
        >
          <Bell size={19} strokeWidth={2.25} />
          {totalCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              background: '#CC0000',
              color: '#FFF',
              border: '2px solid #0A0A0A',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900,
              fontSize: '0.65rem',
              lineHeight: '14px',
              textAlign: 'center',
            }}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: 'min(360px, calc(100vw - 1.5rem))',
                maxHeight: 'min(560px, calc(100vh - 5rem))',
                overflowY: 'auto',
                background: '#0D0D0D',
                border: '1px solid #2A2A2A',
                borderTop: '3px solid #CC0000',
                boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
              }}
            >
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  NOTIFICAÇÕES
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar notificações"
                  style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              {loading && items.length === 0 && (
                <p style={{ padding: '1rem', fontFamily: 'Barlow Condensed, sans-serif', color: '#555', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  CARREGANDO...
                </p>
              )}

              {!loading && items.length === 0 && (
                <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                  <Megaphone size={28} color="#333" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#555', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    NENHUMA NOTIFICAÇÃO
                  </p>
                </div>
              )}

              {items.map(item => (
                <div
                  key={`${item.kind}-${item.id}`}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid #171717',
                    background: item.urgent ? '#190A0A' : item.kind === 'notification' && item.unread ? '#10131A' : '#0D0D0D',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: item.urgent ? '#CC000022' : '#151515',
                    border: `1px solid ${item.urgent ? '#CC0000' : '#2A2A2A'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.urgent ? '#FF4D4D' : '#888',
                  }}>
                    {item.urgent ? <AlertTriangle size={16} /> : <Megaphone size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.82rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                        {item.title}
                      </p>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: '#444', flexShrink: 0 }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.78rem', color: '#888', lineHeight: 1.35, marginTop: '0.25rem' }}>
                      {item.message}
                    </p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.62rem', color: item.urgent ? '#CC0000' : '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.45rem' }}>
                      {item.source}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
                      {item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#FFF',
                            border: '1px solid #333',
                            background: '#151515',
                            textDecoration: 'none',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: '0.35rem 0.55rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {item.linkText}
                          <ExternalLink size={12} />
                        </a>
                      )}
                      {item.kind === 'announcement' ? (
                        <button
                          type="button"
                          onClick={() => dismissAnnouncement(item.id)}
                          style={{
                            background: '#111',
                            border: '1px solid #333',
                            color: '#888',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '0.35rem 0.55rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={12} /> LIDO
                        </button>
                      ) : !item.unread ? null : (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(item.id)}
                          style={{
                            background: '#111',
                            border: '1px solid #333',
                            color: '#888',
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '0.35rem 0.55rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={12} /> LIDO
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {urgent && (
          <motion.div
            key={urgent.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10030,
              background: 'rgba(0,0,0,0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              style={{
                width: 'min(460px, 100%)',
                background: '#0D0D0D',
                border: '1px solid #3A0000',
                borderTop: '4px solid #CC0000',
                padding: '1.25rem',
                boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ width: '58px', height: '58px', borderRadius: '50%', border: '2px solid #CC0000', background: '#1A0000', color: '#FF4D4D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <AlertTriangle size={28} />
              </div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.45rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                {urgent.title}
              </p>
              <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#CCC', lineHeight: 1.55, marginTop: '0.75rem' }}>
                {urgent.content}
              </p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.875rem' }}>
                {urgent.sourceName || 'BJJRats'}
              </p>
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                {urgent.linkUrl && (
                  <a
                    href={urgent.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      minWidth: '130px',
                      background: '#151515',
                      border: '1px solid #333',
                      color: '#FFF',
                      textDecoration: 'none',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {urgent.linkText || 'ABRIR'} <ExternalLink size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => dismissAnnouncement(urgent.id)}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    background: '#CC0000',
                    border: 'none',
                    color: '#FFF',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                  }}
                >
                  ENTENDI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
