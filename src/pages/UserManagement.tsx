import { useState, useEffect } from 'react';
import { Plus, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Profile, Role } from '../contexts/AuthContext';
import type { Vendor } from '../types';
import './UserManagement.css';

export default function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('OPERADOR');
  const [formVendorId, setFormVendorId] = useState<string>('');
  
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: vendorsData } = await supabase.from('vendors').select('*').order('name');
    
    if (profilesData) setProfiles(profilesData);
    if (vendorsData) setVendors(vendorsData);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let finalEmail = formEmail.trim();

      if (formRole === 'VENDEDOR') {
        if (!formCpf) throw new Error('Para Vendedor, inform o CPF.');
        if (!formVendorId) throw new Error('Para Vendedor, selecione a conta de Vendedor associada.');
        // Auto convert CPF to internal email
        finalEmail = `${formCpf.replace(/\D/g, '')}@aspensorvetes.com`;
      } else {
        if (!finalEmail) throw new Error('Informe um e-mail válido para este cargo.');
      }

      const { error: rpcError } = await supabase.rpc('admin_create_user', {
        p_email: finalEmail,
        p_password: formPassword,
        p_role: formRole,
        p_name: formName,
        p_cpf: formRole === 'VENDEDOR' ? formCpf : null,
        p_vendor_id: formRole === 'VENDEDOR' ? formVendorId : null
      });

      if (rpcError) throw rpcError;

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormCpf('');
    setFormPassword('');
    setFormRole('OPERADOR');
    setFormVendorId('');
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <ShieldCheck className="page-title-icon" />
          Gerenciamento de Usuários
        </h1>
        <p className="page-subtitle">Crie acessos para operadores e vendedores</p>
      </div>

      <div className="user-management-actions">
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Novo Usuário
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>Novo Usuário</h3>
            <button className="btn-icon" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={20} />
            </button>
          </div>
          {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
          <form onSubmit={handleCreateUser} className="crud-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input required type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cargo (Role)</label>
                <select className="form-control" value={formRole} onChange={e => setFormRole(e.target.value as Role)}>
                  <option value="OPERADOR">Operador (Acesso às Vendas)</option>
                  <option value="VENDEDOR">Vendedor (Somente Leitura)</option>
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                </select>
              </div>

              {formRole === 'VENDEDOR' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">CPF (Login do Vendedor)</label>
                    <input required type="text" className="form-control" value={formCpf} onChange={e => setFormCpf(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Conta do Vendedor</label>
                    <select required className="form-control" value={formVendorId} onChange={e => setFormVendorId(e.target.value)}>
                      <option value="">Selecione...</option>
                      {vendors.map(v => (
                         <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">E-mail (Login)</label>
                  <input required type="email" className="form-control" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="usuario@email.com" />
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Senha Inicial</label>
                <input required type="password" className="form-control" value={formPassword} onChange={e => setFormPassword(e.target.value)} />
              </div>
            </div>
            <div className="crud-form-actions">
               <button type="button" className="btn-outlined" onClick={() => setShowForm(false)}>Cancelar</button>
               <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar Usuário'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td>{p.name || '-'}</td>
                  <td>{p.role === 'VENDEDOR' ? p.cpf : p.email}</td>
                  <td>
                    <span className={`role-badge ${p.role.toLowerCase()}`}>{p.role}</span>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center' }}>Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
