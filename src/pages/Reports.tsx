import { useMemo, useState } from 'react';
import { db } from '../services/db';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileBarChart2, Calendar, TrendingUp, CheckSquare,
  DollarSign, IceCream2, Award
} from 'lucide-react';
import './Reports.css';

export default function Reports() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const vendors = useMemo(() => db.getVendors(), []);
  const allComandas = useMemo(() => db.getComandas(), []);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  const periodLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });

  const report = useMemo(() => {
    // Filtra apenas comandas FECHADAS no período — mesmo critério do Mapa Diário
    const comandasPeriod = allComandas.filter(c => {
      if (!c.date || c.date.length < 10) return false;
      try {
        return c.status === 'Fechada' &&
          isWithinInterval(parseISO(c.date), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });

    return vendors.map(vendor => {
      const vendorComandas = comandasPeriod.filter(c => c.vendorId === vendor.id);
      const workedDays = new Set(vendorComandas.map(c => c.date)).size;

      let totalFactoryGross = 0; // Subtotal Fábrica antes do desconto
      let totalDiscount     = 0;
      let totalProfit       = 0;
      let totalQty          = 0;

      vendorComandas.forEach(c => {
        // Acumula desconto da comanda
        totalDiscount += c.discount ?? 0;

        c.items.forEach(item => {
          // Quantidade vendida = Saída Inicial + Reposição − Retorno (igual ao Mapa Diário)
          const qty = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
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
        comandas: vendorComandas,
      };
    }).filter(r => r.vendor.status === 'Ativo' || r.workedDays > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [vendors, allComandas, year, month]);

  const totals = useMemo(() => {
    return report.reduce((acc, r) => ({
      days: acc.days + r.workedDays,
      sold: acc.sold + r.totalSold,
      profit: acc.profit + r.totalProfit,
      qty: acc.qty + r.totalQty,
    }), { days: 0, sold: 0, profit: 0, qty: 0 });
  }, [report]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentYear = today.getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Generate daily frequency for a vendor
  const getDailyData = (vendorId: string) => {
    const daysInMonth = endOfMonth(new Date(year, month - 1, 1)).getDate();
    const days: { day: number; worked: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const worked = allComandas.some(c => c.vendorId === vendorId && c.date === dateStr);
      days.push({ day: d, worked });
    }
    return days;
  };

  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

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
        <div className="period-inputs">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4 report-kpis">
        <div className="kpi-card kpi-card--revenue">
          <div className="kpi-icon-wrap kpi-icon-revenue"><DollarSign size={20} /></div>
          <div className="kpi-label">Total Faturado</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totals.sold)}</div>
        </div>
        <div className="kpi-card kpi-card--qty">
          <div className="kpi-icon-wrap kpi-icon-qty"><IceCream2 size={20} /></div>
          <div className="kpi-label">Picolés Vendidos</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{totals.qty.toLocaleString('pt-BR')}</div>
        </div>
        <div className="kpi-card kpi-card--profit">
          <div className="kpi-icon-wrap kpi-icon-profit"><TrendingUp size={20} /></div>
          <div className="kpi-label">Lucro Vendedores</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totals.profit)}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#06b6d4' } as any}>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
            <CheckSquare size={20} />
          </div>
          <div className="kpi-label">Total Dias Trabalhados</div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{totals.days}</div>
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
                  <th>Dias Trabalhados</th>
                  <th>Qtd. Vendidos</th>
                  <th>Faturamento (Fábrica)</th>
                  <th>Lucro do Vendedor</th>
                  <th>Frequência</th>
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
                        <td>
                          <div className="days-badge">
                            <Calendar size={14} />
                            {r.workedDays} dia{r.workedDays !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td>
                          <div className="cell-with-icon">
                            <IceCream2 size={14} className="cell-icon" />
                            {r.totalQty} un
                          </div>
                        </td>
                        <td className="price-col">{formatCurrency(r.totalSold)}</td>
                        <td>
                          <span className="profit-chip">{formatCurrency(r.totalProfit)}</span>
                        </td>
                        <td>
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
                          <td colSpan={7}>
                            <div className="calendar-grid">
                              {dailyData.map(({ day, worked }) => (
                                <div
                                  key={day}
                                  className={`calendar-day ${worked ? 'calendar-day--worked' : 'calendar-day--off'}`}
                                  title={worked ? `Dia ${day}: trabalhou` : `Dia ${day}: não trabalhou`}
                                >
                                  {day}
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
