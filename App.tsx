
import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Receipt,
  Menu,
  X,
  BookOpen,
  Building2,
  Truck,
  Wallet,
  Printer,
  Wrench
} from 'lucide-react';
import {
  Customer,
  Vendor,
  VendorCategory,
  Sale,
  Expense,
  Payment,
  View,
  DashboardStats,
  AccountPlan,
  BankAccount,
  Equipment,
  MaintenanceRecord
} from './types';

// Components
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import VendorManager from './components/VendorManager';
import SalesManager from './components/SalesManager';
import ExpenseManager from './components/ExpenseManager';
import ReceivablesManager from './components/ReceivablesManager';
import AccountPlanManager from './components/AccountPlanManager';
import BankAccountManager from './components/BankAccountManager';
import ReportsManager from './components/ReportsManager';
import FleetManager from './components/FleetManager';
import Logo from './components/Logo';
import { useSupabaseSync } from './lib/useSupabaseSync';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Date range for Dashboard
  const [dashStartDate, setDashStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dashEndDate, setDashEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Data State
  const [customers, setCustomers, customersLoaded] = useSupabaseSync<Customer>('customers');
  const [vendors, setVendors, vendorsLoaded] = useSupabaseSync<Vendor>('vendors');
  const [vendorCategories, setVendorCategories, vcLoaded] = useSupabaseSync<VendorCategory>('vendor_categories');
  const [sales, setSales, salesLoaded] = useSupabaseSync<Sale>('sales');
  const [expenses, setExpenses, expLoaded] = useSupabaseSync<Expense>('expenses');
  const [payments, setPayments, payLoaded] = useSupabaseSync<Payment>('payments');
  const [accountPlan, setAccountPlan, apLoaded] = useSupabaseSync<AccountPlan>('account_plans');
  const [bankAccounts, setBankAccounts, baLoaded] = useSupabaseSync<BankAccount>('bank_accounts');

  // Fleet State
  const [fleet, setFleet, fleetLoaded] = useSupabaseSync<Equipment>('equipment');
  const [maintenanceRecords, setMaintenanceRecords, mrLoaded] = useSupabaseSync<MaintenanceRecord>('maintenance_records');

  const allLoaded = customersLoaded && vendorsLoaded && vcLoaded && salesLoaded && expLoaded && payLoaded && apLoaded && baLoaded && fleetLoaded && mrLoaded;

  // --- Logic for Next Due Dates & Alerts ---
  const hasFleetAlerts = useMemo(() => {
    const today = new Date();
    let hasAlert = false;

    for (const equip of fleet) {
      if (hasAlert) break;
      for (const key of Object.keys(equip.intervals)) {
        const itemKey = key as keyof typeof equip.intervals;

        const lastMaint = maintenanceRecords
          .filter(r => r.equipmentId === equip.id && r.performedItems.includes(itemKey as any))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastMaint) {
          const lastDate = new Date(lastMaint.date);
          const nextDate = new Date(lastDate);
          nextDate.setMonth(lastDate.getMonth() + equip.intervals[itemKey]);

          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 15) {
            hasAlert = true;
            break;
          }
        }
      }
    }

    return hasAlert;
  }, [fleet, maintenanceRecords]);

  const stats: DashboardStats = useMemo(() => {
    const start = new Date(dashStartDate).getTime();
    const end = new Date(dashEndDate).setHours(23, 59, 59, 999);

    const filteredSales = sales.filter(s => {
      const d = new Date(s.date).getTime();
      return d >= start && d <= end;
    });

    const filteredPayments = payments.filter(p => {
      const d = new Date(p.date).getTime();
      return d >= start && d <= end;
    });

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= start && d <= end;
    });

    const totalSales = filteredSales.reduce((acc, sale) => acc + sale.totalValue, 0);
    const totalReceived = filteredPayments.reduce((acc, pay) => acc + pay.amount, 0);
    const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.totalValue, 0);
    const totalPaidExpenses = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, exp) => acc + exp.totalValue, 0);

    return {
      totalSales,
      totalReceived,
      totalPending: totalSales - totalReceived,
      totalExpenses,
      totalPaidExpenses,
      customerCount: customers.length
    };
  }, [sales, payments, customers, expenses, dashStartDate, dashEndDate]);

  if (!allLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse flex items-center space-x-3"><div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div><span className="text-xl font-bold text-slate-500">Sincronizando com Supabase...</span></div></div>;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            sales={sales}
            expenses={expenses}
            payments={payments}
            customers={customers}
            startDate={dashStartDate}
            endDate={dashEndDate}
            setStartDate={setDashStartDate}
            setEndDate={setDashEndDate}
            hasFleetAlerts={hasFleetAlerts}
            onNavigateToFleet={() => setCurrentView('fleet')}
          />
        );
      case 'customers':
        return <CustomerManager customers={customers} setCustomers={setCustomers} />;
      case 'vendors':
        return <VendorManager
          vendors={vendors} setVendors={setVendors}
          vendorCategories={vendorCategories} setVendorCategories={setVendorCategories}
        />;
      case 'sales':
        return <SalesManager
          sales={sales} setSales={setSales}
          customers={customers} payments={payments}
          accountPlan={accountPlan}
        />;
      case 'expenses':
        return <ExpenseManager
          expenses={expenses} setExpenses={setExpenses}
          vendors={vendors} accountPlan={accountPlan}
          bankAccounts={bankAccounts}
        />;
      case 'receivables':
        return <ReceivablesManager
          sales={sales} payments={payments}
          setPayments={setPayments} setSales={setSales}
          customers={customers} bankAccounts={bankAccounts}
        />;
      case 'accountPlan':
        return <AccountPlanManager
          accountPlan={accountPlan}
          setAccountPlan={setAccountPlan}
        />;
      case 'banks':
        return <BankAccountManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />;
      case 'reports':
        return <ReportsManager
          customers={customers}
          vendors={vendors}
          vendorCategories={vendorCategories}
          sales={sales}
          expenses={expenses}
          payments={payments}
          accountPlan={accountPlan}
          bankAccounts={bankAccounts}
          fleet={fleet}
          maintenanceRecords={maintenanceRecords}
        />;
      case 'fleet':
        return <FleetManager
          fleet={fleet} setFleet={setFleet}
          maintenanceRecords={maintenanceRecords} setMaintenanceRecords={setMaintenanceRecords}
        />;
      default:
        return <Dashboard
          stats={stats} sales={sales} expenses={expenses} payments={payments} customers={customers}
          startDate={dashStartDate} endDate={dashEndDate} setStartDate={setDashStartDate} setEndDate={setDashEndDate}
          hasFleetAlerts={hasFleetAlerts}
          onNavigateToFleet={() => setCurrentView('fleet')}
        />;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: View, label: string, icon: any }) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === id
        ? 'bg-amber-500 text-white shadow-md font-bold'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
        }`}
    >
      <Icon size={20} />
      {isSidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col fixed inset-y-0 z-50 print:hidden`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen ? (
            <Logo size="sm" className="bg-white/10 p-2 rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-amber-500 rounded flex items-center justify-center text-white font-black">TB</div>
          )}
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white p-1">
            {isSidebarOpen ? <X size={20} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <NavItem id="dashboard" label="Painel Geral" icon={LayoutDashboard} />

          <div className="pt-4 pb-1 px-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Entradas</span>
          </div>
          <NavItem id="customers" label="Clientes" icon={Users} />
          <NavItem id="sales" label="Vendas de Serviços" icon={Receipt} />
          <NavItem id="receivables" label="Baixa de Recebíveis" icon={HandCoins} />

          <div className="pt-4 pb-1 px-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Saídas</span>
          </div>
          <NavItem id="vendors" label="Fornecedores" icon={Truck} />
          <NavItem id="expenses" label="Lançar Despesas" icon={Wallet} />

          <div className="pt-4 pb-1 px-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Equipamentos</span>
          </div>
          <NavItem id="fleet" label="Gestão de Frota" icon={Wrench} />

          <div className="pt-6 pb-2 px-4 border-t border-slate-800 mt-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Relatórios</span>
          </div>
          <NavItem id="reports" label="Imprimir Relatórios" icon={Printer} />

          <div className="pt-4 pb-1 px-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Configurações</span>
          </div>
          <NavItem id="accountPlan" label="Plano de Contas" icon={BookOpen} />
          <NavItem id="banks" label="Contas Banco" icon={Building2} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[10px]">TB</div>
            {isSidebarOpen && <span className="text-xs font-semibold text-white">Administração</span>}
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'} print:pl-0`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 print:hidden">
          <h1 className="text-xl font-bold text-slate-800">
            {currentView === 'dashboard' && 'Visão Geral'}
            {currentView === 'customers' && 'Gestão de Clientes'}
            {currentView === 'vendors' && 'Cadastro de Fornecedores'}
            {currentView === 'sales' && 'Vendas de Serviços'}
            {currentView === 'expenses' && 'Controle de Despesas'}
            {currentView === 'receivables' && 'Contas a Receber'}
            {currentView === 'accountPlan' && 'Plano de Contas'}
            {currentView === 'banks' && 'Contas Bancárias'}
            {currentView === 'reports' && 'Módulo de Relatórios Gerenciais'}
            {currentView === 'fleet' && 'Controle de Frota e Manutenção'}
          </h1>
        </header>
        <div className="p-8 print:p-0">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
