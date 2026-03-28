import { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import type { Comanda, Vendor } from '../types';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Calendar, Eye, Clock,
  CheckCircle2, ClipboardList, SunMedium, Sunset, Unlock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VendorAvatar } from './Vendors';
import './ComandaList.css';

const todayStr = format(new Date(), 'yyyy-MM-dd');

export default function ComandaList() {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'Aberta' | 'Fechada'>('Aberta');
  const [dateFilter,   setDateFilter]   = useState(todayStr);
  const [comandas,     setComandas]     = useState<Comanda[]>([]);
  const [vendors,      setVendors]      = useState<Vendor[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    async function load() {
      const cData = await db.getComandas();
      const vData = await db.getVendors();
      const sorted = [...cData].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Aberta' ? -1 : 1;
        return b.date.localeCompare(a.date);
      });
      setComandas(sorted);
      setVendors(vData);
      setLoading(false);
    }
    load();
  }, []);

  const reload = async () => {
    const cData = await db.getComandas();
    setComandas([...cData].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Aberta' ? -1 : 1;
      return b.date.localeCompare(a.date);
    }));
  };

  const handleReopen = async (e: React.MouseEvent, comandaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Reabrir esta comanda para edição?')) {
      await db.updateComanda(comandaId, { status: 'Aberta', closedAt: undefined });
      reload();
    }
  };

  const filtered = useMemo(() => {
    return comandas.filter(c => {
      const vendor = vendors.find(v => v.id === c.vendorId);
      const matchSearch =
        !search ||
        vendor?.name.toLowerCase().includes(search.toLowerCase()) ||
        c.date.includes(search);
      const matchStatus = statusFilter === 'Todas' || c.status === statusFilter;
      const matchDate   = !dateFilter || c.date === dateFilter;
      return matchSearch && matchStatus && matchDate;
    });
  }, [comandas, search, statusFilter, dateFilter, vendors]);

  const openCount  = comandas.filter(c => c.status === 'Aberta').length;
  const todayCount = comandas.filter(c => c.date === todayStr).length;

  // Subtotal bruto: (Saída + Reposição) × preço — exibido enquanto Aberta
  const getSubtotalBruto = (c: Comanda) =>
    c.items.reduce((sum, item) => {
      const q = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
      return sum + q * item.priceFactoryFrozen;
    }, 0);

  // Valor líquido = Subtotal Bruto − Desconto — exibido após Fechar
  const getValorLiquido = (c: Comanda) => getSubtotalBruto(c) - (c.discount ?? 0);

  // Valor exibido no card: bruto se Aberta, líquido se Fechada
  const getCardValue = (c: Comanda) =>
    c.status === 'Aberta' ? getSubtotalBruto(c) : getValorLiquido(c);

  const getSaldo = (c: Comanda) => {
    const total = getValorLiquido(c);
    const paid  = c.payments.reduce((s, p) => s + p.amount, 0);
    return total - paid;
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="comanda-list-page animate-fade-in">
      {/* Header */}
      <div className="crud-header">
        <div>
          <h1 className="title">Operação — Comandas</h1>
          <p className="subtitle">
            {openCount > 0 && (
              <span className="stat-badge stat-badge--open">
                <Clock size={11} /> {openCount} na rua hoje
              </span>
            )}
            <span className="stat-badge">{todayCount} hoje</span>
            <span className="stat-badge">{comandas.length} total</span>
          </p>
        </div>
        <Link to="/comandas/new" className="btn-primary" id="btn-new-comanda">
          <Plus size={18} /> Nova Comanda
        </Link>
      </div>

      {/* Operation Tips */}
      <div className="operation-tips">
        <div className="tip-card tip-morning">
          <SunMedium size={20} />
          <div>
            <div className="tip-title">Manhã — Abertura</div>
            <div className="tip-desc">Crie a comanda e lance a quantidade de saída para cada produto</div>
          </div>
        </div>
        <div className="tip-card tip-evening">
          <Sunset size={20} />
          <div>
            <div className="tip-title">Tarde — Acerto</div>
            <div className="tip-desc">Lance o retorno, registre desconto e pagamentos para fechar</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filters-bar">
        {/* Date picker */}
        <div className="filter-date-wrap">
          <Calendar size={15} className="filter-date-icon" />
          <input
            type="date"
            className="filter-date-input"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          {dateFilter !== todayStr && (
            <button
              className="filter-date-today-btn"
              onClick={() => setDateFilter(todayStr)}
              title="Voltar para hoje"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Search */}
        <div className="search-bar filter-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar vendedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Status tabs */}
        <div className="status-tabs">
          {(['Aberta', 'Fechada', 'Todas'] as const).map(s => (
            <button
              key={s}
              className={`status-tab ${statusFilter === s ? 'status-tab--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'Aberta'  && <Clock       size={13} />}
              {s === 'Fechada' && <CheckCircle2 size={13} />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-panel">
          <div className="empty-state">
            <ClipboardList size={56} />
            <p>
              {dateFilter === todayStr
                ? 'Nenhuma comanda para hoje ainda'
                : `Nenhuma comanda em ${format(parseISO(dateFilter), "dd 'de' MMM", { locale: ptBR })}`}
            </p>
            <Link to="/comandas/new" className="btn-primary">
              Abrir primeira comanda do dia
            </Link>
          </div>
        </div>
      ) : (
        <div className="comanda-cards">
          {filtered.map(c => {
            const vendor = vendors.find(v => v.id === c.vendorId);
            const total  = getCardValue(c);
            const saldo  = getSaldo(c);
            const totalQty = c.items.reduce(
              (s, i) => s + Math.max(0, (i.quantityOut + (i.quantityReposition ?? 0)) - i.quantityReturn),
              0,
            );
            const formattedDate = format(parseISO(c.date), "dd 'de' MMMM", { locale: ptBR });
            const isToday = c.date === todayStr;

            return (
              <Link to={`/comandas/${c.id}`} key={c.id}
                className={`comanda-card ${c.status === 'Aberta' ? 'comanda-card--open' : ''}`}
              >
                <div className="comanda-card-left">
                  {vendor ? (
                    <VendorAvatar vendor={vendor} size={44} className="comanda-avatar" />
                  ) : (
                    <div className="comanda-avatar">?</div>
                  )}
                  <div className="comanda-info">
                    <div className="comanda-vendor">{vendor?.name ?? 'Vendedor Removido'}</div>
                    <div className="comanda-date">
                      <Calendar size={13} />
                      {isToday ? <strong>Hoje</strong> : formattedDate}
                    </div>
                    <div className="comanda-qty">
                      🧊 {totalQty} picolé{totalQty !== 1 ? 's' : ''} vendido{totalQty !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="comanda-card-right">
                  <span className={`badge ${c.status === 'Aberta' ? 'open' : 'closed'}`}>
                    {c.status === 'Aberta' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                    {c.status === 'Aberta' ? 'Na rua' : 'Fechada'}
                  </span>
                  <div className="comanda-total">
                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {c.status === 'Aberta' ? 'Subtotal bruto' : 'Valor líquido'}
                    </div>
                  </div>
                  {c.status === 'Fechada' && (
                    <div className={`comanda-saldo ${saldo > 0.01 ? 'saldo-devedor' : 'saldo-ok'}`}>
                      {saldo > 0.01 ? `Saldo: ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '✓ Quitada'}
                    </div>
                  )}
                  {c.status === 'Fechada' ? (
                    <button
                      className="btn-reopen-list"
                      onClick={e => handleReopen(e, c.id)}
                      title="Reabrir comanda para edição"
                    >
                      <Unlock size={14} /> Reabrir
                    </button>
                  ) : (
                    <div className="comanda-open-icon">
                      <Eye size={16} />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
