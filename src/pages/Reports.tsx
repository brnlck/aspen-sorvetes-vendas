import { useMemo, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Vendor, Comanda } from '../types';
import { format, parseISO, startOfMonth, endOfDay, isWithinInterval, eachDayOfInterval } from 'date-fns';
import {
  FileBarChart2, Calendar, TrendingUp, CheckSquare,
  DollarSign, IceCream2, Award
} from 'lucide-react';
import './Reports.css';

export default function Reports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allComandas, setAllComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [v, c] = await Promise.all([
        db.getVendors(),
        db.getComandas()
      ]);
      setVendors(v);
      setAllComandas(c);
      setLoading(false);
    }
    load();
  }, []);

  const periodLabel = `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

  const report = useMemo(() => {
    // Filtra apenas comandas FECHADAS no período — mesmo critério do Mapa Diário
    const comandasPeriod = allComandas.filter(c => {
      if (!c.date || c.date.length < 10) return false;
      try {
        return c.status === 'Fechada' &&
          isWithinInterval(parseISO(c.date), { start: parseISO(startDate), end: endOfDay(parseISO(endDate)) });
      } catch { return false; }
    });

    return vendors.map(vendor => {
      const vendorComandas = comandasPeriod.filter(c => c.vendorId === vendor.id);
      const workedDays = new Set(vendorComandas.map(c => c.date)).size;

      let totalFactoryGross = 0; // Subtotal Fábrica antes do desconto
      let totalDiscount     = 0;
      let totalProfit       = 0;
      let totalQty          = 0;
      let totalCarga        = 0;
      let totalReturnQty    = 0;

      vendorComandas.forEach(c => {
        // Acumula desconto da comanda
        totalDiscount += c.discount ?? 0;

        c.items.forEach(item => {
          const carga = item.quantityOut + (item.quantityReposition ?? 0);
          const ret = item.quantityReturn || 0;
          totalCarga += carga;
          totalReturnQty += ret;

          // Quantidade vendida = Carga Total − Retorno
          const qty = Math.max(0, carga - ret);
          totalFactoryGross += qty * item.priceFactoryFrozen;
          totalProfit       += qty * item.profitVendorFrozen;
          totalQty          += qty;
        });
      });

      // Valor Líquido = Subtotal Fábrica − Descontos (igual ao Mapa Diário)
      const totalSold = totalFactoryGross - totalDiscount;

      return {
        vendor,
        workedDays,
        totalSold,
        totalProfit,
        totalQty,
        totalCarga,
        totalReturnQty,
        totalDiscount,
        comandas: vendorComandas,
      };
    }).filter(r => r.vendor.status === 'Ativo' || r.workedDays > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [vendors, allComandas, startDate, endDate]);

  const totals = useMemo(() => {
    const uniqueDates = new Set(report.flatMap(r => r.comandas.map(c => c.date))).size;
    return report.reduce((acc, r) => ({
      days: acc.days,
      sold: acc.sold + r.totalSold,
      profit: acc.profit + r.totalProfit,
      qty: acc.qty + r.totalQty,
      discount: acc.discount + r.totalDiscount,
    }), { days: uniqueDates, sold: 0, profit: 0, qty: 0, discount: 0 });
  }, [report]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Generate daily frequency for a vendor
  const getDailyData = (vendorId: string) => {
    try {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      return days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const worked = allComandas.some(c => c.vendorId === vendorId && c.date === dateStr);
        return { date: d, worked };
      });
    } catch { return []; }
  };

  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando relatórios...</div>;

  return (
    <div className="reports-page animate-fade-in">
      <div className="crud-header">
        <div>
          <h1 className="title">Relatórios</h1>
          <p className="subtitle">Lista de presença e desempenho mensal</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="glass-panel period-selector">
        <div className="period-title">
          <Calendar size={18} />
          <span>Período de análise:</span>
          <strong>{periodLabel}</strong>
        </div>
        <div className="period-inputs date-range-inputs">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="report-kpis">
        <div className="kpi-card kpi-card--revenue">
          <div className="kpi-icon-wrap kpi-icon-revenue"><DollarSign size={20} /></div>
          <div className="kpi-label">Total Faturado</div>
          <div className="kpi-value">{formatCurrency(totals.sold)}</div>
        </div>
        <div className="kpi-card kpi-card--qty">
          <div className="kpi-icon-wrap kpi-icon-qty"><IceCream2 size={20} /></div>
          <div className="kpi-label">Picolés Vendidos</div>
          <div className="kpi-value">{totals.qty.toLocaleString('pt-BR')}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f43f5e' } as React.CSSProperties}>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <DollarSign size={20} />
          </div>
          <div className="kpi-label">Total Descontos</div>
          <div className="kpi-value">{formatCurrency(totals.discount)}</div>
        </div>
        <div className="kpi-card kpi-card--profit">
          <div className="kpi-icon-wrap kpi-icon-profit"><TrendingUp size={20} /></div>
          <div className="kpi-label">Lucro Vendedores</div>
          <div className="kpi-value">{formatCurrency(totals.profit)}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#06b6d4' } as React.CSSProperties}>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
            <CheckSquare size={20} />
          </div>
          <div className="kpi-label">Total Dias Trabalhados</div>
          <div className="kpi-value">{totals.days}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#64748b' } as React.CSSProperties}>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(100, 116, 139, 0.15)', color: '#64748b' }}>
            <TrendingUp size={20} />
          </div>
          <div className="kpi-label">Média Faturamento Diário</div>
          <div className="kpi-value">{formatCurrency(totals.days > 0 ? totals.sold / totals.days : 0)}</div>
        </div>
      </div>

      {/* Vendor Report Table */}
      <div className="glass-panel table-wrapper">
        <div className="report-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <FileBarChart2 size={18} />
            Desempenho por Vendedor — {periodLabel}
          </div>
        </div>
        {report.length === 0 ? (
          <div className="empty-state">
            <FileBarChart2 size={48} />
            <p>Nenhuma movimentação no período selecionado</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vendedor</th>
                  <th style={{ textAlign: 'center' }}>Dias Trabalhados</th>
                  <th style={{ textAlign: 'center' }}>Qtd. Vendidos</th>
                  <th style={{ textAlign: 'right' }}>Faturamento (Fábrica)</th>
                  <th style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Desc.</th>
                  <th style={{ textAlign: 'right' }}>Lucro do Vendedor</th>
                  <th style={{ textAlign: 'center' }}>Frequência</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r, i) => {
                  const dailyData = getDailyData(r.vendor.id);
                  const isExpanded = expandedVendor === r.vendor.id;
                  return (
                    <>
                      <tr key={r.vendor.id} className={isExpanded ? 'row-expanded' : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {i === 0 && <Award size={16} style={{ color: '#f59e0b' }} />}
                            {i === 1 && <Award size={16} style={{ color: '#94a3b8' }} />}
                            {i === 2 && <Award size={16} style={{ color: '#92400e' }} />}
                            {i > 2 && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>#{i + 1}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="vendor-cell">
                            <div className="vendor-avatar">{r.vendor.name[0]?.toUpperCase()}</div>
                            <div>
                              <div className="vendor-name">{r.vendor.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {r.vendor.status === 'Ativo' ? '● Ativo' : '○ Inativo'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="days-badge">
                            <Calendar size={14} />
                            {r.workedDays} dia{r.workedDays !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="cell-with-icon" style={{ justifyContent: 'center', fontWeight: 700, color: '#1A202C' }}>
                            <IceCream2 size={14} className="cell-icon" />
                            {r.totalQty} un
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 400 }}>
                            Média: {r.workedDays > 0 ? (r.totalQty / r.workedDays).toFixed(1) : 0} un/dia
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="price-col" style={{ fontWeight: 700, color: '#1A202C' }}>{formatCurrency(r.totalSold)}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 400 }}>
                            Média: {formatCurrency(r.workedDays > 0 ? r.totalSold / r.workedDays : 0)}/dia
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          <span style={{ fontSize: '0.85rem' }}>{r.totalDiscount > 0 ? formatCurrency(r.totalDiscount) : '-'}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="profit-chip">{formatCurrency(r.totalProfit)}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => setExpandedVendor(isExpanded ? null : r.vendor.id)}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver Dias'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.vendor.id}-expanded`} className="expanded-row">
                          <td colSpan={8}>
                            <div className="calendar-grid">
                              {dailyData.map(({ date, worked }) => (
                                <div
                                  key={date.toISOString()}
                                  className={`calendar-day ${worked ? 'calendar-day--worked' : 'calendar-day--off'}`}
                                  title={worked ? `${format(date, 'dd/MM')}: trabalhou` : `${format(date, 'dd/MM')}: não trabalhou`}
                                >
                                  {format(date, 'dd')}
                                </div>
                              ))}
                            </div>
                            <div className="calendar-legend">
                              <span className="legend-worked">■ Trabalhou</span>
                              <span className="legend-off">■ Não trabalhou</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
