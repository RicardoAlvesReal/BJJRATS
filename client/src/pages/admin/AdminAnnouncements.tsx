import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import type { Announcement } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 900,
  fontSize: '1.25rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#FFF',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.65rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#666',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '0.65rem 0.8rem',
  color: '#FFF',
  fontSize: '0.85rem',
  fontFamily: 'Barlow, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '80px',
};

const modalStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #333',
  borderRadius: '16px',
  padding: '1.5rem',
  width: '96%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: '#CC0000',
  color: '#FFF',
  border: 'none',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'Barlow Condensed, sans-serif',
  width: '100%',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#888',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'Barlow Condensed, sans-serif',
  width: '100%',
};

export default function AdminAnnouncements() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '', linkUrl: '', linkText: '', urgent: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.admin.announcements.list(true)
      .then(setList)
      .catch(() => setError('Erro ao carregar notificações.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditTarget(null);
    setForm({ title: '', content: '', imageUrl: '', linkUrl: '', linkText: '', urgent: false });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditTarget(a);
    setForm({
      title: a.title,
      content: a.content,
      imageUrl: a.imageUrl || '',
      linkUrl: a.linkUrl || '',
      linkText: a.linkText || '',
      urgent: !!a.urgent,
    });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Título e conteúdo são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let imageUrl = form.imageUrl.trim() || undefined;
      if (imageFile) {
        imageUrl = await api.upload.file(imageFile, 'avisos');
      }
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        imageUrl,
        linkUrl: form.linkUrl.trim() || undefined,
        linkText: form.linkText.trim() || undefined,
        urgent: form.urgent,
      };
      if (editTarget) {
        await api.admin.announcements.update(editTarget.id, payload);
      } else {
        await api.admin.announcements.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.admin.announcements.delete(id);
      setConfirmDel(null);
      load();
    } catch {
      setError('Erro ao excluir.');
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      await api.admin.announcements.update(a.id, { isActive: !a.isActive });
      load();
    } catch {
      setError('Erro ao alternar status.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center' as const }}>
        <p className="text-[#666] text-[0.85rem] font-['Barlow']">Carregando notificações...</p>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={headingStyle}>Notificações</h1>
        <button onClick={openNew} style={btnPrimaryStyle as React.CSSProperties}>
          Nova Notificação
        </button>
      </div>

      {error && (
        <p className="text-[#CC0000] text-[0.8rem] font-['Barlow'] mb-3">{error}</p>
      )}

      {list.length === 0 && (
        <div className="text-center py-10">
          <p className="text-[#555] text-[0.9rem] font-['Barlow']">Nenhuma notificação criada.</p>
          <p className="text-[#444] text-[0.75rem] font-['Barlow_Condensed'] mt-1">
            Crie notificações que aparecem para todos os usuários do app.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {list.map(a => (
          <motion.div key={a.id} variants={fadeUp}
            className="flex items-center justify-between gap-3 p-4 rounded-xl"
            style={{ background: '#111', border: '1px solid #222' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {a.imageUrl && (
                  <img src={a.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                )}
                <span className="font-black text-white text-[0.85rem] font-['Barlow_Condensed'] tracking-[0.04em] truncate">
                  {a.title}
                </span>
                {a.isActive === false && (
                  <span className="text-[0.5rem] font-bold text-[#666] uppercase tracking-[0.12em] border border-[#333] px-1.5 py-0.5 rounded">
                    Inativo
                  </span>
                )}
                {a.urgent && (
                  <span className="text-[0.5rem] font-bold text-[#CC0000] uppercase tracking-[0.12em] border border-[#CC000044] px-1.5 py-0.5 rounded">
                    Urgente
                  </span>
                )}
              </div>
              <p className="text-[#666] text-[0.72rem] font-['Barlow'] truncate mt-0.5">{a.content}</p>
              {a.linkUrl && <p className="text-[#CC0000] text-[0.65rem] font-['Barlow'] mt-0.5 truncate">🔗 {a.linkText || a.linkUrl}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(a)}
                style={{
                  background: a.isActive ? '#0D9E6E22' : '#333',
                  border: `1px solid ${a.isActive ? '#0D9E6E' : '#555'}`,
                  borderRadius: '6px',
                  color: a.isActive ? '#0D9E6E' : '#888',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                {a.isActive ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => openEdit(a)}
                style={{
                  background: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#888',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                Editar
              </button>
              <button onClick={() => setConfirmDel(a.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #CC000044',
                  borderRadius: '6px',
                  color: '#CC0000',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                Excluir
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => setModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={modalStyle}
              onClick={e => e.stopPropagation()}>
              <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                {editTarget ? 'Editar Notificação' : 'Nova Notificação'}
              </h2>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={mutedStyle}>Título *</label>
                <input style={inputStyle} placeholder="Ex: Novo recurso disponível"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={mutedStyle}>Conteúdo *</label>
                <textarea style={textareaStyle} placeholder="Escreva a notificação..."
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={mutedStyle}>Imagem (opcional)</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={handleImageSelect} />
                {(imagePreview || (editTarget?.imageUrl && !imageFile)) && (
                  <div className="relative mb-2" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={imagePreview || editTarget?.imageUrl || ''} alt="preview"
                      style={{ width: '100%', maxHeight: '160px', objectFit: 'cover' }} />
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    textAlign: 'center' as const,
                    color: imageFile ? '#0D9E6E' : '#888',
                    borderColor: imageFile ? '#0D9E6E' : '#333',
                  }}>
                  {imageFile ? '✓ IMAGEM SELECIONADA' : imagePreview || editTarget?.imageUrl ? 'TROCAR IMAGEM' : 'SELECIONAR IMAGEM'}
                </button>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={mutedStyle}>Link (opcional)</label>
                <input style={inputStyle} placeholder="https://..."
                  value={form.linkUrl}
                  onChange={e => setForm(p => ({ ...p, linkUrl: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={mutedStyle}>Texto do Link (opcional)</label>
                <input style={inputStyle} placeholder="Ex: Saber mais"
                  value={form.linkText}
                  onChange={e => setForm(p => ({ ...p, linkText: e.target.value }))} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.urgent}
                  onChange={e => setForm(p => ({ ...p, urgent: e.target.checked }))}
                />
                <span style={{ ...mutedStyle, color: form.urgent ? '#CC0000' : '#666' }}>Mostrar como urgente</span>
              </label>

              {error && <p className="text-[#CC0000] text-[0.75rem] font-['Barlow'] mb-2">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} style={btnSecondaryStyle}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
                  {saving ? 'Salvando...' : editTarget ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ ...modalStyle, textAlign: 'center' as const }}>
              <p className="text-white text-[1rem] font-['Barlow_Condensed'] font-black mb-2">Excluir notificação?</p>
              <p className="text-[#888] text-[0.8rem] font-['Barlow'] mb-4">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(null)} style={btnSecondaryStyle}>Cancelar</button>
                <button onClick={() => handleDelete(confirmDel)} style={{ ...btnPrimaryStyle, background: '#CC0000' }}>Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
