
import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  HandCoins,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Calculator,
  ArrowRight,
  Calendar,
  Wrench,
  CreditCard,
  X
} from 'lucide-react';
import { DashboardStats, Sale, Expense, Customer } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  sales: Sale[];
  expenses: Expense[];
  payments: any[];
  customers: Customer[];
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  hasFleetAlerts?: boolean;
  onNavigateToFleet?: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const Dashboard: React.FC<DashboardProps> = ({
  stats, sales, expenses, customers,
  startDate, endDate, setStartDate, setEndDate,
  hasFleetAlerts, onNavigateToFleet
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const netResult = stats.totalSales - stats.totalExpenses;

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('dashboard_welcome_shown');
    if (!hasShown) {
      setShowWelcomeModal(true);
      sessionStorage.setItem('dashboard_welcome_shown', 'true');
    }
  }, []);

  // Filtrar transações recentes baseadas na data selecionada para manter consistência
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);

  const chartData = [
    { name: 'Faturamento', value: stats.totalSales, fill: '#f59e0b' },
    { name: 'Recebido', value: stats.totalReceived, fill: '#10b981' },
    { name: 'Despesas', value: stats.totalExpenses, fill: '#ef4444' },
    { name: 'Lucro Líquido', value: netResult, fill: '#3b82f6' },
  ];

  const recentTransactions = [
    ...sales.filter(s => {
      const d = new Date(s.date).getTime();
      return d >= startTs && d <= endTs;
    }).map(s => ({ ...s, type: 'receita' as const })),
    ...expenses.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= startTs && d <= endTs;
    }).map(e => ({ ...e, type: 'despesa' as const }))
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  // Quick shortcut handlers
  const handleCurrentMonth = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA'));
    setEndDate(new Date().toLocaleDateString('en-CA'));
  };

  const handleLastMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    setStartDate(start.toLocaleDateString('en-CA'));
    setEndDate(end.toLocaleDateString('en-CA'));
  };

  const handle7Days = () => {
    const d = new Date();
    const start = new Date();
    start.setDate(d.getDate() - 7);
    setStartDate(start.toLocaleDateString('en-CA'));
    setEndDate(d.toLocaleDateString('en-CA'));
  };

  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const hasReceivablesToday = sales.some(s =>
    s.status !== 'Pago' &&
    (s.dueDate === todayDateStr || (s.installmentsList && s.installmentsList.some(i => i.status !== 'Pago' && i.dueDate === todayDateStr)))
  );
  const hasPayablesToday = expenses.some(e =>
    e.status !== 'Pago' && e.dueDate === todayDateStr
  );

  const todayStr = new Date().toLocaleDateString('en-CA');
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
  const lastMonthStartStr = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-CA');
  const lastMonthEndStr = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toLocaleDateString('en-CA');
  const sevenDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString('en-CA');
  })();

  const activeFilter = useMemo(() => {
    if (startDate === monthStartStr && endDate === todayStr) return 'current';
    if (startDate === lastMonthStartStr && endDate === lastMonthEndStr) return 'last';
    if (startDate === sevenDaysAgoStr && endDate === todayStr) return '7days';
    return 'custom';
  }, [startDate, endDate, todayStr, monthStartStr, lastMonthStartStr, lastMonthEndStr, sevenDaysAgoStr]);

  return (
    <div className="space-y-8">
      {/* Date Filter Panel - Style based on provided image */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Quick Shortcuts */}
        <div className="flex flex-col space-y-2 w-full lg:w-auto">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Atalhos Rápidos</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCurrentMonth}
              className={`flex-1 lg:flex-none px-6 py-2.5 font-black text-[11px] rounded-xl border transition-colors uppercase tracking-tight ${activeFilter === 'current'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
            >
              Mês Atual
            </button>
            <button
              onClick={handleLastMonth}
              className={`flex-1 lg:flex-none px-6 py-2.5 font-black text-[11px] rounded-xl border transition-colors uppercase tracking-tight ${activeFilter === 'last'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
            >
              Mês Passado
            </button>
            <button
              onClick={handle7Days}
              className={`flex-1 lg:flex-none px-6 py-2.5 font-black text-[11px] rounded-xl border transition-colors uppercase tracking-tight ${activeFilter === '7days'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
            >
              7 Dias
            </button>
          </div>
        </div>

        {/* Right: Manual Date Selection */}
        <div className="flex items-center space-x-4 w-full lg:w-auto">
          <div className="flex flex-col space-y-1 flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Inicial</span>
            <div className="relative">
              <input
                type="date"
                className="w-full lg:w-48 pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col space-y-1 flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Final</span>
            <div className="relative">
              <input
                type="date"
                className="w-full lg:w-48 pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500 to-amber-600">
              <h2 className="text-2xl font-black text-white">Resumo do Dia</h2>
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-slate-600 font-medium text-lg text-center mb-8">
                Aqui estão as suas notificações pendentes para hoje:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-2xl border-2 shadow-sm flex flex-col items-center text-center transition-all ${hasReceivablesToday ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`p-4 rounded-full mb-4 ${hasReceivablesToday ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-200 text-slate-400'}`}>
                    <HandCoins size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Contas a Receber</h3>
                  {hasReceivablesToday ? (
                    <span className="text-2xl font-black text-amber-600 flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      SIM
                    </span>
                  ) : (
                    <span className="text-xl font-black text-slate-300">NÃO</span>
                  )}
                </div>

                <div className={`p-6 rounded-2xl border-2 shadow-sm flex flex-col items-center text-center transition-all ${hasPayablesToday ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`p-4 rounded-full mb-4 ${hasPayablesToday ? 'bg-rose-100 text-rose-600 shadow-inner' : 'bg-slate-200 text-slate-400'}`}>
                    <CreditCard size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Contas a Pagar</h3>
                  {hasPayablesToday ? (
                    <span className="text-2xl font-black text-rose-600 flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      SIM
                    </span>
                  ) : (
                    <span className="text-xl font-black text-slate-300">NÃO</span>
                  )}
                </div>

                <div className={`p-6 rounded-2xl border-2 shadow-sm flex flex-col items-center text-center transition-all ${hasFleetAlerts ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`p-4 rounded-full mb-4 ${hasFleetAlerts ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-slate-200 text-slate-400'}`}>
                    <Wrench size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Controle Frota</h3>
                  {hasFleetAlerts ? (
                    <button
                      onClick={() => {
                        setShowWelcomeModal(false);
                        if (onNavigateToFleet) onNavigateToFleet();
                      }}
                      className="text-lg font-black text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 cursor-pointer uppercase mt-1"
                    >
                      VER
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <span className="text-xl font-black text-emerald-500">TUDO OK</span>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
                >
                  Ir para o Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Vendas</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Faturamento Bruto</h3>
          <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Custos</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Despesas Totais</h3>
          <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(stats.totalExpenses)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Calculator size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultado DRE</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Lucro Líquido</h3>
          <p className={`text-2xl font-black mt-1 ${netResult >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {formatCurrency(netResult)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <HandCoins size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Em Caixa</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Realizado (Recebido)</h3>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.totalReceived)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2 text-amber-500" /> Fluxo Financeiro (Bruto vs Custos)
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Movimentações no Período</h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? recentTransactions.map((item: any, idx) => (
              <div key={item.id + idx} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${item.type === 'receita' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                    {item.type === 'receita' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                      {item.type === 'receita' ? item.customerName : item.vendorName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatDateDisplay(item.date)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-black text-sm ${item.type === 'receita' ? 'text-slate-800' : 'text-rose-600'}`}>
                    {item.type === 'receita' ? '+' : '-'}{formatCurrency(item.totalValue)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${item.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-400 italic">Nenhuma movimentação neste período.</div>
            )}
          </div>
          {recentTransactions.length > 0 && (
            <button className="w-full mt-6 py-2 text-xs font-bold text-slate-500 hover:text-amber-500 flex items-center justify-center border-t border-slate-50">
              VER TODAS <ArrowRight size={14} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
