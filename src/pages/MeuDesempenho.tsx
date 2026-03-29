import { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import type { Comanda } from '../types';
import { TrendingUp, Banknote, PackageOpen } from 'lucide-react';
import { startOfMonth, startOfYear, isSameDay, isAfter } from 'date-fns';
import './MeuDesempenho.css';

type TimeFilter = 'hoje' | 'mes' | 'ano' | 'tudo';

export default function MeuDesempenho() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('mes');

  useEffect(() => {
    async function fetchComandas() {
      // Devido ao RLS no Supabase, isso retornará APENAS as comandas do vendedor logado,
      // pois `vendor_id` é filtrado na base de dados pelo seu `cpf`.
      const data = await db.getComandas();
      setComandas(data);
      setLoading(false);
    }
    fetchComandas();
  }, []);

  const filtered = useMemo(() => {
    const today = new Date();
    return comandas.filter(c => {
      // Ignora as rascunhos em aberto, a menos que tenhamos produtos vendidos nelas que importem.
      // O usual é contar o Realizado.
      // Porém, podemos somar todas as movimentações.
      // Aqui, o status de fechada garante que a comanda foi validada.
      // E para comandas abertas, vamos contar apenas como previsão, mas a métrica oficial 
      // de grana paga à fábrica a gente soma o valor dos "payments".
      
      const cDate = new Date(c.date + 'T12:00:00'); // Evita bug de timezone
      
      if (timeFilter === 'hoje') return isSameDay(cDate, today);
      if (timeFilter === 'mes') return isAfter(cDate, startOfMonth(today)) || isSameDay(cDate, startOfMonth(today));
      if (timeFilter === 'ano') return isAfter(cDate, startOfYear(today)) || isSameDay(cDate, startOfYear(today));
      return true;
    });
  }, [comandas, timeFilter]);

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

      <div className="desempenho-filters">
        <button
          className={`filter-btn ${timeFilter === 'hoje' ? 'filter-btn--active' : ''}`}
          onClick={() => setTimeFilter('hoje')}
        >
          Hoje
        </button>
        <button
          className={`filter-btn ${timeFilter === 'mes' ? 'filter-btn--active' : ''}`}
          onClick={() => setTimeFilter('mes')}
        >
          Este Mês
        </button>
        <button
          className={`filter-btn ${timeFilter === 'ano' ? 'filter-btn--active' : ''}`}
          onClick={() => setTimeFilter('ano')}
        >
          Este Ano
        </button>
        <button
          className={`filter-btn ${timeFilter === 'tudo' ? 'filter-btn--active' : ''}`}
          onClick={() => setTimeFilter('tudo')}
        >
          Total Acumulado
        </button>
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

        <div className="metric-card profit">
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
    </div>
  );
}
