import { useMemo, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Vendor, Product, Comanda } from '../types';
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign, IceCream2, TrendingUp,
  Package, Calendar, ChevronRight
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

const today = format(new Date(), 'yyyy-MM-dd');
const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

// Paleta de cores harmônica para os gráficos
const DONUT_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#a78bfa'];

// Formata moeda
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Tooltip customizado para os donuts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      color: '#f8fafc',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{name}</div>
      <div style={{ color: p?.fill }}>{value}</div>
    </div>
  );
};

// Legenda customizada ao lado do donut
function DonutLegend({ data, colors, format: fmtFn }: {
  data: { name: string; value: number }[];
  colors: string[];
  format: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="donut-legend">
      {data.map((entry, i) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={entry.name} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: colors[i % colors.length] }} />
            <span className="donut-legend-name">{entry.name}</span>
            <span className="donut-legend-val">{fmtFn(entry.value)}</span>
            <span className="donut-legend-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo]     = useState(today);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [v, p, c] = await Promise.all([
        db.getVendors(),
        db.getProducts(),
        db.getComandas()
      ]);
      setVendors(v);
      setProducts(p);
      setComandas(c);
      setLoading(false);
    }
    load();
  }, []);

  // ── Filtra apenas comandas FECHADAS no período ──────────────────────────────
  const filteredComandas = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    return comandas.filter(c => {
      if (!c.date || c.status !== 'Fechada') return false;
      try {
        return isWithinInterval(parseISO(c.date), {
          start: startOfDay(parseISO(dateFrom)),
          end:   endOfDay(parseISO(dateTo)),
        });
      } catch { return false; }
    });
  }, [comandas, dateFrom, dateTo]);

  // ── KPIs: fórmulas alinhadas com Mapa Diário e Relatório ───────────────────
  const stats = useMemo(() => {
    let totalRevenue     = 0; // Valor Líquido (subtotal − desconto)
    let totalQty         = 0; // Saída + Reposição − Retorno
    let totalVendorProfit = 0;

    filteredComandas.forEach(c => {
      const discount = c.discount ?? 0;
      let commandSubtotal = 0;

      c.items.forEach(item => {
        const qty = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
        commandSubtotal   += qty * item.priceFactoryFrozen;
        totalVendorProfit += qty * item.profitVendorFrozen;
        totalQty          += qty;
      });

      totalRevenue += commandSubtotal - discount;
    });

    return { totalRevenue, totalQty, totalVendorProfit };
  }, [filteredComandas]);

  // ── Dados agrupados por categoria de produto (para os donuts) ──────────────
  const { donutVolume, donutFinanceiro } = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number }> = {};

    filteredComandas.forEach(c => {
      const discount = c.discount ?? 0;
      // Peso proporcional do desconto por item
      const commandGross = c.items.reduce((s, item) => {
        const qty = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
        return s + qty * item.priceFactoryFrozen;
      }, 0);

      c.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const name    = product?.name ?? 'Desconhecido';
        const qty     = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
        if (qty <= 0) return;

        const gross = qty * item.priceFactoryFrozen;
        // Desconto proporcional ao peso deste item no total da comanda
        const itemDiscount = commandGross > 0 ? discount * (gross / commandGross) : 0;
        const net = gross - itemDiscount;

        if (!map[name]) map[name] = { qtd: 0, valor: 0 };
        map[name].qtd   += qty;
        map[name].valor += net;
      });
    });

    const entries = Object.entries(map).sort((a, b) => b[1].qtd - a[1].qtd);
    return {
      donutVolume:     entries.map(([name, d]) => ({ name, value: d.qtd })),
      donutFinanceiro: entries.map(([name, d]) => ({ name, value: parseFloat(d.valor.toFixed(2)) })),
    };
  }, [filteredComandas, products]);

  // ── Recentes (todas as comandas do período, incluindo abertas) ─────────────
  const recentComandas = useMemo(() => {
    return [...comandas]
      .filter(c => {
        if (!c.date) return false;
        try {
          return isWithinInterval(parseISO(c.date), {
            start: startOfDay(parseISO(dateFrom)),
            end:   endOfDay(parseISO(dateTo)),
          });
        } catch { return false; }
      })
      .sort((a, b) => {
        // Abertas primeiro, depois data desc
        if (a.status !== b.status) return a.status === 'Aberta' ? -1 : 1;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 5);
  }, [comandas, dateFrom, dateTo]);

  // Calcula valor do card de recente mesma lógica: bruto→aberta, líquido→fechada
  const getRecentValue = (c: typeof comandas[0]) => {
    const gross = c.items.reduce((s, item) => {
      const qty = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
      return s + qty * item.priceFactoryFrozen;
    }, 0);
    return c.status === 'Aberta' ? gross : gross - (c.discount ?? 0);
  };

  const hasDonutData = donutVolume.length > 0;

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="dashboard animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Visão geral das operações</p>
        </div>
        <div className="date-filter">
          <div className="date-filter-item">
            <Calendar size={16} />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="date-input"
            />
          </div>
          <span className="date-sep">até</span>
          <div className="date-filter-item">
            <Calendar size={16} />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-3 dashboard-kpis">
        <div className="kpi-card kpi-card--revenue">
          <div className="kpi-icon-wrap kpi-icon-revenue">
            <DollarSign size={22} />
          </div>
          <div className="kpi-label">Total Faturado (Líquido)</div>
          <div className="kpi-value">{fmt(stats.totalRevenue)}</div>
          <div className="kpi-sub">Subtotal − descontos · comandas fechadas</div>
        </div>

        <div className="kpi-card kpi-card--qty">
          <div className="kpi-icon-wrap kpi-icon-qty">
            <IceCream2 size={22} />
          </div>
          <div className="kpi-label">Picolés Vendidos</div>
          <div className="kpi-value">{stats.totalQty.toLocaleString('pt-BR')}</div>
          <div className="kpi-sub">Saída + Reposição − Retorno</div>
        </div>

        <div className="kpi-card kpi-card--profit">
          <div className="kpi-icon-wrap kpi-icon-profit">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-label">Lucro Acumulado Vendedores</div>
          <div className="kpi-value">{fmt(stats.totalVendorProfit)}</div>
          <div className="kpi-sub">Ganho total dos vendedores</div>
        </div>
      </div>

      {/* Donut Charts row */}
      <div className="donuts-row">
        {/* Donut 1 — Volume */}
        <div className="glass-panel donut-panel">
          <div className="chart-header">
            <div className="chart-title">
              <IceCream2 size={18} />
              <span>Volume por Produto</span>
            </div>
            <span className="chart-subtitle">Unidades vendidas</span>
          </div>
          {!hasDonutData ? (
            <div className="chart-empty">
              <Package size={44} />
              <p>Nenhuma venda fechada no período</p>
            </div>
          ) : (
            <div className="donut-content">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={donutVolume}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutVolume.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <DonutLegend
                data={donutVolume}
                colors={DONUT_COLORS}
                format={v => `${v} un`}
              />
            </div>
          )}
        </div>

        {/* Donut 2 — Financeiro */}
        <div className="glass-panel donut-panel">
          <div className="chart-header">
            <div className="chart-title">
              <DollarSign size={18} />
              <span>Faturamento por Produto</span>
            </div>
            <span className="chart-subtitle">Valor líquido (R$)</span>
          </div>
          {!hasDonutData ? (
            <div className="chart-empty">
              <Package size={44} />
              <p>Nenhuma venda fechada no período</p>
            </div>
          ) : (
            <div className="donut-content">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={donutFinanceiro}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutFinanceiro.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <DonutLegend
                data={donutFinanceiro}
                colors={DONUT_COLORS}
                format={fmt}
              />
            </div>
          )}
        </div>
      </div>

      {/* Recent Comandas */}
      <div className="glass-panel recent-panel">
        <div className="recent-header">
          <h3 className="recent-title">Comandas Recentes</h3>
          <a href="/comandas" className="recent-link">
            Ver todas <ChevronRight size={16} />
          </a>
        </div>

        {recentComandas.length === 0 ? (
          <p className="recent-empty">Nenhuma comanda no período</p>
        ) : (
          <div className="recent-list">
            {recentComandas.map(c => {
              const vendor = vendors.find(v => v.id === c.vendorId);
              const total  = getRecentValue(c);
              const formattedDate = format(parseISO(c.date), 'dd/MM/yyyy', { locale: ptBR });

              return (
                <div key={c.id} className="recent-item">
                  <div className="recent-vendor">
                    <div className="recent-avatar">
                      {vendor?.name?.[0] ?? '?'}
                    </div>
                    <div>
                      <div className="recent-name">{vendor?.name ?? 'Vendedor Removido'}</div>
                      <div className="recent-date">{formattedDate}</div>
                    </div>
                  </div>
                  <div className="recent-right">
                    <div className="recent-amount">{fmt(total)}</div>
                    <span className={`badge ${c.status === 'Aberta' ? 'open' : 'closed'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
