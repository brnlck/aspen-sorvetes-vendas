import { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import type { Product } from '../types';
import {
  PackagePlus, Pencil, Search, IceCream2, DollarSign,
  TrendingUp, CheckCircle2, XCircle
} from 'lucide-react';
import './CrudPage.css';

interface ProductFormData {
  name: string;
  priceFactory: string;
  profitVendor: string;
  status: 'Ativo' | 'Inativo';
}

const empty: ProductFormData = {
  name: '', priceFactory: '', profitVendor: '', status: 'Ativo'
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(empty);

  const fetchProducts = async () => {
    const data = await db.getProducts();
    setProducts(data);
  };

  useEffect(() => {
    async function init() {
      await fetchProducts();
      setLoading(false);
    }
    init();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const activeCount = products.filter(p => p.status === 'Ativo').length;

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      priceFactory: String(p.priceFactory),
      profitVendor: String(p.profitVendor),
      status: p.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      priceFactory: parseFloat(form.priceFactory) || 0,
      profitVendor: parseFloat(form.profitVendor) || 0,
      status: form.status,
    };
    if (editingId) {
      await db.updateProduct(editingId, data);
    } else {
      await db.saveProduct(data);
    }
    fetchProducts();
    setShowModal(false);
  };

  const toggleStatus = async (p: Product) => {
    await db.updateProduct(p.id, { status: p.status === 'Ativo' ? 'Inativo' : 'Ativo' });
    fetchProducts();
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="crud-page animate-fade-in">
      <div className="crud-header">
        <div>
          <h1 className="title">Produtos</h1>
          <p className="subtitle">
            <span className="stat-badge stat-badge--active">{activeCount} ativos</span>
            <span className="stat-badge">{products.length} total</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} id="btn-new-product">
          <PackagePlus size={18} /> Novo Produto
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="glass-panel table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <IceCream2 size={56} />
            <p>{search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço Fábrica (Aspen)</th>
                  <th>Ganho Vendedor</th>
                  <th>Preço Total</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="vendor-cell">
                        <div className="product-icon">
                          <IceCream2 size={18} />
                        </div>
                        <span className="vendor-name">{p.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <DollarSign size={14} className="cell-icon" />
                        <span className="price-factory">{formatCurrency(p.priceFactory)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-with-icon">
                        <TrendingUp size={14} className="cell-icon" />
                        <span className="price-profit">{formatCurrency(p.profitVendor)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="price-total">
                        {formatCurrency(p.priceFactory + p.profitVendor)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`badge ${p.status === 'Ativo' ? 'active' : 'inactive'} badge-btn`}
                        onClick={() => toggleStatus(p)}
                        title="Clique para alternar"
                      >
                        {p.status === 'Ativo' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {p.status}
                      </button>
                    </td>
                    <td>
                      <button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h2>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome do Produto *</label>
                <input
                  type="text"
                  placeholder="Ex: Base Leite, Skimo, Premium..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Preço Fábrica (Aspen) R$</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.priceFactory}
                    onChange={e => setForm(f => ({ ...f, priceFactory: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ganho Vendedor R$</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.profitVendor}
                    onChange={e => setForm(f => ({ ...f, profitVendor: e.target.value }))}
                  />
                </div>
              </div>
              {(form.priceFactory || form.profitVendor) && (
                <div className="price-preview">
                  <span>Preço total ao consumidor:</span>
                  <strong>
                    {((parseFloat(form.priceFactory) || 0) + (parseFloat(form.profitVendor) || 0))
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              )}
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
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>
                {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
