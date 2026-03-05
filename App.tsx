
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
  Wrench,
  User,
  CreditCard,
  ArrowRightLeft
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
  AccountCategory,
  AccountSubcategory,
  BankAccount,
  Equipment,
  MaintenanceRecord,
  AdminUser,
  BankTransfer
} from './types';

// Components
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import VendorManager from './components/VendorManager';
import SalesManager from './components/SalesManager';
import ExpenseManager from './components/ExpenseManager';
import PayablesManager from './components/PayablesManager';
import ReceivablesManager from './components/ReceivablesManager';
import AccountPlanManager from './components/AccountPlanManager';
import BankAccountManager from './components/BankAccountManager';
import TransferManager from './components/TransferManager';
import ReportsManager from './components/ReportsManager';
import FleetManager from './components/FleetManager';
import SettingsManager from './components/SettingsManager';
import Login from './components/Login';
import Logo from './components/Logo';
import { useSupabaseSync } from './lib/useSupabaseSync';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const App: React.FC = () => {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-rose-500 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-rose-500/50 text-5xl">
          ⚠️
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">Erro Crítico de Publicação<br />(Falta de Variáveis na Vercel)</h1>
        <p className="text-xl text-slate-300 max-w-2xl leading-relaxed mb-8">
          O sistema não pôde ser iniciado porque as <strong className="text-white">Variáveis de Ambiente do Supabase</strong> não foram encontradas. Isso estava originando a "tela branca".
        </p>

        <div className="bg-slate-800 text-left p-6 sm:p-8 rounded-2xl border border-slate-700 max-w-3xl w-full shadow-2xl">
          <h2 className="text-amber-500 font-bold mb-6 uppercase tracking-widest text-sm flex items-center">
            Como Consertar Agora Mesmo:
          </h2>
          <ol className="list-decimal pl-5 space-y-4 text-slate-300">
            <li>Acesse o painel da <strong>Vercel</strong> e vá até o seu projeto.</li>
            <li>No menu superior esquerdo, clique em <strong>Settings</strong> e depois em <strong>Environment Variables</strong> (menu lateral).</li>
            <li>Adicione duas variáveis preenchendo <em>Name</em> e <em>Value</em> (Pegue os valores do seu painel do Supabase):
              <ul className="list-disc pl-5 mt-3 mb-2 space-y-2 text-sm font-mono text-amber-400 p-4 bg-slate-900 rounded-lg">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </li>
            <li className="text-rose-400 font-bold py-2">Atenção: Apenas salvar as variáveis no painel <span className="underline decoration-wavy underline-offset-4">NÃO APLICA</span> as mudanças! Você precisa gerar um novo Build (Deploy).</li>
            <li>Vá na aba principal <strong>Deployments</strong> (no menu que fica no topo do lado de Settings), clique nas reticências (<em>três pontinhos</em>) no deploy do topo da lista e clique em <strong>Redeploy</strong>.</li>
          </ol>
        </div>
      </div>
    );
  }

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedReportType, setSelectedReportType] = useState<string | null>('sales');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setCurrentUserEmail(session?.user?.email || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Date range for Dashboard
  const [dashStartDate, setDashStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [dashEndDate, setDashEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Data State
  const [customers, setCustomers, customersLoaded] = useSupabaseSync<Customer>('customers');
  const [vendors, setVendors, vendorsLoaded] = useSupabaseSync<Vendor>('vendors');
  const [vendorCategories, setVendorCategories, vcLoaded] = useSupabaseSync<VendorCategory>('vendor_categories');
  const [accountCategories, setAccountCategories, acLoaded] = useSupabaseSync<AccountCategory>('account_categories');
  const [sales, setSales, salesLoaded] = useSupabaseSync<Sale>('sales');
  const [expenses, setExpenses, expLoaded] = useSupabaseSync<Expense>('expenses');
  const [payments, setPayments, payLoaded] = useSupabaseSync<Payment>('payments');
  const [accountPlan, setAccountPlan, apLoaded] = useSupabaseSync<AccountPlan>('account_plans');
  const [accountSubcategories, setAccountSubcategories, ascLoaded] = useSupabaseSync<AccountSubcategory>('account_subcategories');
  const [bankAccounts, setBankAccounts, baLoaded] = useSupabaseSync<BankAccount>('bank_accounts');
  const [bankTransfers, setBankTransfers, btLoaded] = useSupabaseSync<BankTransfer>('bank_transfers');

  // Fleet State
  const [fleet, setFleet, fleetLoaded] = useSupabaseSync<Equipment>('equipment');
  const [maintenanceRecords, setMaintenanceRecords, mrLoaded] = useSupabaseSync<MaintenanceRecord>('maintenance_records');

  const allLoaded = customersLoaded && vendorsLoaded && vcLoaded && acLoaded && salesLoaded && expLoaded && payLoaded && apLoaded && ascLoaded && baLoaded && btLoaded && fleetLoaded && mrLoaded;

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

  const handleLogin = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
        return <CustomerManager
          customers={customers} setCustomers={setCustomers}
          sales={sales}
          onNavigateToReports={() => {
            setSelectedReportType('customersSummary');
            setCurrentView('reports');
          }}
        />;
      case 'vendors':
        return <VendorManager
          vendors={vendors} setVendors={setVendors}
          expenses={expenses}
          accountPlan={accountPlan}
          onNavigateToReports={() => {
            setSelectedReportType('vendorsSummary');
            setCurrentView('reports');
          }}
        />;
      case 'sales':
        return <SalesManager
          sales={sales} setSales={setSales}
          customers={customers} payments={payments}
          accountPlan={accountPlan}
          onNavigateToReports={() => {
            setSelectedReportType('sales');
            setCurrentView('reports');
          }}
        />;
      case 'expenses':
        return <ExpenseManager
          expenses={expenses} setExpenses={setExpenses}
          vendors={vendors} accountPlan={accountPlan}
          bankAccounts={bankAccounts}
          onNavigateToReports={() => {
            setSelectedReportType('expensesByMonthFlat');
            setCurrentView('reports');
          }}
        />;
      case 'payables':
        return <PayablesManager
          expenses={expenses} setExpenses={setExpenses}
          vendors={vendors} bankAccounts={bankAccounts}
          onNavigateToReports={() => {
            setSelectedReportType('bankStatement');
            setCurrentView('reports');
          }}
        />;
      case 'receivables':
        return <ReceivablesManager
          sales={sales} payments={payments}
          setPayments={setPayments} setSales={setSales}
          customers={customers} bankAccounts={bankAccounts}
          onNavigateToReports={() => {
            setSelectedReportType('bankStatement');
            setCurrentView('reports');
          }}
        />;
      case 'accountPlan':
        return <AccountPlanManager
          accountPlan={accountPlan}
          setAccountPlan={setAccountPlan}
          accountCategories={accountCategories}
          setAccountCategories={setAccountCategories}
          accountSubcategories={accountSubcategories}
          setAccountSubcategories={setAccountSubcategories}
          sales={sales}
          expenses={expenses}
          onNavigateToReports={() => {
            setSelectedReportType('accountCategoriesList');
            setCurrentView('reports');
          }}
        />;
      case 'banks':
        return <BankAccountManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} payments={payments} expenses={expenses} />;
      case 'transfers':
        return <TransferManager
          bankAccounts={bankAccounts}
          transfers={bankTransfers}
          setTransfers={setBankTransfers}
          onGoToReports={(type) => {
            if (type) setSelectedReportType(type);
            setCurrentView('reports');
          }}
        />;
      case 'reports':
        return <ReportsManager
          customers={customers}
          vendors={vendors}
          vendorCategories={vendorCategories}
          accountCategories={accountCategories}
          accountSubcategories={accountSubcategories}
          sales={sales}
          expenses={expenses}
          payments={payments}
          accountPlan={accountPlan}
          bankAccounts={bankAccounts}
          bankTransfers={bankTransfers}
          fleet={fleet}
          maintenanceRecords={maintenanceRecords}
          initialReport={selectedReportType as any}
        />;
      case 'fleet':
        return <FleetManager
          fleet={fleet} setFleet={setFleet}
          maintenanceRecords={maintenanceRecords} setMaintenanceRecords={setMaintenanceRecords}
        />;
      case 'settings':
        return <SettingsManager
          adminUser={{ username: currentUserEmail || 'Usuário', password: '' } as AdminUser}
          onUpdateUser={() => {
            // Placeholder temporário, daremos update depois.
          }}
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
      onClick={() => {
        if (id !== 'reports') {
          setSelectedReportType(null); // Clear or set to default when leaving
        } else {
          setSelectedReportType('sales'); // Ensure it defaults to sales when clicking from menu
        }
        setCurrentView(id);
      }}
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
          <NavItem id="sales" label="Faturamento" icon={Receipt} />
          <NavItem id="receivables" label="Contas a Receber" icon={HandCoins} />

          <div className="pt-4 pb-1 px-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Saídas</span>
          </div>
          <NavItem id="vendors" label="Fornecedores" icon={Truck} />
          <NavItem id="expenses" label="Lançar Despesas" icon={Wallet} />
          <NavItem id="payables" label="Contas a Pagar" icon={CreditCard} />

          <div className="pt-4 pb-1 px-4 border-t border-slate-800 mt-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Tesouraria</span>
          </div>
          <NavItem id="banks" label="Contas Bancárias" icon={Building2} />
          <NavItem id="transfers" label="Transferências" icon={ArrowRightLeft} />

          <div className="pt-6 pb-2 px-4 border-t border-slate-800 mt-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Relatórios</span>
          </div>
          <NavItem id="reports" label="Imprimir Relatórios" icon={Printer} />

          <div className="pt-4 pb-1 px-4 border-t border-slate-800 mt-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Equipamentos</span>
          </div>
          <NavItem id="fleet" label="Gestão de Frota" icon={Wrench} />

          <div className="pt-4 pb-1 px-4 border-t border-slate-800 mt-4">
            <span className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>Configurações</span>
          </div>
          <NavItem id="accountPlan" label="Plano de Contas" icon={BookOpen} />
          <NavItem id="settings" label="Acesso ao Sistema" icon={User} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 text-slate-400">
            <div className={`w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[10px] uppercase`}>
              {currentUserEmail ? currentUserEmail.substring(0, 2) : 'AD'}
            </div>
            {isSidebarOpen && <span className="text-xs font-semibold text-white truncate" title={currentUserEmail || 'Sistema'}>{currentUserEmail || 'Administração'}</span>}
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'} print:pl-0`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 print:hidden">
          <h1 className="text-xl font-bold text-slate-800">
            {currentView === 'dashboard' && 'Visão Geral'}
            {currentView === 'customers' && 'Gestão de Clientes'}
            {currentView === 'vendors' && 'Cadastro de Fornecedores'}
            {currentView === 'sales' && 'Faturamento'}
            {currentView === 'expenses' && 'Lançamentos de Despesas'}
            {currentView === 'payables' && 'Contas a Pagar'}
            {currentView === 'receivables' && 'Contas a Receber'}
            {currentView === 'accountPlan' && 'Plano de Contas'}
            {currentView === 'banks' && 'Contas Bancárias'}
            {currentView === 'transfers' && 'Transferências Bancárias'}
            {currentView === 'reports' && 'Módulo de Relatórios Gerenciais'}
            {currentView === 'fleet' && 'Controle de Frota e Manutenção'}
            {currentView === 'settings' && 'Configurações do Sistema'}
          </h1>
          <button
            onClick={async () => {
              sessionStorage.removeItem('dashboard_welcome_shown');
              await supabase.auth.signOut();
            }}
            className="text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors"
          >
            Sair
          </button>
        </header>
        <div className="p-8 print:p-0">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
