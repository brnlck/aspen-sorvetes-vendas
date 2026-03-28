import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import type { Comanda, ComandaItem, Payment, PaymentMethod, Product } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft, Plus, Trash2, Save, Lock, Unlock,
  DollarSign, CreditCard, Smartphone, Banknote,
  TrendingUp, Package, CheckCircle, AlertCircle,
  SunMedium, Sunset, Calculator, AlertTriangle, RefreshCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { VendorAvatar } from './Vendors';
import './ComandaForm.css';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'Dinheiro', label: 'Dinheiro', icon: <Banknote size={16} /> },
  { value: 'PIX',      label: 'PIX',      icon: <Smartphone size={16} /> },
  { value: 'Crédito',  label: 'Crédito',  icon: <CreditCard size={16} /> },
  { value: 'Débito',   label: 'Débito',   icon: <CreditCard size={16} /> },
];

export default function ComandaForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const vendors     = useMemo(() => db.getVendors().filter(v => v.status === 'Ativo'), []);
  const allProducts = useMemo(() => db.getProducts().filter(p => p.status === 'Ativo'), []);

  // ── Form state ──
  const [vendorId,  setVendorId]  = useState('');
  const [date,      setDate]      = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items,     setItems]     = useState<ComandaItem[]>([]);
  const [discount,  setDiscount]  = useState(0);
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [status,    setStatus]    = useState<'Aberta' | 'Fechada'>('Aberta');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [tab,       setTab]       = useState<'morning' | 'settlement'>('morning');

  // ── Local string state for reposition inputs (allows clearing/correcting) ──
  const [repositionDraft, setRepositionDraft] = useState<Record<string, string>>({});

  // ── Dialogs ──
  const [showCloseConfirm,  setShowCloseConfirm]  = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // ── New payment form ──
  const [newPayMethod, setNewPayMethod] = useState<PaymentMethod>('Dinheiro');
  const [newPayAmount, setNewPayAmount] = useState('');

  // ── Load existing comanda ──
  useEffect(() => {
    if (!isNew && id) {
      const c = db.getComandaById(id);
      if (c) {
        setVendorId(c.vendorId);
        setDate(c.date);
        setItems(c.items);
        setDiscount(c.discount);
        setPayments(c.payments);
        setStatus(c.status);
        // Pre-fill reposition drafts from saved data
        const drafts: Record<string, string> = {};
        c.items.forEach(i => { drafts[i.id] = i.quantityReposition > 0 ? String(i.quantityReposition) : ''; });
        setRepositionDraft(drafts);
        if (c.items.some(i => i.quantityReturn > 0)) setTab('settlement');
      }
    }
  }, [id, isNew]);

  // ── Initialize items when vendor selected (new comanda) ──
  const initializeItems = (vid: string) => {
    setVendorId(vid);
    if (isNew) {
      setItems(allProducts.map(p => ({
        id: uuidv4(),
        productId: p.id,
        quantityOut: 0,
        quantityReposition: 0,
        quantityReturn: 0,
        priceFactoryFrozen: p.priceFactory,
        profitVendorFrozen: p.profitVendor,
      })));
    }
  };

  const addProduct = (product: Product) => {
    if (items.find(i => i.productId === product.id)) return;
    setItems(prev => [...prev, {
      id: uuidv4(),
      productId: product.id,
      quantityOut: 0,
      quantityReposition: 0,
      quantityReturn: 0,
      priceFactoryFrozen: product.priceFactory,
      profitVendorFrozen: product.profitVendor,
    }]);
  };

  const removeItem = (itemId: string) =>
    setItems(prev => prev.filter(i => i.id !== itemId));

  const updateItem = (
    itemId: string,
    field: 'quantityOut' | 'quantityReposition' | 'quantityReturn',
    value: number,
  ) => setItems(prev =>
    prev.map(i => i.id === itemId ? { ...i, [field]: Math.max(0, value) } : i)
  );

  // Commit reposition draft string → numeric item state
  const commitReposition = (itemId: string) => {
    const raw = repositionDraft[itemId] ?? '';
    const num = Math.max(0, parseInt(raw, 10) || 0);
    updateItem(itemId, 'quantityReposition', num);
    setRepositionDraft(prev => ({ ...prev, [itemId]: num > 0 ? String(num) : '' }));
  };

  // ── Payments ──
  const addPayment = () => {
    const amount = parseFloat(newPayAmount);
    if (!amount || amount <= 0) return;
    setPayments(prev => [...prev, { id: uuidv4(), method: newPayMethod, amount }]);
    setNewPayAmount('');
  };

  const removePayment = (pid: string) =>
    setPayments(prev => prev.filter(p => p.id !== pid));

  // ── Calculations ──
  // Carga Total = Saída Inicial + Reposição
  // Vendidos    = Carga Total  - Retorno
  const calcs = useMemo(() => {
    const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]));
    let totalSubtotalAspen = 0;
    let totalProfit        = 0;
    let totalQtdVendidos   = 0;

    const itemCalcs = items.map(item => {
      const cargaTotal    = item.quantityOut + item.quantityReposition;
      const vendidos      = Math.max(0, cargaTotal - item.quantityReturn);
      const subtotalAspen = vendidos * item.priceFactoryFrozen;
      const lucroVendedor = vendidos * item.profitVendorFrozen;
      totalSubtotalAspen += subtotalAspen;
      totalProfit        += lucroVendedor;
      totalQtdVendidos   += vendidos;
      return {
        ...item,
        cargaTotal,
        vendidos,
        subtotalAspen,
        lucroVendedor,
        productName: productMap[item.productId]?.name ?? '?',
      };
    });

    const totalWithDiscount = totalSubtotalAspen - discount;
    const totalPaid         = payments.reduce((s, p) => s + p.amount, 0);
    const saldoDevedor      = totalWithDiscount - totalPaid;

    return {
      itemCalcs,
      totalSubtotalAspen,
      totalProfit,
      totalQtdVendidos,
      totalWithDiscount,
      totalPaid,
      saldoDevedor,
    };
  }, [items, discount, payments, allProducts]);

  // ── Save ──
  const handleSave = async (closeIt = false) => {
    if (!vendorId) return;
    setSaving(true);

    const comandaData: Omit<Comanda, 'id' | 'createdAt'> = {
      vendorId,
      date,
      items,
      discount,
      payments,
      status: closeIt ? 'Fechada' : status,
      ...(closeIt ? { closedAt: new Date().toISOString() } : {}),
    };

    if (isNew) {
      const c = db.saveComanda(comandaData);
      setSaved(true);
      setTimeout(() => navigate(`/comandas/${c.id}`), 600);
    } else if (id) {
      db.updateComanda(id, comandaData);
      setSaved(true);
      if (closeIt) {
        setTimeout(() => navigate('/comandas'), 600);
      } else {
        setTimeout(() => setSaved(false), 2000);
      }
    }

    setSaving(false);
  };

  // ── Reopen ──
  const handleReopen = () => {
    if (!id) return;
    db.updateComanda(id, { status: 'Aberta', closedAt: undefined });
    setStatus('Aberta');
    setShowReopenConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isClosed = status === 'Fechada';
  const vendor = vendors.find(v => v.id === vendorId);
  const availableProducts = allProducts.filter(p => !items.find(i => i.productId === p.id));

  return (
    <div className="comanda-form animate-fade-in">

      {/* ── CLOSE CONFIRM ── */}
      {showCloseConfirm && (
        <div className="confirm-overlay" onClick={() => setShowCloseConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon confirm-icon--warning"><AlertTriangle size={28} /></div>
            <h3 className="confirm-title">Fechar esta comanda?</h3>
            <p className="confirm-desc">
              Após fechar, a comanda ficará <strong>bloqueada para edição</strong>.
              Certifique-se de que o retorno e os pagamentos foram lançados corretamente.
            </p>
            <div className="confirm-summary">
              <div className="confirm-row">
                <span>Total Fábrica</span>
                <strong>{formatCurrency(calcs.totalSubtotalAspen)}</strong>
              </div>
              <div className="confirm-row">
                <span>Total Pago</span>
                <strong>{formatCurrency(calcs.totalPaid)}</strong>
              </div>
              <div className={`confirm-row confirm-row--saldo ${calcs.saldoDevedor > 0.005 ? 'saldo-danger' : 'saldo-success'}`}>
                <span>Saldo Devedor</span>
                <strong>{formatCurrency(Math.max(0, calcs.saldoDevedor))}</strong>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setShowCloseConfirm(false)}>
                Cancelar
              </button>
              <button
                className="btn-close-comanda"
                onClick={() => { setShowCloseConfirm(false); handleSave(true); }}
              >
                <Lock size={16} /> Sim, fechar comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REOPEN CONFIRM ── */}
      {showReopenConfirm && (
        <div className="confirm-overlay" onClick={() => setShowReopenConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon confirm-icon--reopen"><RefreshCcw size={28} /></div>
            <h3 className="confirm-title">Reabrir esta comanda?</h3>
            <p className="confirm-desc">
              A comanda voltará para <strong>Aberta</strong> e todos os dados serão mantidos.
            </p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setShowReopenConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-reopen" onClick={handleReopen}>
                <Unlock size={16} /> Sim, reabrir comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="form-topbar">
        <button className="btn-secondary" onClick={() => navigate('/comandas')}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="form-title-area">
          {!isNew && vendor && (
            <VendorAvatar vendor={vendor} size={40} className="vendor-avatar" />
          )}
          <div>
            <h1 className="title" style={{ marginBottom: 0, lineHeight: 1.2 }}>
              {isNew ? 'Nova Comanda' : vendor?.name ?? 'Carregando...'}
            </h1>
            {!isNew && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span className={`badge ${isClosed ? 'closed' : 'open'}`} style={{ fontSize: '0.7rem' }}>
                  {isClosed ? <Lock size={11} /> : <Unlock size={11} />}
                  {isClosed ? 'Fechada' : 'Aberta'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="form-actions">
          {isClosed && !isNew && (
            <button className="btn-reopen" onClick={() => setShowReopenConfirm(true)}>
              <Unlock size={18} /> Reabrir Comanda
            </button>
          )}
          {!isClosed && (
            <>
              <button
                className={`btn-secondary ${saving ? 'btn--loading' : ''}`}
                onClick={() => handleSave(false)}
                disabled={!vendorId || saving}
              >
                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
              {!isNew && (
                <button
                  className="btn-close-comanda"
                  onClick={() => setShowCloseConfirm(true)}
                  disabled={saving}
                >
                  <Lock size={18} /> Fechar Comanda
                </button>
              )}
            </>
          )}
        </div>
        {saved && (
          <div className="save-feedback">
            <CheckCircle size={18} /> Salvo!
          </div>
        )}
      </div>

      {/* ── CLOSED BANNER ── */}
      {isClosed && (
        <div className="closed-banner">
          <Lock size={16} />
          <span>Esta comanda está <strong>fechada</strong>. Clique em <strong>Reabrir Comanda</strong> para editar.</span>
        </div>
      )}

      {/* ── BASIC INFO ── */}
      <div className="glass-panel basic-info-panel">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Vendedor *</label>
            <select
              value={vendorId}
              onChange={e => initializeItems(e.target.value)}
              disabled={!isNew && !!vendorId}
            >
              <option value="">Selecione o vendedor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={!isNew}
            />
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      {vendorId && (
        <>
          <div className="comanda-tabs">
            <button
              className={`comanda-tab ${tab === 'morning' ? 'comanda-tab--active' : ''}`}
              onClick={() => setTab('morning')}
            >
              <SunMedium size={18} /> Manhã — Saída
            </button>
            <button
              className={`comanda-tab ${tab === 'settlement' ? 'comanda-tab--active' : ''}`}
              onClick={() => setTab('settlement')}
            >
              <Sunset size={18} /> Tarde — Acerto
            </button>
          </div>

          {/* ════════ MORNING TAB ════════ */}
          {tab === 'morning' && (
            <div className="glass-panel">
              <div className="items-header">
                <div className="items-header-left">
                  <SunMedium size={20} className="tab-icon-morning" />
                  <div>
                    <h3>Saída de Produtos</h3>
                    <p className="items-subtitle">
                      Carga Total = Saída Inicial + Reposição
                    </p>
                  </div>
                </div>
                {!isClosed && availableProducts.length > 0 && (
                  <div className="add-product-dropdown">
                    <select
                      onChange={e => {
                        const p = allProducts.find(p => p.id === e.target.value);
                        if (p) addProduct(p);
                        e.target.value = '';
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Adicionar produto</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="items-empty">
                  <Package size={40} />
                  <p>Selecione um vendedor para carregar os produtos</p>
                </div>
              ) : (
                <div className="items-table-wrap">
                  <table className="items-table items-table--morning">
                    <thead>
                      <tr>
                        <th className="col-product">Produto</th>
                        <th className="col-price">Preço Fábrica</th>
                        <th className="col-qty">Saída Inicial</th>
                        <th className="col-qty col-reposition">Reposição</th>
                        <th className="col-qty col-total">Carga Total</th>
                        <th className="col-action"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const name = allProducts.find(p => p.id === item.productId)?.name ?? item.productId;
                        const cargaTotal = item.quantityOut + item.quantityReposition;
                        const repDraft = repositionDraft[item.id] ?? (item.quantityReposition > 0 ? String(item.quantityReposition) : '');
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="item-name">
                                <div className="product-icon"><Package size={15} /></div>
                                {name}
                              </div>
                            </td>
                            <td className="price-col">{formatCurrency(item.priceFactoryFrozen)}</td>
                            <td>
                              <input
                                type="number" min={0}
                                value={item.quantityOut === 0 ? '' : item.quantityOut}
                                placeholder="0"
                                className="qty-input"
                                disabled={isClosed}
                                onChange={e => updateItem(item.id, 'quantityOut', parseInt(e.target.value, 10) || 0)}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min={0}
                                value={repDraft}
                                placeholder="0"
                                className="qty-input qty-input--reposition"
                                disabled={isClosed}
                                onChange={e => setRepositionDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onBlur={() => commitReposition(item.id)}
                              />
                            </td>
                            <td>
                              <span className={`carga-total-badge ${cargaTotal > 0 ? 'carga-positive' : 'carga-zero'}`}>
                                {cargaTotal}
                              </span>
                            </td>
                            <td>
                              {!isClosed && (
                                <button
                                  className="btn-icon-danger"
                                  onClick={() => removeItem(item.id)}
                                  title="Remover item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Morning summary */}
              <div className="items-summary morning-summary">
                <div className="summary-stat">
                  <span>Saída Inicial:</span>
                  <strong>{items.reduce((s, i) => s + i.quantityOut, 0)} un</strong>
                </div>
                <div className="summary-stat">
                  <span>+ Reposição:</span>
                  <strong className="reposition-total">
                    {items.reduce((s, i) => s + i.quantityReposition, 0)} un
                  </strong>
                </div>
                <div className="summary-stat summary-stat--highlight">
                  <span>= Carga Total:</span>
                  <strong>
                    {items.reduce((s, i) => s + i.quantityOut + i.quantityReposition, 0)} un
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ════════ SETTLEMENT TAB ════════ */}
          {tab === 'settlement' && (
            <div className="settlement-layout">
              <div className="glass-panel">
                <div className="items-header">
                  <div className="items-header-left">
                    <Sunset size={20} className="tab-icon-evening" />
                    <div>
                      <h3>Retorno e Vendidos (Tarde)</h3>
                      <p className="items-subtitle">
                        Vendidos = (Saída + Reposição) − Retorno
                      </p>
                    </div>
                  </div>
                </div>

                <div className="items-table-wrap">
                  <table className="items-table items-table--settlement">
                    <thead>
                      <tr>
                        <th className="col-product">Produto</th>
                        <th className="col-qty col-align-center">Saída</th>
                        <th className="col-qty col-align-center col-reposition">Reposição</th>
                        <th className="col-qty col-align-center col-total">Carga Total</th>
                        <th className="col-qty col-align-center">Retorno</th>
                        <th className="col-qty col-align-center">Vendidos</th>
                        <th className="col-price">Subtotal</th>
                        <th className="col-price">Lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcs.itemCalcs.map(item => (
                        <tr key={item.id} className={item.vendidos === 0 ? 'row-zero' : ''}>
                          <td>
                            <div className="item-name">
                              <div className="product-icon"><Package size={15} /></div>
                              {item.productName}
                            </div>
                          </td>
                          <td className="qty-display col-align-center">{item.quantityOut}</td>
                          <td className="qty-display col-align-center reposition-col">
                            {item.quantityReposition > 0
                              ? <span className="qty-reposition-badge">+{item.quantityReposition}</span>
                              : <span className="text-muted">—</span>
                            }
                          </td>
                          <td className="qty-display col-align-center total-col">
                            <strong>{item.cargaTotal}</strong>
                          </td>
                          <td className="col-align-center">
                            <input
                              type="number" min={0} max={item.cargaTotal}
                              value={item.quantityReturn === 0 ? '' : item.quantityReturn}
                              placeholder="0"
                              className="qty-input"
                              disabled={isClosed}
                              onChange={e => updateItem(item.id, 'quantityReturn', parseInt(e.target.value, 10) || 0)}
                            />
                          </td>
                          <td className="col-align-center">
                            <span className={`vendidos-badge ${item.vendidos > 0 ? 'vendidos-positive' : 'vendidos-zero'}`}>
                              {item.vendidos}
                            </span>
                          </td>
                          <td className="price-col">{formatCurrency(item.subtotalAspen)}</td>
                          <td className="profit-col">{formatCurrency(item.lucroVendedor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="totals-row">
                        <td colSpan={5}><strong>TOTAIS</strong></td>
                        <td className="col-align-center"><strong>{calcs.totalQtdVendidos}</strong></td>
                        <td><strong>{formatCurrency(calcs.totalSubtotalAspen)}</strong></td>
                        <td className="profit-col"><strong>{formatCurrency(calcs.totalProfit)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── Financial panel ── */}
              <div className="settlement-right">
                {/* Discount */}
                <div className="glass-panel">
                  <div className="settlement-section-title">
                    <Calculator size={18} /> Fechamento Financeiro
                  </div>
                  <div className="financial-rows">
                    <div className="financial-row">
                      <span>Subtotal Fábrica</span>
                      <span>{formatCurrency(calcs.totalSubtotalAspen)}</span>
                    </div>
                    <div className="financial-row discount-row">
                      <label>Desconto</label>
                      <div className="discount-input-wrap">
                        <span className="discount-symbol">R$</span>
                        <input
                          type="number" min={0} step="0.01" placeholder="0,00"
                          value={discount || ''}
                          disabled={isClosed}
                          onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                          className="discount-input"
                        />
                      </div>
                    </div>
                    <div className="financial-row total-row">
                      <span>Total c/ Desconto</span>
                      <span>{formatCurrency(calcs.totalWithDiscount)}</span>
                    </div>
                  </div>
                </div>

                {/* Payments */}
                <div className="glass-panel">
                  <div className="settlement-section-title">
                    <DollarSign size={18} /> Pagamentos
                  </div>

                  {!isClosed && (
                    <div className="add-payment-form">
                      <div className="payment-method-btns">
                        {PAYMENT_METHODS.map(m => (
                          <button
                            key={m.value}
                            className={`pay-method-btn ${newPayMethod === m.value ? 'pay-method-btn--active' : ''}`}
                            onClick={() => setNewPayMethod(m.value)}
                          >
                            {m.icon} {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="add-payment-row">
                        <div className="discount-input-wrap">
                          <span className="discount-symbol">R$</span>
                          <input
                            type="number" min={0} step="0.01" placeholder="Valor"
                            value={newPayAmount}
                            onChange={e => setNewPayAmount(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addPayment()}
                            className="discount-input"
                          />
                        </div>
                        <button className="btn-primary btn-add-pay" onClick={addPayment}>
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {payments.length > 0 ? (
                    <div className="payment-list">
                      {payments.map(p => (
                        <div key={p.id} className="payment-item">
                          <div className="payment-method-tag">
                            {PAYMENT_METHODS.find(m => m.value === p.method)?.icon}
                            {p.method}
                          </div>
                          <div className="payment-amount">{formatCurrency(p.amount)}</div>
                          {!isClosed && (
                            <button className="btn-icon-danger" onClick={() => removePayment(p.id)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="payments-empty">Nenhum pagamento registrado</p>
                  )}

                  <div className="payment-total-row">
                    <span>Total Pago</span>
                    <strong>{formatCurrency(calcs.totalPaid)}</strong>
                  </div>
                </div>

                {/* Saldo */}
                <div className={`saldo-card ${calcs.saldoDevedor > 0.005 ? 'saldo-card--debt' : 'saldo-card--ok'}`}>
                  {calcs.saldoDevedor > 0.005 ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                  <div>
                    <div className="saldo-label">Saldo Devedor</div>
                    <div className="saldo-value">{formatCurrency(Math.max(0, calcs.saldoDevedor))}</div>
                  </div>
                </div>

                {/* Vendor summary */}
                <div className="glass-panel vendor-profit-card">
                  <div className="settlement-section-title">
                    <TrendingUp size={18} /> Resumo do Vendedor
                  </div>
                  <div className="financial-rows">
                    <div className="financial-row">
                      <span>Picolés vendidos</span>
                      <span>{calcs.totalQtdVendidos} un</span>
                    </div>
                    <div className="financial-row profit-highlight">
                      <span>Lucro do vendedor</span>
                      <strong className="profit-value">{formatCurrency(calcs.totalProfit)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!vendorId && (
        <div className="glass-panel">
          <div className="empty-state">
            <Package size={48} />
            <p>Selecione um vendedor e data para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}
