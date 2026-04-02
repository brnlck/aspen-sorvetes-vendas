import { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import type { Comanda, Product } from '../types';
import { TrendingUp, Banknote, PackageOpen, Calendar, Package } from 'lucide-react';
import { startOfMonth, endOfDay, isWithinInterval, parseISO, format } from 'date-fns';
import './MeuDesempenho.css';

export default function MeuDesempenho() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cData, pData] = await Promise.all([
        db.getComandas(),
        db.getProducts(),
      ]);
      setComandas(cData);
      setAllProducts(pData);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return comandas.filter(c => {
      if (!c.date || c.date.length < 10) return false;
      const cDate = parseISO(c.date);
      return isWithinInterval(cDate, { start: parseISO(startDate), end: endOfDay(parseISO(endDate)) });
    });
  }, [comandas, startDate, endDate]);

  const stats = useMemo(() => {
    let unidades = 0;
    let lucro = 0;
    let repasse = 0;

    filtered.forEach(c => {
      // Repasse (Dinheiro pago à Aspen)
      const pago = c.payments.reduce((sum, p) => sum + p.amount, 0);
      repasse += pago;

      // Unidades vendidas e Lucro
      c.items.forEach(i => {
        const cargaTotal = i.quantityOut + i.quantityReposition;
        // Se a comanda está aberta e não tem retorno, podemos considerar vendidos como 0 ou algo do tipo
        // Para uma visão mais precisa para o dono:
        
        // Se ainda tá na rua e é do mesmo dia, só podemos ver vendidos se ele já fez o retorno.
        // Vamos ser otimistas ou basear no que já retornou:
        // No fechamento, os vendidos são a carga total - retorno.
        const sold = c.status === 'Fechada' ? Math.max(0, cargaTotal - i.quantityReturn) : 0;
        
        unidades += sold;
        lucro += sold * i.profitVendorFrozen;
      });
    });

    return { unidades, lucro, repasse };
  }, [filtered]);

  const productStats = useMemo(() => {
    const statsMap: Record<string, { id: string; name: string; qty: number; value: number }> = {};
    
    filtered.forEach(c => {
      if (c.status !== 'Fechada') return; // considera vendas apenas em comandas fechadas
      c.items.forEach(i => {
        const cargaTotal = i.quantityOut + (i.quantityReposition ?? 0);
        const sold = Math.max(0, cargaTotal - i.quantityReturn);
        
        if (sold > 0) {
          if (!statsMap[i.productId]) {
            const prod = allProducts.find(p => p.id === i.productId);
            statsMap[i.productId] = {
              id: i.productId,
              name: prod?.name || 'Desconhecido',
              qty: 0,
              value: 0
            };
          }
          statsMap[i.productId].qty += sold;
          statsMap[i.productId].value += sold * i.profitVendorFrozen;
        }
      });
    });

    return Object.values(statsMap).sort((a,b) => b.qty - a.qty);
  }, [filtered, allProducts]);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <div>Carregando painel de desempenho...</div>;

  return (
    <div className="desempenho-page animate-fade-in">
      <div className="desempenho-header">
        <h1 className="title">Meu Desempenho</h1>
        <p className="subtitle">
          Acompanhe suas vendas e comissões. <br/>
          <em>* Apenas comandas fechadas entram no cálculo de comissões e unidades vendidas.</em>
        </p>
      </div>

      <div className="glass-panel period-selector" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '1rem 1.5rem', gap: '1rem' }}>
        <div className="period-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-color)' }}>
          <Calendar size={18} />
          Período de Análise
        </div>
        <div className="date-range-inputs" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="desempenho-grid">
        <div className="metric-card">
          <div className="metric-header">
            <PackageOpen size={18} className="metric-icon" style={{ color: 'var(--text-color)' }} />
            Picolés Vendidos
          </div>
          <div className="metric-value">
            {stats.unidades} <span className="metric-subtitle">unid.</span>
          </div>
          <p className="metric-subtitle">Volume total repassado ao cliente final</p>
        </div>

        <div className="metric-card paid">
          <div className="metric-header">
            <Banknote size={18} className="metric-icon" />
            Valor Pago à Fábrica
          </div>
          <div className="metric-value">
            {formatCurrency(stats.repasse)}
          </div>
          <p className="metric-subtitle">Total de pagamentos entregues</p>
        </div>

        <div className="metric-card profit" style={{ '--kpi-color': '#06b6d4' } as React.CSSProperties}>
          <div className="metric-header">
            <TrendingUp size={18} className="metric-icon" />
            Minha Comissão
          </div>
          <div className="metric-value highlight">
            {formatCurrency(stats.lucro)}
          </div>
          <p className="metric-subtitle">Margem de lucro total recebida</p>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '0.5rem' }}>
        <div className="report-table-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} /> Resumo de Produtos Vendidos
        </div>
        
        {productStats.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma venda concluída neste período.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style={{ textAlign: 'center' }}>Quantidade Vendida</th>
                  <th style={{ textAlign: 'right' }}>Sua Comissão</th>
                </tr>
              </thead>
              <tbody>
                {productStats.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="item-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                        <div style={{ color: 'var(--primary-color)' }}><PackageOpen size={15} /></div>
                        {item.name}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span className="vendidos-badge vendidos-positive" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
                          <span>{item.qty}</span>
                          <span style={{ fontWeight: 600, opacity: 0.8 }}>un</span>
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
