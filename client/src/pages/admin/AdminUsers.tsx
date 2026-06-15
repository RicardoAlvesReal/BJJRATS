// BJJRats — Admin Users Management

import { useEffect, useState, useCallback } from 'react';
import api, { type AdminUser } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HIERARCHY } from '@/lib/roleHierarchy';
import { RoleBadge } from './AdminDashboard';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  belt: string;
  phone: string;
  academy: string;
  academyName: string;
  academyAddress: string;
  academyCity: string;
  academyState: string;
  academyCnpj: string;
  academyCep: string;
  academyNumber: string;
  academyNeighborhood: string;
  academyComplement: string;
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'student', belt: 'Branca', phone: '', academy: '', academyName: '', academyAddress: '', academyCity: '', academyState: '', academyCnpj: '', academyCep: '', academyNumber: '', academyNeighborhood: '', academyComplement: '' };

const BELTS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const myRole = me?.role ?? 'student';
  const myLevel = ROLE_HIERARCHY[myRole] ?? 1;

  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [form, setForm]             = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const fetchCities = useCallback(async (uf: string) => {
    if (!uf) { setCities([]); return; }
    setCitiesLoading(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const data = await res.json();
      setCities(data.map((m: any) => m.nome).sort());
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const lookupCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          academyAddress: data.logradouro || f.academyAddress,
          academyCity: data.localidade || f.academyCity,
          academyState: data.uf || f.academyState,
          academyNeighborhood: data.bairro || f.academyNeighborhood,
        }));
        if (data.uf) fetchCities(data.uf);
      }
    } catch {
      // silencioso
    } finally {
      setCepLoading(false);
    }
  }, []);

  const load = () => {
    setLoading(true);
    api.admin.listUsers()
      .then(({ users: list }) => setUsers(list))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Roles que este usuário pode criar/atribuir
  const creatableRoles = Object.entries(ROLE_HIERARCHY)
    .filter(([role, lvl]) => role !== 'admin' && lvl < myLevel)
    .map(([r]) => r);

  const q = search.toLowerCase();
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    (u.academy || '').toLowerCase().includes(q) ||
    (u.academyName || '').toLowerCase().includes(q) ||
    (u.academyCity || '').toLowerCase().includes(q)
  );

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditTarget(u);
    const academyRole = u.role === 'academy' || u.role === 'admin' || u.isAcademyAdmin === true;
    setForm({ name: u.name, email: u.email, password: '', role: academyRole ? 'academy' : u.role ?? 'student', belt: u.belt ?? 'Branca', phone: u.phone ?? '', academy: u.academy ?? '', academyName: u.academyName ?? '', academyAddress: u.academyAddress ?? '', academyCity: u.academyCity ?? '', academyState: u.academyState ?? '', academyCnpj: u.academyCnpj ?? '', academyCep: u.academyCep ?? '', academyNumber: u.academyNumber ?? '', academyNeighborhood: u.academyNeighborhood ?? '', academyComplement: u.academyComplement ?? '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!editTarget && !form.password.trim()) {
      setError('Senha é obrigatória para novos usuários.');
      return;
    }
    setSaving(true);
    try {
      const academyFields = {
        academyName: form.academyName, academyAddress: form.academyAddress,
        academyCity: form.academyCity, academyState: form.academyState,
        academyCnpj: form.academyCnpj, academyCep: form.academyCep, academyNumber: form.academyNumber,
        academyNeighborhood: form.academyNeighborhood, academyComplement: form.academyComplement,
        academy: form.academy,
        isAcademyAdmin: form.role === 'academy',
      };
      if (editTarget) {
        const payload: Record<string, unknown> = { name: form.name, belt: form.belt, phone: form.phone, role: form.role, ...academyFields };
        if (form.password) payload.password = form.password;
        await api.admin.updateUser(editTarget.uid, payload);
      } else {
        await api.admin.createUser({
          name: form.name, email: form.email, password: form.password,
          role: form.role, belt: form.belt, phone: form.phone || undefined,
          ...academyFields,
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

  const handleDelete = async (u: AdminUser) => {
    try {
      await api.admin.deleteUser(u.uid);
      setConfirmDel(null);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao deletar.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={headingStyle}>Usuários</h1>
        <button onClick={openCreate} style={btnPrimaryStyle}>+ Novo usuário</button>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      {/* Tabela */}
      {loading ? (
        <p style={mutedStyle}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p style={mutedStyle}>Nenhum usuário encontrado.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Barlow Condensed, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #CC0000' }}>
                {['Nome', 'E-mail', 'Role', 'Mod', 'Trial', 'Faixa', 'Academia', 'Ações'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid} style={{ borderBottom: '1px solid #1A1A1A' }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>{u.email}</td>
                  <td style={tdStyle}><RoleBadge role={u.role} /></td>
                  <td style={tdStyle}>
                    {u.communityModerator ? (
                      <span style={{ color: '#00CC00', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                    ) : (
                      <span style={{ color: '#555', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {u.trialEndsAt && new Date(u.trialEndsAt) > new Date() ? (
                      <span style={{ color: '#3B82F6', fontSize: '0.7rem', fontWeight: 700 }}>
                        {Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000)}d
                      </span>
                    ) : (
                      <span style={{ color: '#555', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#AAA' }}>{u.belt ?? '—'}</td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8rem' }}>{u.academyName || u.academy || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {me?.role === 'superadmin' && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await api.admin.toggleModerator(u.uid);
                                load();
                              } catch (e: any) {
                                alert(e?.message ?? 'Erro ao alternar moderador.');
                              }
                            }}
                            style={{
                              ...btnSmallStyle,
                              color: u.communityModerator ? '#CC0000' : '#00CC00',
                              borderColor: u.communityModerator ? '#CC000066' : '#00CC0066',
                            }}
                          >
                            {u.communityModerator ? 'Remover Mod' : 'Tornar Mod'}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.admin.giveTrial(u.uid);
                                load();
                              } catch (e: any) {
                                alert(e?.message ?? 'Erro ao conceder trial.');
                              }
                            }}
                            style={{
                              ...btnSmallStyle,
                              color: '#3B82F6',
                              borderColor: '#3B82F666',
                            }}
                          >
                            {u.trialEndsAt && new Date(u.trialEndsAt) > new Date() ? 'Renovar Trial' : '30 dias grátis'}
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(u)} style={btnSmallStyle}>Editar</button>
                      <button onClick={() => setConfirmDel(u)} style={{ ...btnSmallStyle, color: '#CC0000', borderColor: '#CC000066' }}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <Overlay onClick={() => setModalOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editTarget ? 'Editar usuário' : 'Novo usuário'}
            </h2>

            <Field label="Nome" required>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="E-mail" required>
              <input style={inputStyle} value={form.email} disabled={!!editTarget}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={editTarget ? 'Nova senha (deixe em branco para manter)' : 'Senha'} required={!editTarget}>
              <input type="password" style={inputStyle} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <Field label="Role">
              <select style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                ))}
                {/* Se editando um usuário existente com role igual ao meu, mostra como desabilitado */}
                {editTarget && !creatableRoles.includes(form.role) && (
                  <option value={form.role} disabled>{ROLE_LABEL[form.role] ?? form.role}</option>
                )}
              </select>
            </Field>
            {form.role !== 'academy' && (
              <Field label="Faixa">
                <select style={inputStyle} value={form.belt} onChange={(e) => setForm((f) => ({ ...f, belt: e.target.value }))}>
                  {BELTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            )}
            <Field label="Telefone">
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>

            {form.role === 'academy' || form.role === 'professor' ? (
              <>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.7rem', color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid #2A2A2A', paddingTop: '0.75rem' }}>DADOS DA ACADEMIA</p>
                <Field label="Nome da Academia">
                  <input style={inputStyle} value={form.academyName} onChange={(e) => setForm((f) => ({ ...f, academyName: e.target.value }))} />
                </Field>
                <Field label="CNPJ">
                  <input style={inputStyle} value={form.academyCnpj} onChange={(e) => setForm((f) => ({ ...f, academyCnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                </Field>
                <Field label="CEP">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={form.academyCep}
                      onChange={(e) => setForm((f) => ({ ...f, academyCep: e.target.value }))}
                      onBlur={() => lookupCep(form.academyCep)}
                      placeholder="00000-000" />
                    {cepLoading && <span style={{ color: '#888', fontSize: '0.7rem' }}>buscando...</span>}
                  </div>
                </Field>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 2 }}>
                    <Field label="Endereço">
                      <input style={inputStyle} value={form.academyAddress} onChange={(e) => setForm((f) => ({ ...f, academyAddress: e.target.value }))} placeholder="Rua, Avenida..." />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Número">
                      <input style={inputStyle} value={form.academyNumber} onChange={(e) => setForm((f) => ({ ...f, academyNumber: e.target.value }))} placeholder="Nº" />
                    </Field>
                  </div>
                </div>
                <Field label="Bairro">
                  <input style={inputStyle} value={form.academyNeighborhood} onChange={(e) => setForm((f) => ({ ...f, academyNeighborhood: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 2 }}>
                    <Field label="Cidade">
                      <select style={inputStyle} value={form.academyCity} onChange={(e) => setForm((f) => ({ ...f, academyCity: e.target.value }))}>
                        <option value="">SELECIONE A CIDADE</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {citiesLoading && <span style={{ color: '#888', fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}>carregando cidades...</span>}
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Estado">
                      <select style={inputStyle} value={form.academyState}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, academyState: e.target.value, academyCity: '' }));
                          fetchCities(e.target.value);
                        }}
                      >
                        <option value="">UF</option>
                        {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
                <Field label="Complemento">
                  <input style={inputStyle} value={form.academyComplement} onChange={(e) => setForm((f) => ({ ...f, academyComplement: e.target.value }))} placeholder="Sala, bloco..." />
                </Field>
              </>
            ) : null}

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
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '0.75rem' }}>Confirmar exclusão</h2>
            <p style={{ color: '#AAA', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Tem certeza que deseja excluir <strong style={{ color: '#FFF' }}>{confirmDel.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={btnSecondaryStyle}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)} style={{ ...btnPrimaryStyle, background: '#CC0000' }}>Excluir</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
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

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  academy:    'Academia',
  admin:      'Academia',
  professor:  'Professor',
  student:    'Aluno',
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
  marginBottom: '0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  fontSize: '0.7rem',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  padding: '0.6rem 0.75rem',
  textAlign: 'left',
  background: '#111',
};

const tdStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: '0.9rem',
  color: '#CCC',
  padding: '0.7rem 0.75rem',
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
