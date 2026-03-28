import { useMemo, useState } from 'react';
import { db } from '../services/db';
import { format, parseISO, isWithinInterval, parse } from 'date-fns';
import { Calendar, TableProperties, Printer, TrendingUp, Banknote, Smartphone, CreditCard } from 'lucide-react';
import './MapaMovimentacao.css';

const PAYMENT_ICON: Record<string, React.ReactNode> = {
  Dinheiro: <Banknote size={13} />,
  PIX:      <Smartphone size={13} />,
  Crédito:  <CreditCard size={13} />,
  Débito:   <CreditCard size={13} />,
};

interface MapaRow {
  vendorId:      string;
  vendorName:    string;
  qtdByProduct:  Record<string, number>;
  totalQty:      number;
  totalAspen:    number;
  totalProfit:   number;
  payments:      Record<string, number>;
}

export default function MapaMovimentacao() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);

  const vendors  = useMemo(() => db.getVendors(), []);
  const products = useMemo(() => db.getProducts(), []);
  const allComandas = useMemo(() => db.getComandas(), []);

  // Active products, in display order
  const activeProducts = useMemo(
    () => products.filter(p => p.status === 'Ativo'),
    [products],
  );

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Build rows ──
  const rows = useMemo(() => {
    // Guard: only process when both dates are valid complete strings
    if (dateFrom.length < 10 || dateTo.length < 10) return [];

    let from: Date, to: Date;
    try {
      from = parse(dateFrom, 'yyyy-MM-dd', new Date());
      to   = parse(dateTo,   'yyyy-MM-dd', new Date());
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return [];
    } catch {
      return [];
    }

    // Ensure from <= to
    const start = from <= to ? from : to;
    const end   = from <= to ? to   : from;

    // Filter closed comandas in the date range
    const inRange = allComandas.filter(c => {
      if (!c.date || c.date.length < 10) return false;
      try {
        return c.status === 'Fechada' &&
          isWithinInterval(parseISO(c.date), { start, end });
      } catch { return false; }
    });

    return vendors
      .map(vendor => {
        const comandas = inRange.filter(c => c.vendorId === vendor.id);
        if (comandas.length === 0) return null;

        // Qty sold per product
        const qtdByProduct: Record<string, number> = {};
        activeProducts.forEach(p => { qtdByProduct[p.id] = 0; });

        let totalFactoryGross = 0; // Subtotal Fábrica before discount
        let totalDiscount     = 0;
        let totalProfit       = 0;
        let totalQty          = 0;

        // Payments by method
        const payments: Record<string, number> = {
          Dinheiro: 0, PIX: 0, Crédito: 0, Débito: 0,
        };

        comandas.forEach(c => {
          totalDiscount += c.discount ?? 0;

          c.items.forEach(item => {
            const qty = Math.max(0, (item.quantityOut + (item.quantityReposition ?? 0)) - item.quantityReturn);
            if (qtdByProduct[item.productId] !== undefined) {
              qtdByProduct[item.productId] += qty;
            }
            totalFactoryGross += qty * item.priceFactoryFrozen;
            totalProfit       += qty * item.profitVendorFrozen;
            totalQty          += qty;
          });

          c.payments.forEach(pay => {
            payments[pay.method] = (payments[pay.method] ?? 0) + pay.amount;
          });
        });

        const totalAspen = totalFactoryGross - totalDiscount;

        return {
          vendorId:   vendor.id,
          vendorName: vendor.name,
          qtdByProduct,
          totalQty,
          totalAspen,
          totalProfit,
          payments,
        };
      })
      .filter((r): r is MapaRow => r !== null);
  }, [vendors, activeProducts, allComandas, dateFrom, dateTo]);

  // ── Column totals ──
  const totals = useMemo(() => {
    const qtdByProduct: Record<string, number> = {};
    activeProducts.forEach(p => { qtdByProduct[p.id] = 0; });
    let totalQty = 0, totalAspen = 0, totalProfit = 0;
    const payments: Record<string, number> = { Dinheiro: 0, PIX: 0, Crédito: 0, Débito: 0 };

    rows.forEach(r => {
      activeProducts.forEach(p => { qtdByProduct[p.id] += r.qtdByProduct[p.id] ?? 0; });
      totalQty    += r.totalQty;
      totalAspen  += r.totalAspen;
      totalProfit += r.totalProfit;
      Object.keys(payments).forEach(m => { payments[m] += r.payments[m] ?? 0; });
    });

    return { qtdByProduct, totalQty, totalAspen, totalProfit, payments };
  }, [rows, activeProducts]);

  const safeFormat = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return dateStr;
    try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
  };

  const dFrom = dateFrom < dateTo ? dateFrom : dateTo;
  const dTo   = dateFrom < dateTo ? dateTo   : dateFrom;
  const periodLabel = dateFrom === dateTo
    ? safeFormat(dateFrom)
    : `${safeFormat(dFrom)} – ${safeFormat(dTo)}`;

  return (
    <div className="mapa-page animate-fade-in">

      {/* ── Header ── */}
      <div className="mapa-header">
        <div>
          <h1 className="title">Mapa de Movimentação Diária</h1>
          <p className="subtitle">Vendas por produto, pagamentos e comissões — comandas fechadas</p>
        </div>
        <button
          className="btn-print"
          onClick={() => window.print()}
          title="Imprimir / Salvar PDF"
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="glass-panel mapa-filters">
        <div className="filter-title">
          <Calendar size={17} />
          <span>Período:</span>
          <strong>{periodLabel}</strong>
        </div>
        <div className="filter-inputs">
          <div className="filter-group">
            <label>De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {rows.length === 0 ? (
        <div className="glass-panel mapa-empty">
          <TableProperties size={52} />
          <p>Nenhuma comanda fechada no período selecionado</p>
          <span>Verifique as datas ou feche as comandas pendentes</span>
        </div>
      ) : (
        <div className="glass-panel mapa-table-wrap">
          <div className="mapa-table-title">
            <TableProperties size={17} />
            Mapa de Movimentação — {periodLabel}
            <span className="mapa-row-count">{rows.length} vendedor{rows.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="mapa-scroll">
            <table className="mapa-table">
              <thead>
                {/* ── Group headers ── */}
                <tr className="th-group-row">
                  <th className="th-fixed" rowSpan={2}>Vendedor</th>
                  <th colSpan={activeProducts.length} className="th-group th-group--products">
                    Quantidade Vendida por Produto
                  </th>
                  <th className="th-group th-group--totals" rowSpan={2}>Qtd<br/>Total</th>
                  <th className="th-group th-group--money" rowSpan={2}>Total<br/>Aspen</th>
                  <th className="th-group th-group--profit" rowSpan={2}>Ganho<br/>Vendedor</th>
                  <th colSpan={4} className="th-group th-group--payments">Formas de Pagamento</th>
                </tr>
                <tr className="th-products-row">
                  {activeProducts.map(p => (
                    <th key={p.id} className="th-product">{p.name}</th>
                  ))}
                  <th className="th-payment">
                    {PAYMENT_ICON['Dinheiro']} Dinheiro
                  </th>
                  <th className="th-payment">
                    {PAYMENT_ICON['PIX']} PIX
                  </th>
                  <th className="th-payment">
                    {PAYMENT_ICON['Débito']} Débito
                  </th>
                  <th className="th-payment">
                    {PAYMENT_ICON['Crédito']} Crédito
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.vendorId} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="td-vendor">
                      <div className="vendor-cell">
                        <div className="vendor-avatar-sm">{row.vendorName[0]?.toUpperCase()}</div>
                        {row.vendorName}
                      </div>
                    </td>
                    {activeProducts.map(p => (
                      <td key={p.id} className="td-qty">
                        {row.qtdByProduct[p.id] > 0
                          ? <span className="qty-pill">{row.qtdByProduct[p.id]}</span>
                          : <span className="qty-zero">—</span>
                        }
                      </td>
                    ))}
                    <td className="td-total-qty">
                      <strong>{row.totalQty}</strong>
                    </td>
                    <td className="td-money">
                      {formatCurrency(row.totalAspen)}
                    </td>
                    <td className="td-profit">
                      <span className="profit-tag">
                        <TrendingUp size={12} />
                        {formatCurrency(row.totalProfit)}
                      </span>
                    </td>
                    {['Dinheiro', 'PIX', 'Débito', 'Crédito'].map(method => (
                      <td key={method} className="td-payment">
                        {row.payments[method] > 0
                          ? <span className="pay-value">{formatCurrency(row.payments[method])}</span>
                          : <span className="qty-zero">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* ── Totals row ── */}
              <tfoot>
                <tr className="totals-row">
                  <td className="td-totals-label">TOTAIS</td>
                  {activeProducts.map(p => (
                    <td key={p.id} className="td-qty td-totals">
                      <strong>{totals.qtdByProduct[p.id] || '—'}</strong>
                    </td>
                  ))}
                  <td className="td-total-qty td-totals">
                    <strong>{totals.totalQty}</strong>
                  </td>
                  <td className="td-money td-totals">
                    <strong>{formatCurrency(totals.totalAspen)}</strong>
                  </td>
                  <td className="td-profit td-totals">
                    <strong>{formatCurrency(totals.totalProfit)}</strong>
                  </td>
                  {['Dinheiro', 'PIX', 'Débito', 'Crédito'].map(method => (
                    <td key={method} className="td-payment td-totals">
                      <strong>{totals.payments[method] > 0 ? formatCurrency(totals.payments[method]) : '—'}</strong>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
