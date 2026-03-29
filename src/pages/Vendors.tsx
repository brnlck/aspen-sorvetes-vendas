import { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../services/db';
import type { Vendor } from '../types';

import {
  UserPlus, Pencil, Search, Phone, MapPin,
  CreditCard, CheckCircle2, XCircle, Users, Camera, X as XIcon,
} from 'lucide-react';
import './CrudPage.css';

interface VendorFormData {
  name: string;
  cpf: string;
  phone: string;
  address: string;
  status: 'Ativo' | 'Inativo';
  photo: string;
}

const empty: VendorFormData = {
  name: '', cpf: '', phone: '', address: '', status: 'Ativo', photo: '',
};

function formatCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function formatPhone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .slice(0, 16);
}

/** Renders a vendor avatar: photo if available, else initial letter */
export function VendorAvatar({
  vendor,
  size = 36,
  className = 'vendor-avatar',
}: {
  vendor: { name: string; photo?: string };
  size?: number;
  className?: string;
}) {
  if (vendor.photo) {
    return (
      <img
        src={vendor.photo}
        alt={vendor.name}
        className={`${className} vendor-avatar-img`}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className={className}
      style={size !== 36 ? { width: size, height: size, fontSize: size * 0.38 } : undefined}
    >
      {vendor.name[0]?.toUpperCase()}
    </div>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormData>(empty);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVendors = async () => {
    const data = await db.getVendors();
    setVendors(data);
  };

  useEffect(() => {
    async function init() {
      await fetchVendors();
      setLoading(false);
    }
    init();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.cpf.includes(q) ||
      v.phone.includes(q)
    );
  }, [vendors, search]);

  const activeCount = vendors.filter(v => v.status === 'Ativo').length;

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (v: Vendor) => {
    setEditingId(v.id);
    setForm({
      name: v.name, cpf: v.cpf, phone: v.phone,
      address: v.address, status: v.status,
      photo: v.photo ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, cpf: form.cpf.replace(/\D/g, ''), photo: form.photo || undefined };
    if (editingId) {
      await db.updateVendor(editingId, payload);
    } else {
      await db.saveVendor(payload);
    }
    fetchVendors();
    setShowModal(false);
  };

  const toggleStatus = async (v: Vendor) => {
    await db.updateVendor(v.id, { status: v.status === 'Ativo' ? 'Inativo' : 'Ativo' });
    fetchVendors();
  };

  /** Read file as base64 */
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(f => ({ ...f, photo: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFileChange(file ?? null);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="crud-page animate-fade-in">
      <div className="crud-header">
        <div>
          <h1 className="title">Vendedores</h1>
          <p className="subtitle">
            <span className="stat-badge stat-badge--active">{activeCount} ativos</span>
            <span className="stat-badge">{vendors.length} total</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} id="btn-new-vendor">
          <UserPlus size={18} /> Novo Vendedor
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      <div className="glass-panel table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={56} />
            <p>{search ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor cadastrado'}</p>
            {!search && (
              <button className="btn-primary" onClick={openCreate}>
                Cadastrar primeiro vendedor
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Endereço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="vendor-cell">
                        <VendorAvatar vendor={v} size={36} className="vendor-avatar" />
                        <span className="vendor-name">{v.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <CreditCard size={14} className="cell-icon" />
                        {v.cpf || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <Phone size={14} className="cell-icon" />
                        {v.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <MapPin size={14} className="cell-icon" />
                        <span className="cell-truncate">{v.address || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className={`badge ${v.status === 'Ativo' ? 'active' : 'inactive'} badge-btn`}
                        onClick={() => toggleStatus(v)}
                        title="Clique para alternar status"
                      >
                        {v.status === 'Ativo' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {v.status}
                      </button>
                    </td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(v)}>
                        <Pencil size={14} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--vendor" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? 'Editar Vendedor' : 'Novo Vendedor'}
              </h2>
            </div>
            <div className="modal-body">

              {/* ── Photo upload ── */}
              <div className="photo-upload-section">
                <div
                  className={`photo-drop-zone ${form.photo ? 'photo-drop-zone--has-photo' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  {form.photo ? (
                    <>
                      <img src={form.photo} alt="Foto" className="photo-preview" />
                      <div className="photo-overlay">
                        <Camera size={22} />
                        <span>Trocar foto</span>
                      </div>
                    </>
                  ) : (
                    <div className="photo-placeholder">
                      <Camera size={28} />
                      <span>Clique ou arraste uma foto</span>
                      <small>JPG, PNG • max 2MB</small>
                    </div>
                  )}
                </div>
                {form.photo && (
                  <button
                    className="photo-remove-btn"
                    onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, photo: '' })); }}
                    title="Remover foto"
                  >
                    <XIcon size={14} /> Remover foto
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'Ativo' | 'Inativo' }))}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>
                {editingId ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
