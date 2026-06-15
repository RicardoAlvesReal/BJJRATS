import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api, { type Plan } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { ALL_FEATURES, type FeatureDef } from '@/lib/features';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  academy: 'Academia',
  admin: 'Academia',
  professor: 'Professor',
  student: 'Aluno',
};

const PLAN_COLORS: Record<string, string> = {
  aluno: '#22C55E',
  professor: '#3B82F6',
  academia: '#E87722',
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    roleAssigned: 'student',
    featureKeys: [] as string[],
    trialDays: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState<Plan | null>(null);

  const load = () => {
    setLoading(true);
    api.admin.plans.list()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', slug: '', description: '', price: 0, roleAssigned: 'student', featureKeys: [], trialDays: 0, isActive: true });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      price: p.price,
      roleAssigned: p.roleAssigned === 'admin' ? 'academy' : p.roleAssigned,
      featureKeys: Array.isArray(p.features) ? p.features.filter(f => typeof f === 'string') : [],
      trialDays: p.trialDays ?? 0,
      isActive: p.isActive ?? true,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim() || !form.slug.trim() || form.price < 0 || !form.roleAssigned) {
      setError('Nome, slug, preço e role são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const features = form.featureKeys;
      if (editTarget) {
        await api.admin.plans.update(editTarget.id, {
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          price: form.price,
          roleAssigned: form.roleAssigned,
          features,
          trialDays: form.trialDays,
          isActive: form.isActive,
        });
      } else {
        await api.admin.plans.create({
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
          price: form.price,
          roleAssigned: form.roleAssigned,
          features,
          trialDays: form.trialDays,
        });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Plan) => {
    try {
      await api.admin.plans.delete(p.id);
      setConfirmDel(null);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao excluir.');
    }
  };

  const handleToggleActive = async (p: Plan) => {
    try {
      await api.admin.plans.update(p.id, { isActive: !p.isActive });
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao alterar status.');
    }
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer}>
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={headingStyle}>Planos de Assinatura</h1>
        <button onClick={openCreate} style={btnPrimaryStyle}>+ Novo plano</button>
      </motion.div>

      {loading ? (
        <p style={mutedStyle}>Carregando...</p>
      ) : plans.length === 0 ? (
        <p style={mutedStyle}>Nenhum plano encontrado.</p>
      ) : (
        <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {plans.map(p => (
            <div key={p.id} className="bjj-card" style={{ padding: '1.25rem', border: p.isActive === false ? '1px solid #333' : '1px solid #2A2A2A', opacity: p.isActive === false ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                      {p.name}
                    </h2>
                    <span style={{
                      background: PLAN_COLORS[p.slug] || '#555',
                      color: '#FFF',
                      fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.08em', padding: '2px 6px', textTransform: 'uppercase',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}>
                      {ROLE_LABEL[p.roleAssigned] ?? p.roleAssigned}
                    </span>
                    {p.isActive === false && (
                      <span style={{
                        background: '#555', color: '#FFF',
                        fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.08em', padding: '2px 6px', textTransform: 'uppercase',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        INATIVO
                      </span>
                    )}
                    {p.trialDays && p.trialDays > 0 && (
                      <span style={{
                        background: '#3B82F6', color: '#FFF',
                        fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.08em', padding: '2px 6px', textTransform: 'uppercase',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        {p.trialDays} DIAS GRÁTIS
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ color: '#888', fontSize: '0.85rem', fontFamily: 'Barlow Condensed, sans-serif', margin: '0.25rem 0 0 0' }}>
                      {p.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {Array.isArray(p.features) && p.features.map((f, i) => {
                      const feat = ALL_FEATURES.find(x => x.key === f);
                      return (
                        <span key={i} title={feat?.description ?? f} style={{
                          background: '#1A1A1A', color: '#AAA', fontSize: '0.7rem',
                          fontFamily: 'Barlow Condensed, sans-serif', padding: '2px 8px',
                          border: '1px solid #2A2A2A', cursor: 'default',
                        }}>
                          {feat?.label ?? f}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1 }}>
                    {formatPrice(p.price)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Barlow Condensed, sans-serif' }}>
                    /mês
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleToggleActive(p)}
                      style={{
                        ...btnSmallStyle,
                        color: p.isActive === false ? '#22C55E' : '#E87722',
                        borderColor: p.isActive === false ? '#22C55E66' : '#E8772266',
                      }}
                    >
                      {p.isActive === false ? 'Ativar' : 'Desativar'}
                    </button>
                    <button onClick={() => openEdit(p)} style={btnSmallStyle}>Editar</button>
                    <button onClick={() => setConfirmDel(p)} style={{ ...btnSmallStyle, color: '#CC0000', borderColor: '#CC000066' }}>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <Overlay onClick={() => setModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editTarget ? 'Editar plano' : 'Novo plano'}
            </h2>

            <Field label="Nome" required>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Aluno" />
            </Field>
            <Field label="Slug" required>
              <input style={inputStyle} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="Ex: aluno" />
            </Field>
            <Field label="Descrição">
              <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Plano para alunos" />
            </Field>
            <Field label="Preço (R$)" required>
              <input type="number" step="0.01" min="0" style={inputStyle} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Role atribuída" required>
              <select style={inputStyle} value={form.roleAssigned} onChange={e => setForm(f => ({ ...f, roleAssigned: e.target.value }))}>
                <option value="student">Aluno</option>
                <option value="academy">Academia</option>
                <option value="professor">Professor</option>
              </select>
            </Field>
            <Field label="Dias de teste grátis">
              <input type="number" min="0" style={inputStyle} value={form.trialDays}
                onChange={e => setForm(f => ({ ...f, trialDays: parseInt(e.target.value) || 0 }))}
                placeholder="0 = sem teste grátis" />
            </Field>
            {editTarget && (
              <Field label="Ativo">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CCC', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Plano ativo (visível na página de preços)
                </label>
              </Field>
            )}
            <Field label="Funcionalidades">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', background: '#1A1A1A', border: '1px solid #333', padding: '0.75rem' }}>
                {ALL_FEATURES.map(f => (
                  <label
                    key={f.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.4rem 0.5rem',
                      borderRadius: '4px',
                      background: form.featureKeys.includes(f.key) ? '#2A2A2A' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!form.featureKeys.includes(f.key)) (e.currentTarget as HTMLElement).style.background = '#222'; }}
                    onMouseLeave={e => { if (!form.featureKeys.includes(f.key)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={form.featureKeys.includes(f.key)}
                      onChange={e => {
                        if (e.target.checked) {
                          setForm(prev => ({ ...prev, featureKeys: [...prev.featureKeys, f.key] }));
                        } else {
                          setForm(prev => ({ ...prev, featureKeys: prev.featureKeys.filter(k => k !== f.key) }));
                        }
                      }}
                      style={{ marginTop: '0.15rem', accentColor: '#CC0000' }}
                    />
                    <div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFF' }}>
                        {f.label}
                      </div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.7rem', color: '#888', lineHeight: 1.3 }}>
                        {f.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            {error && <p style={{ color: '#CC0000', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={btnSecondaryStyle} disabled={saving}>Cancelar</button>
              <button onClick={handleSave} style={btnPrimaryStyle} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Confirmação de exclusão */}
      {confirmDel && (
        <Overlay onClick={() => setConfirmDel(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '0.75rem' }}>Confirmar exclusão</h2>
            <p style={{ color: '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Tem certeza que deseja excluir o plano <strong style={{ color: '#FFF' }}>{confirmDel.name}</strong>?
              {confirmDel.isActive !== false && (
                <span style={{ display: 'block', color: '#E87722', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  ⚠️ Desative o plano antes de excluir para evitar cobranças em novas assinaturas.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={btnSecondaryStyle}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)} style={{ ...btnPrimaryStyle, background: '#CC0000' }}>Excluir</button>
            </div>
          </div>
        </Overlay>
      )}
    </motion.div>
  );
}

function Overlay({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: '1rem',
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
        {label}{required && <span style={{ color: '#CC0000' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '1.5rem',
  color: '#FFF',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: '#555',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #333',
  color: '#FFF',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  padding: '0.55rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #333',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '460px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: '#CC0000',
  color: '#FFF',
  border: 'none',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 800,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: 'none',
  color: '#AAA',
  border: '1px solid #333',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '0.6rem 1.25rem',
  cursor: 'pointer',
};

const btnSmallStyle: React.CSSProperties = {
  background: 'none',
  color: '#888',
  border: '1px solid #333',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '3px 10px',
  cursor: 'pointer',
};
