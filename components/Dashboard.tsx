
import React from 'react';
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
  Calendar
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

const Dashboard: React.FC<DashboardProps> = ({ 
  stats, sales, expenses, customers, 
  startDate, endDate, setStartDate, setEndDate,
  hasFleetAlerts, onNavigateToFleet
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const netResult = stats.totalSales - stats.totalExpenses;

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
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const handleLastMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handle30Days = () => {
    const d = new Date();
    const start = new Date();
    start.setDate(d.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-8">
      {/* Date Filter Panel - Style based on provided image */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Quick Shortcuts */}
        <div className="flex flex-col space-y-2 w-full lg:w-auto">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Atalhos Rápidos</span>
          <div className="flex items-center space-x-2">
            {hasFleetAlerts && (
              <button 
                onClick={onNavigateToFleet}
                className="flex-1 lg:flex-none px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[11px] rounded-xl border border-rose-200 transition-colors uppercase tracking-tight flex items-center space-x-1"
              >
                <AlertCircle size={14} />
                <span>Ver Controle Preventivo</span>
              </button>
            )}
            <button 
              onClick={handleCurrentMonth}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[11px] rounded-xl border border-slate-200 transition-colors uppercase tracking-tight"
            >
              Mês Atual
            </button>
            <button 
              onClick={handleLastMonth}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[11px] rounded-xl border border-slate-200 transition-colors uppercase tracking-tight"
            >
              Mês Passado
            </button>
            <button 
              onClick={handle30Days}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[11px] rounded-xl border border-slate-200 transition-colors uppercase tracking-tight"
            >
              30 Dias
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultado</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Saldo Líquido</h3>
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-black text-sm ${item.type === 'receita' ? 'text-slate-800' : 'text-rose-600'}`}>
                    {item.type === 'receita' ? '+' : '-'}{formatCurrency(item.totalValue)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    item.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
