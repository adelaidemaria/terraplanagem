
import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Calendar,
  Users,
  Truck,
  Receipt,
  HandCoins,
  BookOpen,
  Building2,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wrench,
  AlertTriangle,
  History,
  Timer,
  Clock
} from 'lucide-react';
import {
  Customer,
  Vendor,
  VendorCategory,
  Sale,
  Expense,
  Payment,
  AccountPlan,
  AccountCategory,
  AccountSubcategory,
  BankAccount,
  Equipment,
  MaintenanceRecord,
  MaintenanceIntervals,
  BankTransfer,
  AgendaItem,
  FinancialYield,
  CorporateCard,
  CorporateCardPayment,
  CompanyVehicle,
  CTR,
  Orcamento,
  Funcionario,
  EmprestimoFuncionario,
  CompanyLoan
} from '../types';
import Logo from './Logo';

type ReportType = 'customers' | 'vendors' | 'customersSummary' | 'vendorsSummary' | 'sales' | 'receivables' | 'payments' | 'accountPlan' | 'accountCategoriesList' | 'banks' | 'bankStatement' | 'corporateCard' | 'fleetAlerts' | 'fleetHistory' | 'fleetIntervals' | 'expensesPending' | 'expensesByMonth' | 'expensesByMonthFlat' | 'receivablesPending' | 'cardFees' | 'dre' | 'agenda' | 'customerStatement' | 'cashFlow' | 'ctr' | 'orcamentos' | 'employees' | 'employeeLoans' | 'companyLoans';

interface ReportsManagerProps {
  customers: Customer[];
  vendors: Vendor[];
  vendorCategories: VendorCategory[];
  sales: Sale[];
  expenses: Expense[];
  payments: Payment[];
  accountPlan: AccountPlan[];
  accountCategories: AccountCategory[];
  accountSubcategories: AccountSubcategory[];
  bankAccounts: BankAccount[];
  bankTransfers: BankTransfer[];
  yields?: FinancialYield[];
  fleet: Equipment[];
  maintenanceRecords: MaintenanceRecord[];
  agendaItems?: AgendaItem[];
  corporateCards?: CorporateCard[];
  corporateCardPayments?: CorporateCardPayment[];
  initialReport?: ReportType;
  companyVehicles: CompanyVehicle[];
  ctrs: CTR[];
  orcamentos?: Orcamento[];
  employees?: Funcionario[];
  employeeLoans?: EmprestimoFuncionario[];
  companyLoans?: CompanyLoan[];
}

const itemLabels: Record<keyof MaintenanceIntervals, string> = {
  oilChange: 'Troca de Óleo Motor',
  dieselFilter: 'Filtro de Diesel',
  oilFilter: 'Filtro de Óleo',
  internalAirFilter: 'Filtro Ar Interno',
  externalAirFilter: 'Filtro Ar Externo',
  bleedDieselFilter: 'Sangrar Filtro Diesel',
  others: 'Outras Manutenções'
};

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const getStatusLabel = (p: { status: string; vencimento: string }, type: 'payable' | 'receivable' = 'payable') => {
  if (p.status === 'Pago' || p.status === 'CONCLUÍDO') return 'PAGO';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(p.vencimento + 'T12:00:00');
  dueDate.setHours(0, 0, 0, 0);
  if (dueDate < today) return 'PENDENTE';
  return type === 'payable' ? 'A PAGAR' : 'A RECEBER';
};

const ReportsManager: React.FC<ReportsManagerProps> = ({
  customers, vendors, vendorCategories, sales, expenses, payments, accountPlan, accountCategories, accountSubcategories, bankAccounts, bankTransfers,  yields = [],
  fleet,
  maintenanceRecords,
  companyVehicles,
  agendaItems = [],
  corporateCards = [],
  corporateCardPayments = [],
  ctrs = [],
  orcamentos = [],
  employees = [],
  employeeLoans = [],
  companyLoans = [],
  initialReport
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(initialReport || 'sales');

  useEffect(() => {
    if (initialReport === 'agenda') {
      setSelectedReport('agenda');
      setPeriod('7days');
      const today = new Date();
      setStartDate(today.toLocaleDateString('en-CA'));
      const end = new Date();
      end.setDate(today.getDate() + 6);
      setEndDate(end.toLocaleDateString('en-CA'));
    } else if (initialReport) {
      setSelectedReport(initialReport);
    }
  }, [initialReport]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA');
  });
  const [receivablesFilter, setReceivablesFilter] = useState<'all' | 'withNf' | 'withoutNf'>('all');
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Ativos');
  const [period, setPeriod] = useState<'current' | 'last' | '7days' | 'year' | 'custom' | 'today'>('current');
  const [agendaStatus, setAgendaStatus] = useState<'all' | 'pending' | 'scheduled' | 'completed'>('all');
  const [agendaCategory, setAgendaCategory] = useState<'all' | 'Lembrete' | 'Urgente'>('all');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('all');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatMonths = (n: number) => n === 1 ? '1 Mês' : `${n} Meses`;

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const setMonthRange = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA'));
    setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA'));
  };

  const sortedExpenseAccounts = useMemo(() => {
    return [...accountPlan]
      .filter(p => p.type === 'Despesa')
      .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
  }, [accountPlan]);

  const reportContent = useMemo(() => {
    if (!selectedReport) return null;

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

    // Helper para filtragem robusta de clientes
    const matchesClient = (item: { customerId?: string; customerName?: string }) => {
      if (selectedCustomerId === 'all') return true;
      const target = customers.find(c => c.id === selectedCustomerId);
      const targetId = String(selectedCustomerId);
      const targetName = target?.name;
      return String(item.customerId) === targetId || (targetName && item.customerName === targetName);
    };

    const getFleetAlerts = (statusFilter: 'overdue' | 'upcoming' | 'all') => {
      const alerts: any[] = [];
      const today = new Date();
      fleet.forEach(equip => {
        Object.keys(equip.intervals).forEach((key) => {
          const itemKey = key as keyof MaintenanceIntervals;
          const lastMaint = maintenanceRecords
            .filter(r => r.equipmentId === equip.id && r.performedItems.includes(itemKey))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          if (lastMaint) {
            const lastDate = new Date(lastMaint.date);
            const nextDate = new Date(lastDate);
            nextDate.setMonth(lastDate.getMonth() + equip.intervals[itemKey]);
            const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: 'overdue' | 'upcoming' | 'ok' = 'ok';
            if (diffDays <= 0) status = 'overdue';
            else if (diffDays <= 30) status = 'upcoming';

            if (statusFilter === 'all' || status === statusFilter) {
              const v = companyVehicles.find(v => v.id === equip.vehicleId);
              alerts.push({
                equipName: v ? `${v.type} - ${v.model}` : 'Veículo não encontrado',
                item: itemLabels[itemKey],
                dueDate: nextDate.toLocaleDateString(),
                daysLeft: diffDays,
                statusText: diffDays <= 0 ? `Vencido há ${Math.abs(diffDays)} dias` : `Vence em ${diffDays} dias`,
                status
              });
            }
          }
        });
      });
      return alerts;
    };

    switch (selectedReport) {
      case 'agenda': {
        const todayStr = new Date().toLocaleDateString('en-CA');

        const filteredAgenda = agendaItems
          .filter(a => {
            // Date Filter
            const dStr = a.scheduledDate;
            const d = new Date(dStr).getTime();
            const inDateRange = d >= startTimestamp && d <= endTimestamp;
            if (!inDateRange) return false;

            // Category Filter
            if (agendaCategory !== 'all' && a.category !== agendaCategory) return false;

            // Status Filter
            const status = a.completed ? 'completed' : (a.scheduledDate < todayStr ? 'pending' : 'scheduled');
            if (agendaStatus === 'all') {
              // Return only non-completed if "Todos" (matching AgendaManager behavior)
              // but usually for reports "Todos" means everything. 
              // However user said "igual tem na tela de cadastro agenda".
              // In AgendaManager I made "all" hide completed.
              // Let's check user's previous request: "NA OPÇÃO TODOS, MOSTRAR SOMENTE OS AGENDADOS E PENDENTES"
              return !a.completed;
            }
            return status === agendaStatus;
          })
          .sort((a, b) => {
            const dateCmp = (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
            if (dateCmp !== 0) return dateCmp;
            return a.category === 'Urgente' ? -1 : 1;
          });

        return {
          title: `Relatório de Agendamentos / Tarefas - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Listagem dos lembretes e tarefas urgentes.',
          headers: ['Data Programada', 'Título / Descrição', 'Categoria', 'Status'],
          rows: filteredAgenda.map(item => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const statusLabel = item.completed ? 'CONCLUÍDO' : (item.scheduledDate < todayStr ? 'PENDENTE' : 'AGENDADO');
            return [
              formatDateDisplay(item.scheduledDate),
              `${item.title}\n${item.description || ''}`,
              (item.category || '').toUpperCase(),
              statusLabel
            ];
          })
        };
      }
      case 'expensesPending': {
        const pending = expenses
          .filter(e => {
            // Exclui despesas de cartão corporativo (são consideradas pagas ao fornecedor via cartão)
            if (e.paymentMethod === 'Cartão Corporativo') return false;

            const balance = e.totalValue - (e.amountPaid || 0);
            if (balance <= 0.01) return false;

            // Filtro por Categoria
            const matchesCategory = selectedCategoryId === 'all' || e.accountPlanId === selectedCategoryId;
            if (!matchesCategory) return false;

            // Filtro por Data (Vencimento ou Emissão)
            const refDate = e.dueDate ? new Date(e.dueDate) : new Date(e.date);
            const d = refDate.getTime();
            return d >= startTimestamp && d <= endTimestamp;
          })
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.date).getTime();
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.date).getTime();
            return dateA - dateB;
          });

        return {
          title: `Relatório de Contas a Pagar - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Listagem de despesas cadastradas que ainda não foram baixadas (pagas).',
          headers: ['Tipo de Despesa', 'Fornecedor', 'Documento', 'Data Doc', 'Vencimento', 'Status', 'Valor'],
          rows: pending.map(e => [
            accountPlan.find(p => p.id === e.accountPlanId) ? `${accountPlan.find(p => p.id === e.accountPlanId)?.subcategory} / ${accountPlan.find(p => p.id === e.accountPlanId)?.description}` : '---',
            e.vendorName,
            e.docNumber || 'S/N',
            formatDateDisplay(e.date),
            e.dueDate ? formatDateDisplay(e.dueDate) : '---',
            getStatusLabel({ status: e.status, vencimento: e.dueDate || e.date }, 'payable'),
            formatCurrency(e.totalValue - (e.amountPaid || 0))
          ]),
          total: pending.reduce((acc, e) => acc + (e.totalValue - (e.amountPaid || 0)), 0)
        };
      }
      case 'expensesByMonth': {
        const filteredExps = expenses.filter(e => {
          const matchesCategory = selectedCategoryId === 'all' || e.accountPlanId === selectedCategoryId;
          const d = new Date(e.date).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp;
        });

        const filteredYieldsAsExps = (yields || []).filter(y => {
          const ap = accountPlan.find(p => p.id === y.accountPlanId);
          if (ap?.type !== 'Despesa') return false;
          const matchesCategory = selectedCategoryId === 'all' || y.accountPlanId === selectedCategoryId;
          const d = new Date(y.date).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp;
        }).map(y => ({
          id: y.id,
          date: y.date,
          accountPlanId: y.accountPlanId,
          vendorName: (y.description || '').split(' (Ref:')[0],
          totalValue: y.amount,
          docNumber: 'S/N',
        }));

        const allExpensesMerged = [...filteredExps, ...filteredYieldsAsExps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const expensesByMonthMap = new Map<string, any[]>();
        allExpensesMerged.forEach(e => {
          let monthKey = '';
          if (e.date && e.date.includes('-')) {
            const parts = e.date.split('-');
            monthKey = `${parts[1]}/${parts[0]}`;
          } else {
            const d = new Date(e.date);
            monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          }
          if (!expensesByMonthMap.has(monthKey)) expensesByMonthMap.set(monthKey, []);
          expensesByMonthMap.get(monthKey)!.push(e);
        });

        const rows: any[] = [];
        let monthIndex = 0;

        expensesByMonthMap.forEach((monthExps, month) => {
          if (monthIndex > 0) {
            rows.push(['MONTH_SEPARATOR', '', '', '', '', '']);
          }

          // Agrupar por Categoria (Account Plan) dentro do mês
          const byCategoryMap = new Map<string, any[]>();
          monthExps.forEach(e => {
            const catId = e.accountPlanId;
            const apEntry = accountPlan.find(ap => ap.id === catId);
            const subcat = apEntry ? `${apEntry.subcategory} / ${apEntry.description}` : 'DIVERSOS';
            if (!byCategoryMap.has(subcat)) byCategoryMap.set(subcat, []);
            byCategoryMap.get(subcat)!.push(e);
          });

          byCategoryMap.forEach((catExps, catName) => {
            if (rows.length > 0 && rows[rows.length - 1][0] !== 'MONTH_SEPARATOR') rows.push(['', '', '', '', '', '']);
            rows.push([`MÊS: ${month} - CONTA: ${catName.toUpperCase()}`, '', '', '', '', '']);
            rows.push(['COLUMN_HEADERS', '', '', '', '', '']);
            catExps.forEach(e => {
              const ap = accountPlan.find(p => p.id === e.accountPlanId);
              rows.push([
                formatDateDisplay(e.date),
                ap ? ap.description : 'DIVERSOS',
                e.docNumber || 'S/N',
                e.vendorName,
                formatCurrency(e.totalValue)
              ]);
            });
            const subtotal = catExps.reduce((sum, e) => sum + e.totalValue, 0);
            rows.push([`SUBTOTAL CONTA: ${catName}`, '', '', '', formatCurrency(subtotal)]);
          });

          const totalMonth = monthExps.reduce((sum, e) => sum + e.totalValue, 0);
          rows.push([`TOTAL DO MÊS: ${month}`, 'IS_TOTAL_MONTH', '', '', formatCurrency(totalMonth)]);
          monthIndex++;
        });

        return {
          title: `Relatório de Despesas por Conta - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Data Doc', 'Despesa', 'Doc', 'Fornecedor', 'Valor'],
          rows: rows,
          total: allExpensesMerged.reduce((acc, curr) => acc + curr.totalValue, 0)
        };
      }
      case 'expensesByMonthFlat': {
        const filteredExps = expenses.filter(e => {
          const matchesCategory = selectedCategoryId === 'all' || e.accountPlanId === selectedCategoryId;
          const d = new Date(e.date).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp;
        });

        const filteredYieldsAsExps = (yields || []).filter(y => {
          const ap = accountPlan.find(p => p.id === y.accountPlanId);
          if (ap?.type !== 'Despesa') return false;
          const matchesCategory = selectedCategoryId === 'all' || y.accountPlanId === selectedCategoryId;
          const d = new Date(y.date).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp;
        }).map(y => ({
          id: y.id,
          date: y.date,
          accountPlanId: y.accountPlanId,
          vendorName: (y.description || '').split(' (Ref:')[0],
          totalValue: y.amount,
          docNumber: 'S/N',
        }));

        const allExpensesMerged = [...filteredExps, ...filteredYieldsAsExps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const expensesByMonthMap = new Map<string, any[]>();
        allExpensesMerged.forEach(e => {
          let monthKey = '';
          if (e.date && e.date.includes('-')) {
            const parts = e.date.split('-');
            monthKey = `${parts[1]}/${parts[0]}`;
          } else {
            const d = new Date(e.date);
            monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          }
          if (!expensesByMonthMap.has(monthKey)) expensesByMonthMap.set(monthKey, []);
          expensesByMonthMap.get(monthKey)!.push(e);
        });

        const rows: any[] = [];
        let monthIndex = 0;

        expensesByMonthMap.forEach((monthExps, month) => {
          if (monthIndex > 0) {
            rows.push(['MONTH_SEPARATOR', '', '', '', '', '']);
          }

          rows.push([`MÊS: ${month}`, '', '', '', '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '']);

          monthExps.forEach(e => {
            const ap = accountPlan.find(p => p.id === e.accountPlanId);
            rows.push([
              formatDateDisplay(e.date),
              ap ? `${ap.subcategory} / ${ap.description}` : 'DIVERSOS',
              e.docNumber || 'S/N',
              e.vendorName,
              formatCurrency(e.totalValue)
            ]);
          });

          const totalMonth = monthExps.reduce((sum, e) => sum + e.totalValue, 0);
          rows.push([`TOTAL DO MÊS: ${month}`, 'IS_TOTAL_MONTH', '', '', formatCurrency(totalMonth)]);
          monthIndex++;
        });

        return {
          title: `Relatório de Despesas por Mês - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Data Doc', 'Despesa', 'Doc', 'Fornecedor', 'Valor'],
          rows: rows,
          total: allExpensesMerged.reduce((acc, curr) => acc + curr.totalValue, 0)
        };
      }
      case 'customerStatement': {
        const targetCustomers = selectedCustomerId === 'all'
          ? customers
          : customers.filter(c => c.id === selectedCustomerId);

        const targetCustomerIds = new Set(targetCustomers.map(c => c.id));
        const targetCustomerNames = new Set(targetCustomers.map(c => c.name));

        const isTarget = (s: any) => targetCustomerIds.has(s.customerId) || targetCustomerNames.has(s.customerName);

        const itemsByCustomer = new Map<string, {
          name: string;
          initialBalance: number;
          items: any[];
        }>();

        // Inicializando o map para os clientes selecionados
        targetCustomers.forEach(c => {
          itemsByCustomer.set(c.name, {
            name: c.name,
            initialBalance: 0,
            items: []
          });
        });

        const getCustomerData = (name: string) => {
          if (!itemsByCustomer.has(name)) {
            itemsByCustomer.set(name, {
              name: name,
              initialBalance: 0,
              items: []
            });
          }
          return itemsByCustomer.get(name)!;
        };

        // 1. Faturamentos (Débitos na conta do cliente)
        sales.filter(s => isTarget(s)).forEach(s => {
          const cData = getCustomerData(s.customerName);
          const d = new Date(s.date).getTime();
          if (d < startTimestamp) {
            cData.initialBalance += s.totalValue;
          } else if (d >= startTimestamp && d <= endTimestamp) {
            cData.items.push({
              date: s.date,
              history: `Faturamento NF: ${s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N')} (${s.paymentCondition})`,
              billed: s.totalValue + (s.deductions || 0),
              received: 0,
              fee: 0,
              deductions: s.deductions || 0
            });
          }
        });

        // 2. Recebimentos (Créditos na conta do cliente)
        sales.filter(s => isTarget(s)).forEach(s => {
          const cData = getCustomerData(s.customerName);
          const salePayments = payments.filter(p => p.saleId === s.id);
          salePayments.forEach(p => {
            const d = new Date(p.date).getTime();
            if (d < startTimestamp) {
              cData.initialBalance -= (p.amount + (p.fee || 0));
            } else if (d >= startTimestamp && d <= endTimestamp) {
              const bank = bankAccounts.find(b => b.id === p.bankAccountId);
              let historyText = `Receb. NF: ${s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N')}`;

              let parcText = ' / Parc. Única';
              if (p.installmentId && s.installmentsList) {
                const inst = s.installmentsList.find(i => i.id === p.installmentId);
                if (inst && s.installmentsList.length > 1) {
                  parcText = ` / Parc. ${inst.number}/${s.installmentsList.length}`;
                }
              }

              let methodText = p.method || '';
              if (methodText.includes('Cartão')) methodText = 'Cartão';
              if (methodText.includes('Transferência')) methodText = 'Transf.';

              if (bank) {
                const shortBankName = bank.bankName
                  .replace(/ C\/C| CC| C\.C\.| Conta Corrente/ig, '')
                  .replace(/Banco do Brasil/ig, 'BB')
                  .trim();
                historyText += `${parcText} - ${shortBankName}/${methodText}`;
              } else {
                historyText += `${parcText} - ${methodText}`;
              }

              cData.items.push({
                date: p.date,
                history: historyText,
                billed: 0,
                received: p.amount,
                fee: p.fee || 0,
                deductions: 0
              });
            }
          });
        });

        const rows: any[] = [];
        let grandTotal = 0;
        let customerIndex = 0;

        // Ordenar clientes alfabeticamente
        const sortedCustomers = Array.from(itemsByCustomer.values()).sort((a, b) => a.name.localeCompare(b.name));

        sortedCustomers.forEach(cData => {
          // Skip se nao tem movimentacao e saldo inicial eh zero
          if (cData.items.length === 0 && cData.initialBalance === 0 && selectedCustomerId === 'all') return;

          let runningBalance = cData.initialBalance;

          // Ordenar as movimentações cronologicamente
          cData.items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (customerIndex > 0) {
            rows.push(['MONTH_SEPARATOR', '', '', '', '', '']); // 6 columns
          }

          rows.push(['CUSTOMER_STATEMENT_HEADER', cData.name, formatDateDisplay(startDate), runningBalance, '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '']);

          let totalBilled = 0;
          let totalReceived = 0;
          let totalDeds = 0;

          cData.items.forEach(item => {
            runningBalance += item.billed;
            runningBalance -= item.received;
            runningBalance -= item.fee;
            runningBalance -= item.deductions || 0;
            item.balance = runningBalance;

            totalBilled += item.billed;
            totalReceived += item.received;
            totalDeds += (item.fee || 0) + (item.deductions || 0);

            rows.push([
              formatDateDisplay(item.date),
              item.history,
              item.billed > 0 ? formatCurrency(item.billed) : '---',
              item.received > 0 ? formatCurrency(item.received) : '---',
              (item.fee || 0) + (item.deductions || 0) > 0 ? formatCurrency((item.fee || 0) + (item.deductions || 0)) : '---',
              formatCurrency(item.balance)
            ]);
          });

          rows.push(['CUSTOMER_STATEMENT_FOOTER', formatCurrency(totalBilled), formatCurrency(totalReceived), formatCurrency(totalDeds)]);
          rows.push([`Saldo Final em ${formatDateDisplay(endDate)}`, 'IS_TOTAL_MONTH', '', '', '', formatCurrency(runningBalance)]);

          grandTotal += runningBalance;
          customerIndex++;
        });

        return {
          title: `Conta Corrente de Clientes - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: selectedCustomerId === 'all' ? 'Movimentação Geral - Todos os Clientes' : `Extrato do Cliente: ${targetCustomers[0]?.name}`,
          headers: ['Data', 'Histórico', 'Faturado', 'Recebido', 'Deduções', 'Saldo (R$)'],
          rows: rows,
          total: grandTotal
        };
      }
      case 'receivablesPending': {
        const pendingItems: any[] = [];

        sales.forEach(s => {
          const sInstallments = s.installmentsList || [];

          if (sInstallments.length > 0) {
            // Se tem parcelas, avalia cada uma
            sInstallments.forEach(inst => {
              if (inst.status !== 'Pago') {
                const instPayments = payments.filter(p => p.saleId === s.id && p.installmentId === inst.id);
                const paidOnInst = instPayments.reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
                const balance = inst.value - paidOnInst;

                if (balance > 0.01) {
                  // Filtro por Cliente
                  if (!matchesClient(s)) return;

                  // Filtros de NF
                  if (receivablesFilter === 'withNf' && s.isNoNf) return;
                  if (receivablesFilter === 'withoutNf' && !s.isNoNf) return;

                  // Filtro por Data (Vencimento da Parcela)
                  const d = new Date(inst.dueDate).getTime();
                  if (d >= startTimestamp && d <= endTimestamp) {
                    pendingItems.push({
                      date: s.date,
                      customerName: s.customerName,
                      nf: s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N'),
                      condition: `A PRAZO / PARCELA ${inst.number}/${sInstallments.length}`,
                      dueDate: inst.dueDate,
                      balance: balance
                    });
                  }
                }
              }
            });
          } else {
            // Sem parcelas (À Vista ou Legado)
            const totalPaid = payments.filter(p => p.saleId === s.id).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
            const balance = s.totalValue - totalPaid;

            if (balance > 0.01) {
              // Filtro por Cliente
              if (!matchesClient(s)) return;

              if (receivablesFilter === 'withNf' && s.isNoNf) return;
              if (receivablesFilter === 'withoutNf' && !s.isNoNf) return;

              const refDate = s.dueDate ? new Date(s.dueDate) : (s.paymentCondition === 'A Vista' ? new Date(s.date) : new Date(s.date));
              const d = refDate.getTime();

              if (d >= startTimestamp && d <= endTimestamp) {
                pendingItems.push({
                  date: s.date,
                  customerName: s.customerName,
                  nf: s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N'),
                  condition: s.paymentCondition === 'A Vista' ? 'À VISTA' : 'ÚNICA',
                  dueDate: s.dueDate || s.date,
                  balance: balance
                });
              }
            }
          }
        });

        const sorted = pendingItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return {
          title: `Relatório de Contas a Receber - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Listagem de faturamentos de serviços com saldo em aberto por parte dos clientes.',
          headers: ['Data Emissão', 'Cliente', 'NF', 'Condição PG', 'Vencimento', 'Status', 'Saldo a Receber'],
          rows: sorted.map(item => [
            formatDateDisplay(item.date),
            item.customerName,
            item.nf,
            item.condition,
            formatDateDisplay(item.dueDate),
            getStatusLabel({ status: 'Pendente', vencimento: item.dueDate }, 'receivable'),
            formatCurrency(item.balance)
          ]),
          total: sorted.reduce((acc, item) => acc + item.balance, 0)
        };
      }
      case 'fleetIntervals': {
        return {
          title: 'Configuração de Prazos de Manutenção Preventiva',
          headerInfo: 'Relatório geral de intervalos por equipamento',
          headers: ['Equipamento', 'Troca Óleo', 'Filtro Diesel', 'Filtro Óleo', 'Filtro Ar Int.', 'Filtro Ar Ext.', 'Sangrar Filtro', 'Outros'],
          rows: fleet.map(e => {
            const v = companyVehicles.find(v => v.id === e.vehicleId);
            return [
              v ? `${v.type} - ${v.model}` : 'Veículo não encontrado',
              formatMonths(e.intervals.oilChange),
              formatMonths(e.intervals.dieselFilter),
              formatMonths(e.intervals.oilFilter),
              formatMonths(e.intervals.internalAirFilter),
              formatMonths(e.intervals.externalAirFilter),
              formatMonths(e.intervals.bleedDieselFilter),
              formatMonths(e.intervals.others)
            ];
          })
        };
      }
      case 'fleetAlerts': {
        const rows: any[] = [];
        const sections = [
          { id: 'overdue', label: 'MANUTENÇÕES VENCIDAS', filter: 'overdue' as const },
          { id: 'upcoming', label: 'VENCENDO EM ATÉ 30 DIAS', filter: 'upcoming' as const }
        ];

        sections.forEach((sec, idx) => {
          const items = getFleetAlerts(sec.filter).filter(i => {
            if (selectedEquipmentId === 'all') return true;
            const equip = fleet.find(f => f.id === selectedEquipmentId);
            const v = companyVehicles.find(v => v.id === equip?.vehicleId);
            const equipName = v ? `${v.type} - ${v.model}` : '';
            return i.equipName === equipName;
          });
          if (items.length > 0) {
            if (rows.length > 0) rows.push(['MONTH_SEPARATOR', '', '', '']);
            rows.push([sec.label, 'SECTION_HEADER', '', '']);
            rows.push(['COLUMN_HEADERS', '', '', '']);
            items.forEach(i => {
              rows.push([i.equipName, i.item, i.dueDate, i.statusText.toUpperCase()]);
            });
          }
        });

        return {
          title: 'Relatório de Alertas de Manutenção Preventiva',
          headerInfo: 'Resumo geral de manutenções vencidas e próximas do vencimento.',
          headers: ['Equipamento', 'Item de Manutenção', 'Data Vencimento', 'Status'],
          rows: rows
        };
      }
      case 'fleetHistory': {
        const hist = maintenanceRecords
          .filter(r => {
            const d = new Date(r.date).getTime();
            const inDateRange = d >= startTimestamp && d <= endTimestamp;
            const isSelectedEquip = selectedEquipmentId === 'all' || r.equipmentId === selectedEquipmentId;
            return inDateRange && isSelectedEquip;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const equipTitle = selectedEquipmentId === 'all'
          ? 'Todos os Equipamentos'
          : (() => {
              const equip = fleet.find(f => f.id === selectedEquipmentId);
              const v = companyVehicles.find(v => v.id === equip?.vehicleId);
              return v ? `${v.type} - ${v.model}` : '---';
            })();

        return {
          title: `Histórico de Manutenções - ${equipTitle}`,
          headerInfo: `Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data', 'Equipamento', 'Nota Fiscal', 'Itens Trocados', 'Observações'],
          rows: hist.map(r => {
            const equip = fleet.find(f => f.id === r.equipmentId);
            return [
              new Date(r.date).toLocaleDateString(),
              (() => {
                const equip = fleet.find(f => f.id === r.equipmentId);
                const v = companyVehicles.find(v => v.id === equip?.vehicleId);
                return v ? `${v.type} - ${v.model}` : '---';
              })(),
              r.nfNumber || '---',
              r.performedItems.map(i => itemLabels[i]).join(', '),
              r.observations || '---'
            ];
          })
        };
      }
      case 'bankStatement': {
        const bank = bankAccounts.find(b => b.id === selectedBankId);
        if (!bank) return null;

        const initialSystemBalance = bank.initialBalance || 0;

        const prevCredits = payments
          .filter(p => p.bankAccountId === selectedBankId && new Date(p.date).getTime() < startTimestamp)
          .reduce((acc, p) => acc + p.amount, 0);

        const prevDebits = expenses
          .filter(e => e.bankAccountId === selectedBankId && (e.status === 'Pago' || (e.amountPaid && e.amountPaid > 0)) && e.paymentDate && new Date(e.paymentDate).getTime() < startTimestamp)
          .reduce((acc, e) => acc + (e.amountPaid || 0), 0);

        const prevTransferCredits = bankTransfers
          .filter(t => t.destinationAccountId === selectedBankId && new Date(t.date).getTime() < startTimestamp)
          .reduce((acc, t) => acc + t.amount, 0);

        const prevTransferDebits = bankTransfers
          .filter(t => t.sourceAccountId === selectedBankId && new Date(t.date).getTime() < startTimestamp)
          .reduce((acc, t) => acc + t.amount, 0);

        const prevYieldCredits = yields
          .filter(y => {
            if (y.bankAccountId !== selectedBankId || new Date(y.date).getTime() >= startTimestamp) return false;
            if (y.description.startsWith('TAXA CARTÃO Ref:')) return false;
            if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return false;
            if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return true;
            const ap = accountPlan.find(p => p.id === y.accountPlanId);
            return ap?.type !== 'Despesa';
          })
          .reduce((acc, y) => acc + y.amount, 0);

        const prevYieldDebits = yields
          .filter(y => {
            if (y.bankAccountId !== selectedBankId || new Date(y.date).getTime() >= startTimestamp) return false;
            if (y.description.startsWith('TAXA CARTÃO Ref:')) return false;
            if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return true;
            if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return false;
            const ap = accountPlan.find(p => p.id === y.accountPlanId);
            return ap?.type === 'Despesa';
          })
          .reduce((acc, y) => acc + y.amount, 0);

        const prevCardPayments = (corporateCardPayments || [])
          .filter(p => p.bankAccountId === selectedBankId && new Date(p.date).getTime() < startTimestamp)
          .reduce((acc, p) => acc + p.amount, 0);

        const openingBalance = initialSystemBalance + prevCredits + prevTransferCredits + prevYieldCredits - prevDebits - prevTransferDebits - prevYieldDebits - prevCardPayments;

        const periodCredits = payments
          .filter(p => p.bankAccountId === selectedBankId && new Date(p.date).getTime() >= startTimestamp && new Date(p.date).getTime() <= endTimestamp)
          .map(p => {
            const sale = sales.find(s => s.id === p.saleId);
            return {
              date: p.date,
              credit: p.amount,
              debit: 0,
              desc: `RECBTO: ${sale?.customerName || 'Cliente'} / NF: ${sale?.nfNumber || 'S/N'} / ${p.method}`
            };
          });

        const periodDebits = expenses
          .filter(e => e.bankAccountId === selectedBankId && (e.status === 'Pago' || (e.amountPaid && e.amountPaid > 0)) && e.paymentDate && new Date(e.paymentDate).getTime() >= startTimestamp && new Date(e.paymentDate).getTime() <= endTimestamp)
          .map(e => ({
            date: e.paymentDate!,
            credit: 0,
            debit: e.amountPaid || e.totalValue,
            desc: `PGTO: ${e.vendorName} / DOC: ${e.docNumber || 'S/N'} / ${e.items.map(i => i.description).join(', ')}`
          }));

        const periodTransferCredits = bankTransfers
          .filter(t => t.destinationAccountId === selectedBankId && new Date(t.date).getTime() >= startTimestamp && new Date(t.date).getTime() <= endTimestamp)
          .map(t => {
            const originBank = bankAccounts.find(b => b.id === t.sourceAccountId);
            return {
              date: t.date,
              credit: t.amount,
              debit: 0,
              desc: `TRANSF. RECEBIDA: De ${originBank?.bankName || 'Outro Banco'} - ${t.description || ''}`
            };
          });

        const periodTransferDebits = bankTransfers
          .filter(t => t.sourceAccountId === selectedBankId && new Date(t.date).getTime() >= startTimestamp && new Date(t.date).getTime() <= endTimestamp)
          .map(t => {
            const destBank = bankAccounts.find(b => b.id === t.destinationAccountId);
            return {
              date: t.date,
              credit: 0,
              debit: t.amount,
              desc: `TRANSF. ENVIADA: Para ${destBank?.bankName || 'Outro Banco'} - ${t.description || ''}`
            };
          });

        const periodYieldCredits = (yields || [])
          .filter(y => y.bankAccountId === selectedBankId && !y.description.startsWith('TAXA CARTÃO Ref:') && new Date(y.date).getTime() >= startTimestamp && new Date(y.date).getTime() <= endTimestamp)
          .map(y => {
            const ap = accountPlan.find(p => p.id === y.accountPlanId);
            const isLoanExit = y.description.startsWith('SAÍDA EMPRÉSTIMO:');
            const isLoanReturn = y.description.startsWith('RECBTO EMPRÉSTIMO:');
            const isCompanyLoanCredit = y.description.startsWith('CRÉDITO EMPRÉSTIMO BANCÁRIO:');
            const isCompanyLoanPayment = y.description.startsWith('PGTO PARCELA EMPRÉSTIMO:');
            const isExpense = isLoanExit || isCompanyLoanPayment || (!isLoanReturn && !isCompanyLoanCredit && ap?.type === 'Despesa');
            
            return {
              date: y.date,
              credit: isExpense ? 0 : y.amount,
              debit: isExpense ? y.amount : 0,
              desc: isCompanyLoanCredit || isCompanyLoanPayment
                ? (y.description || '').split(' (Ref:')[0]
                : `MOV. FINANCEIRA: ${ap ? ap.description : 'S/N'} - ${(y.description || '').split(' (Ref:')[0]}`
            };
          });

        const periodCardPaymentsDetailed = (corporateCardPayments || [])
          .filter(p => p.bankAccountId === selectedBankId && new Date(p.date).getTime() >= startTimestamp && new Date(p.date).getTime() <= endTimestamp)
          .map(p => {
            const card = corporateCards.find(c => c.id === p.cardId);
            return {
              date: p.date,
              credit: 0,
              debit: p.amount,
              desc: `PGTO FATURA CARTÃO: ${card?.name || '---'} / ${p.description || ''}`
            };
          });

        const sortedMovements = [...periodCredits, ...periodDebits, ...periodTransferCredits, ...periodTransferDebits, ...periodYieldCredits, ...periodCardPaymentsDetailed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentRunningBalance = openingBalance;
        const rowsWithBalance = sortedMovements.map(m => {
          currentRunningBalance = currentRunningBalance + m.credit - m.debit;
          return [
            formatDateDisplay(m.date),
            m.desc,
            m.credit > 0 ? formatCurrency(m.credit) : '---',
            m.debit > 0 ? formatCurrency(m.debit) : '---',
            formatCurrency(currentRunningBalance)
          ];
        });

        return {
          title: `Extrato Bancário Detalhado - ${bank.bankName}${bank.isBlocked ? ' (BLOQUEADO)' : ''}`,
          headerInfo: `Agência: ${bank.agency} | Conta: ${bank.accountNumber}`,
          openingBalance: openingBalance,
          closingBalance: currentRunningBalance,
          headers: ['Data', 'Descrição do Lançamento', 'Valor Crédito (+)', 'Valor Débito (-)', 'Saldo'],
          rows: rowsWithBalance
        };
      }

      case 'corporateCard': {
        const rows: any[] = [];
        
        // Filter cards
        const targetCards = selectedCardId === 'all' ? corporateCards : corporateCards.filter(c => c.id === selectedCardId);
        
        targetCards.forEach(card => {
          const cardExps = expenses.filter(e => 
            e.paymentMethod === 'Cartão Corporativo' && 
            e.cardId === card.id && 
            new Date(e.date).getTime() >= startTimestamp && 
            new Date(e.date).getTime() <= endTimestamp
          );
          
          const cardPagts = (corporateCardPayments || []).filter(p => 
            p.cardId === card.id && 
            new Date(p.date).getTime() >= startTimestamp && 
            new Date(p.date).getTime() <= endTimestamp
          );

          const cardPrevExps = expenses.filter(e => 
            e.paymentMethod === 'Cartão Corporativo' && 
            e.cardId === card.id && 
            new Date(e.date).getTime() < startTimestamp
          ).reduce((acc, e) => acc + e.totalValue, 0);

          const cardPrevPagts = (corporateCardPayments || []).filter(p => 
            p.cardId === card.id && 
            new Date(p.date).getTime() < startTimestamp
          ).reduce((acc, p) => acc + p.amount, 0);

          const openingBalance = cardPrevExps - cardPrevPagts;
          const totalCompras = cardExps.reduce((acc, e) => acc + e.totalValue, 0);
          const totalPagos = cardPagts.reduce((acc, p) => acc + p.amount, 0);
          const finalBalance = openingBalance + totalCompras - totalPagos;

          rows.push(['CARD_RESUMO_HEADER', card.name]);
          rows.push(['COLUMN_HEADERS_CARD', 'Data', 'Descrição do Lançamento', 'Compras (+)', 'Pagamentos (-)', 'Saldo']);
          
          rows.push(['CARD_ITEM', '', 'SALDO ANTERIOR (ACUMULADO)', formatCurrency(openingBalance), '', formatCurrency(openingBalance)]);
          
          const movements: any[] = [
            ...cardExps.map(e => ({
              date: e.date,
              desc: `${e.vendorName} / ${e.items.map(i => i.description).join(', ')}`,
              compra: e.totalValue,
              pagto: 0
            })),
            ...cardPagts.map(p => {
              const bank = bankAccounts.find(b => b.id === p.bankAccountId);
              return {
                date: p.date,
                desc: `PAGAMENTO FATURA - Saída: ${bank?.bankName || '---'}`,
                compra: 0,
                pagto: p.amount
              };
            })
          ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          let running = openingBalance;
          movements.forEach(m => {
            running += m.compra - m.pagto;
            rows.push(['CARD_ITEM', formatDateDisplay(m.date), m.desc, m.compra > 0 ? formatCurrency(m.compra) : '---', m.pagto > 0 ? formatCurrency(m.pagto) : '---', formatCurrency(running)]);
          });

          rows.push(['CARD_FOOTER', 'TOTALIZADOR DO PERÍODO', '', formatCurrency(totalCompras), formatCurrency(totalPagos), formatCurrency(finalBalance)]);
          rows.push(['', '', '', '', '', '']);
        });

        if (targetCards.length === 0) {
          rows.push(['CARD_ITEM', 'Nenhum cartão cadastrado ou selecionado.', '', '', '', '']);
        }

        return {
          title: `Relatório de Cartão Corporativo - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: selectedCardId === 'all' ? 'Resumo Geral de Todos os Cartões' : `Extrato Detalhado do Cartão: ${targetCards[0]?.name}`,
          headers: ['', '', '', '', '', ''],
          rows: rows
        };
      }

      case 'customers': {
        const filtered = customers.filter(c => {
          if (statusFilter === 'Todos') return true;
          if (statusFilter === 'Ativos') return c.isActive !== false;
          if (statusFilter === 'Inativos') return c.isActive === false;
          return true;
        });
        return {
          title: 'Relatório Geral de Clientes',
          headers: ['DADOS DO CLIENTE'],
          rows: filtered.map(c => [
            'CUSTOM_CARD',
            c.name,
            c.isActive === false ? 'INATIVO' : 'ATIVO',
            c.document,
            c.contactPerson,
            `${c.phone} / ${c.email}`,
            c.address
          ])
        };
      }
      case 'customersSummary': {
        const filtered = customers.filter(c => {
          if (statusFilter === 'Todos') return true;
          if (statusFilter === 'Ativos') return c.isActive !== false;
          if (statusFilter === 'Inativos') return c.isActive === false;
          return true;
        });
        return {
          title: 'Listagem de Clientes (Resumo)',
          headers: ['Nome do Cliente', 'CPF / CNPJ', 'Telefone', 'Status'],
          rows: filtered.map(c => [
            c.name,
            c.document,
            c.phone,
            c.isActive === false ? 'INATIVO' : 'ATIVO'
          ])
        };
      }
      case 'vendors': {
        const filtered = vendors.filter(v => {
          if (statusFilter === 'Todos') return true;
          if (statusFilter === 'Ativos') return v.isActive !== false;
          if (statusFilter === 'Inativos') return v.isActive === false;
          return true;
        });
        return {
          title: 'Relatório Geral de Fornecedores',
          headers: ['DADOS DO FORNECEDOR'],
          rows: filtered.map(v => [
            'CUSTOM_CARD',
            v.name,
            v.isActive === false ? 'INATIVO' : 'ATIVO',
            v.document,
            v.contactPerson,
            `${v.phone} / ${v.email}`,
            v.address
          ])
        };
      }
      case 'vendorsSummary': {
        const filtered = vendors.filter(v => {
          if (statusFilter === 'Todos') return true;
          if (statusFilter === 'Ativos') return v.isActive !== false;
          if (statusFilter === 'Inativos') return v.isActive === false;
          return true;
        });
        return {
          title: 'Listagem de Fornecedores (Resumo)',
          headers: ['Nome do Fornecedor', 'Nome Fantasia', 'CPF / CNPJ', 'Telefone', 'Status'],
          rows: filtered.map(v => {
            return [
              v.name,
              v.contactPerson || '---',
              v.document,
              v.phone,
              v.isActive === false ? 'INATIVO' : 'ATIVO'
            ];
          })
        };
      }
      case 'sales': {
        const filteredSales = sales.filter(s => {
          const d = new Date(s.date).getTime();
          const inRange = d >= startTimestamp && d <= endTimestamp;
          if (!inRange) return false;

          if (!matchesClient(s)) return false;

          if (receivablesFilter === 'withNf') return !s.isNoNf;
          if (receivablesFilter === 'withoutNf') return !!s.isNoNf;
          return true;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const salesByMonthMap = new Map<string, Sale[]>();
        filteredSales.forEach(s => {
          let monthKey = '';
          if (s.date && s.date.includes('-')) {
            const parts = s.date.split('-');
            monthKey = `${parts[1]}/${parts[0]}`;
          } else {
            const d = new Date(s.date);
            monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          }
          if (!salesByMonthMap.has(monthKey)) salesByMonthMap.set(monthKey, []);
          salesByMonthMap.get(monthKey)!.push(s);
        });

        const rows: any[] = [];
        let monthIndex = 0;

        salesByMonthMap.forEach((monthSales, month) => {
          if (monthIndex > 0) {
            rows.push(['MONTH_SEPARATOR', '', '', '', '', '', '']);
          }

          const salesWithNF = monthSales.filter(s => !s.isNoNf);
          const salesWithoutNF = monthSales.filter(s => !!s.isNoNf);

          if (salesWithNF.length > 0) {
            const label = receivablesFilter === 'withNf' ? `MÊS: ${month}` : `MÊS: ${month} - FATURAMENTO COM NOTA FISCAL`;
            rows.push([label, '', '', '', '', '', '']);
            rows.push(['COLUMN_HEADERS', '', '', '', '', '', '']);
            salesWithNF.forEach(s => {
              const plan = accountPlan.find(p => p.id === s.accountPlanId);
              rows.push([
                formatDateDisplay(s.date),
                s.nfNumber || 'S/N',
                s.customerName,
                `${s.status === 'Pago' ? '' : ''}${s.paymentCondition} (${s.paymentMethod})`,
                formatDateDisplay(s.dueDate),
                formatCurrency(s.totalValue + (s.deductions || 0))
              ]);
            });
            const totalWithNF = salesWithNF.reduce((sum, s) => sum + s.totalValue + (s.deductions || 0), 0);
            rows.push([`SUBTOTAL DO MÊS: ${month}`, '', '', '', '', '', formatCurrency(totalWithNF)]);
          }

          if (salesWithoutNF.length > 0) {
            if (rows.length > 0 && rows[rows.length - 1][0] !== 'MONTH_SEPARATOR') rows.push(['', '', '', '', '', '', '']);
            const label = receivablesFilter === 'withoutNf' ? `MÊS: ${month}` : `MÊS: ${month} - FATURAMENTO SEM NOTA FISCAL (S/NF)`;
            rows.push([label, '', '', '', '', '', '']);
            rows.push(['COLUMN_HEADERS', '', '', '', '', '', '']);
            salesWithoutNF.forEach(s => {
              const plan = accountPlan.find(p => p.id === s.accountPlanId);
              rows.push([
                formatDateDisplay(s.date),
                'S/NF',
                s.customerName,
                `${s.paymentCondition} (${s.paymentMethod})`,
                formatDateDisplay(s.dueDate),
                formatCurrency(s.totalValue + (s.deductions || 0))
              ]);
            });
            const totalWithoutNF = salesWithoutNF.reduce((sum, s) => sum + s.totalValue + (s.deductions || 0), 0);
            rows.push([`SUBTOTAL DO MÊS: ${month}`, '', '', '', '', '', formatCurrency(totalWithoutNF)]);
          }
          monthIndex++;
        });

        return {
          title: `Relatório de Faturamento de Serviços - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Emissão', 'NF', 'Cliente', 'Condições PG', 'Vencimento', 'Valor Bruto NF'],
          rows: rows,
          total: filteredSales.reduce((acc, curr) => acc + curr.totalValue + (curr.deductions || 0), 0)
        };
      }
      case 'receivables': {
        const filteredPayments = payments.filter(p => {
          const d = new Date(p.date).getTime();
          const inRange = d >= startTimestamp && d <= endTimestamp;
          if (!inRange) return false;

          const sale = sales.find(sl => sl.id === p.saleId);
          if (sale && !matchesClient(sale)) return false;
          if (!sale && selectedCustomerId !== 'all') return false;

          if (receivablesFilter === 'withNf') return sale && !sale.isNoNf;
          if (receivablesFilter === 'withoutNf') return sale && sale.isNoNf;
          return true;
        });

        const paymentsWithNF = filteredPayments.filter(p => {
          const sale = sales.find(s => s.id === p.saleId);
          return sale && !sale.isNoNf;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const paymentsWithoutNF = filteredPayments.filter(p => {
          const sale = sales.find(s => s.id === p.saleId);
          return sale && sale.isNoNf;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const rows: any[] = [];

        if (paymentsWithNF.length > 0) {
          rows.push(['RECEBIMENTOS COM NOTA FISCAL', '', '', '', '', '', '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '', '', '']);
          paymentsWithNF.forEach(p => {
            const sale = sales.find(s => s.id === p.saleId);
            const bank = bankAccounts.find(b => b.id === p.bankAccountId);
            const inst = sale?.installmentsList?.find(i => i.id === p.installmentId);
            const conditionText = inst
              ? `A PRAZO / PARCELA ${inst.number}/${sale?.installmentsList?.length}`
              : (sale?.paymentCondition === 'A Vista' ? 'À VISTA' : 'ÚNICA');

            rows.push([
              sale?.customerName || '---',
              sale?.nfNumber || 'S/N',
              sale ? formatDateDisplay(sale.date) : '---',
              formatDateDisplay(p.date),
              bank?.bankName || '---',
              p.method,
              conditionText,
              formatCurrency(p.amount)
            ]);
          });
          const subtotalNF = paymentsWithNF.reduce((acc, p) => acc + p.amount, 0);
          rows.push(['SUBTOTAL RECEBIMENTOS COM NF:', '', '', '', '', '', '', formatCurrency(subtotalNF)]);
        }

        if (paymentsWithoutNF.length > 0) {
          if (rows.length > 0) rows.push(['', '', '', '', '', '', '', '']);
          rows.push(['RECEBIMENTOS SEM NOTA FISCAL (S/NF)', '', '', '', '', '', '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '', '', '']);
          paymentsWithoutNF.forEach(p => {
            const sale = sales.find(s => s.id === p.saleId);
            const bank = bankAccounts.find(b => b.id === p.bankAccountId);
            const inst = sale?.installmentsList?.find(i => i.id === p.installmentId);
            const conditionText = inst
              ? `A PRAZO / PARCELA ${inst.number}/${sale?.installmentsList?.length}`
              : (sale?.paymentCondition === 'A Vista' ? 'À VISTA' : 'ÚNICA');

            rows.push([
              sale?.customerName || '---',
              'S/NF',
              sale ? formatDateDisplay(sale.date) : '---',
              formatDateDisplay(p.date),
              bank?.bankName || '---',
              p.method,
              conditionText,
              formatCurrency(p.amount)
            ]);
          });
          const subtotalNoNF = paymentsWithoutNF.reduce((acc, p) => acc + p.amount, 0);
          rows.push(['SUBTOTAL RECEBIMENTOS SEM NF (S/NF):', '', '', '', '', '', '', formatCurrency(subtotalNoNF)]);
        }

        return {
          title: `Contas Recebidas - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Cliente', 'NF', 'Emissão', 'Data Receb.', 'Banco', 'Forma PG', 'Condição', 'Valor Recebido'],
          rows: rows,
          total: filteredPayments.reduce((acc, curr) => acc + curr.amount, 0)
        };
      }
      case 'cardFees': {
        const cardPayments = payments.filter(p => {
          const d = new Date(p.date).getTime();
          const isCard = p.method === 'Cartão' || p.method === 'Cartão de Crédito' || p.method === 'Cartão de Débito';
          return d >= startTimestamp && d <= endTimestamp && isCard && (p.fee || 0) > 0;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          title: 'Relatório de Despesas com Taxas de Recebimentos com Cartão (Vendas)',
          headerInfo: `Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Cliente', 'NF', 'Data Emissão', 'Data Recebido', 'Valor Bruto NF', 'Valor Recebido', 'Valor Taxa'],
          rows: cardPayments.map(p => {
            const sale = sales.find(s => s.id === p.saleId);
            return [
              sale?.customerName || '---',
              sale?.nfNumber || 'S/N',
              sale ? formatDateDisplay(sale.date) : '---',
              formatDateDisplay(p.date),
              formatCurrency((sale?.totalValue || 0) + (sale?.deductions || 0)),
              formatCurrency(p.amount),
              formatCurrency(p.fee || 0)
            ];
          }),
          total: cardPayments.reduce((acc, p) => acc + (p.fee || 0), 0)
        };
      }
      case 'payments': {
        const filteredExps = expenses.filter(e => {
          const isCard = e.paymentMethod === 'Cartão Corporativo';
          const matchesCategory = selectedCategoryId === 'all' || e.accountPlanId === selectedCategoryId;
          
          if (isCard) {
            const d = new Date(e.date).getTime();
            return matchesCategory && d >= startTimestamp && d <= endTimestamp;
          }

          if (!e.paymentDate) return false;
          const d = new Date(e.paymentDate).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp && (e.status === 'Pago' || (e.amountPaid && e.amountPaid > 0));
        });

        const filteredYieldsAsPayments = (yields || []).filter(y => {
          const ap = accountPlan.find(p => p.id === y.accountPlanId);
          if (!ap || ap.type !== 'Despesa') return false;
          const matchesCategory = selectedCategoryId === 'all' || y.accountPlanId === selectedCategoryId;
          const d = new Date(y.date).getTime();
          return matchesCategory && d >= startTimestamp && d <= endTimestamp;
        }).map(y => {
          const isLoanExit = y.description.startsWith('SAÍDA EMPRÉSTIMO:');
          const isLoanPayment = y.description.startsWith('PGTO PARCELA EMPRÉSTIMO:');
          const isCompanyLoanPayment = y.description.startsWith('PGTO PARCELA EMPRÉSTIMO') || y.description.includes('Parc');
          
          let vendor = (y.description || '').split(' (Ref:')[0];
          if (isCompanyLoanPayment) vendor = "PGTO EMPRÉSTIMO BANCÁRIO";
          if (isLoanExit) vendor = "SAÍDA EMPRÉSTIMO";

          return {
            id: y.id,
            date: y.date,
            dueDate: y.date,
            paymentDate: y.date,
            accountPlanId: y.accountPlanId,
            vendorName: vendor,
            totalValue: y.amount,
            amountPaid: y.amount,
            docNumber: 'S/N',
            bankAccountId: y.bankAccountId,
            paymentMethod: 'Transferência/Débito'
          };
        });

        const allPaymentsMerged = [...filteredExps, ...filteredYieldsAsPayments].sort((a, b) => {
          const dateA = a.paymentMethod === 'Cartão Corporativo' ? a.date : (a.paymentDate || a.date);
          const dateB = b.paymentMethod === 'Cartão Corporativo' ? b.date : (b.paymentDate || b.date);
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });

        return {
          title: `Pagamentos Realizados - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headers: ['Data Pagto', 'Data Vencto', 'Doc', 'Fornecedor', 'Despesa', 'Banco Saída', 'Valor'],
          rows: allPaymentsMerged.map(e => {
            const isCard = e.paymentMethod === 'Cartão Corporativo';
            const card = isCard ? corporateCards?.find(c => c.id === e.cardId) : null;
            
            const bank = !isCard ? bankAccounts.find(b => b.id === e.bankAccountId) : null;
            const bankLabel = isCard 
              ? (card ? `CARTÃO: ${card.name.replace(/NUBANK/ig, 'NU')}` : 'CARTÃO CORP.')
              : bank?.bankName
                ? bank.bankName
                  .replace(/ C\/C| CC| C\.C\.| Conta Corrente/ig, '')
                  .replace(/Banco do Brasil/ig, 'BB')
                  .replace(/ITAU/ig, 'ITAÚ')
                  .trim()
                : '---';
            const plan = accountPlan.find(p => p.id === e.accountPlanId);
            
            return [
              formatDateDisplay(isCard ? e.date : e.paymentDate),
              formatDateDisplay(isCard ? e.date : e.dueDate),
              e.docNumber || 'S/N',
              e.vendorName,
              plan?.description || '---',
              bankLabel,
              formatCurrency(isCard ? e.totalValue : (e.amountPaid || e.totalValue))
            ];
          }),
          total: allPaymentsMerged.reduce((acc, curr) => acc + (curr.paymentMethod === 'Cartão Corporativo' ? curr.totalValue : (curr.amountPaid || curr.totalValue)), 0)
        };
      }
      case 'accountPlan': {
        const rows: any[] = [];
        const types = ['Receita', 'Despesa'];

        types.forEach(type => {
          const planForType = accountPlan.filter(p => p.type === type);
          if (planForType.length === 0) return;

          rows.push(['ACCOUNT_PLAN_LEVEL', type === 'Receita' ? 'RECEITAS' : 'DESPESAS', 0]);

          const categories = Array.from<string>(new Set(planForType.map(p => p.category as string))).sort();
          categories.forEach(cat => {
            rows.push(['ACCOUNT_PLAN_LEVEL', cat.toUpperCase(), 1]);

            const planForCat = planForType.filter(p => p.category === cat);
            const subcats = Array.from<string>(new Set(planForCat.map(p => p.subcategory as string))).sort();

            subcats.forEach(sub => {
              rows.push(['ACCOUNT_PLAN_LEVEL', sub.toUpperCase(), 2]);

              const items = planForCat.filter(p => p.subcategory === sub && p.description);
              const accounts = Array.from(new Set(items.map(p => p.description!.toUpperCase()))).sort();

              accounts.forEach(acc => {
                rows.push(['ACCOUNT_PLAN_LEVEL', acc, 3]);
              });
            });
          });
          rows.push(['', '', '']); // SPACER
        });

        return {
          title: 'Plano de Contas Geral',
          headerInfo: 'Estruturação de todas as contas',
          headers: ['Estrutura', 'Descrição', 'Nível'],
          rows: rows
        };
      }
      case 'accountCategoriesList': {
        const rows: any[] = [];
        const types = ['Receita', 'Despesa'] as const;

        types.forEach((type, index) => {
          if (index > 0) rows.push(['', '']);

          const typeNum = '';
          const typeLabel = type === 'Receita' ? 'RECEITAS' : 'DESPESAS';
          rows.push(['ACCOUNT_CAT_HIERARCHY', 0, typeNum, typeLabel]);

          const catsForType = accountCategories
            .filter(c => c.type === type)
            .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

          catsForType.forEach(cat => {
            rows.push(['ACCOUNT_CAT_HIERARCHY', 1, cat.accountNumber || '---', cat.name]);

            const subcatsForType = accountSubcategories
              .filter(s => s.categoryId === cat.id)
              .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

            subcatsForType.forEach(sub => {
              rows.push(['ACCOUNT_CAT_HIERARCHY', 2, sub.accountNumber || '---', sub.name]);

              const accountsInSubcat = accountPlan
                .filter(p => p.type === type && p.category === cat.name && p.subcategory === sub.name && p.description)
                .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

              accountsInSubcat.forEach(acc => {
                rows.push(['ACCOUNT_CAT_HIERARCHY', 3, acc.accountNumber || '---', acc.description]);
              });
            });
          });
        });

        return {
          title: 'PLANO DE CONTAS',
          headerInfo: 'Listagem completa de categorias, subcategorias e contas',
          headers: ['Nº', 'Descrição'],
          rows: rows
        };
      }
      case 'banks':
        return {
          title: 'Relatório de Contas Bancárias',
          headers: ['Instituição', 'Agência', 'Conta Corrente'],
          rows: bankAccounts.map(b => [`${b.bankName}${b.isBlocked ? ' (BLOQUEADO)' : ''}`, b.agency, b.accountNumber])
        };
      case 'cashFlow': {
        const rows: any[] = [];
        
        // 1. Saldos de Bancos
        rows.push(['CASH_FLOW_SECTION', 'SALDOS DE BANCOS: (Saldos na data de hoje)']);
        rows.push(['COLUMN_HEADERS_CASHFLOW', 'Banco / Instituição', 'Agência', 'Conta Corrente', 'Saldo Atual', '']);
        
        let totalBancos = 0;
        const now = new Date().getTime() + (24 * 60 * 60 * 1000) - 1; // End of today

        bankAccounts.forEach(bank => {
          const initialSystemBalance = bank.initialBalance || 0;

          const allCredits = payments
            .filter(p => p.bankAccountId === bank.id && new Date(p.date).getTime() <= now)
            .reduce((acc, p) => acc + p.amount, 0);

          const allDebits = expenses
            .filter(e => e.bankAccountId === bank.id && (e.status === 'Pago' || (e.amountPaid && e.amountPaid > 0)) && e.paymentDate && new Date(e.paymentDate).getTime() <= now)
            .reduce((acc, e) => acc + (e.amountPaid || 0), 0);

          const allTransferCredits = bankTransfers
            .filter(t => t.destinationAccountId === bank.id && new Date(t.date).getTime() <= now)
            .reduce((acc, t) => acc + t.amount, 0);

          const allTransferDebits = bankTransfers
            .filter(t => t.sourceAccountId === bank.id && new Date(t.date).getTime() <= now)
            .reduce((acc, t) => acc + t.amount, 0);

          const allYieldCredits = yields
            .filter(y => {
              if (y.bankAccountId !== bank.id || new Date(y.date).getTime() > now) return false;
              if (y.description.startsWith('TAXA CARTÃO Ref:')) return false;
              if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return false;
              if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return true;
              const ap = accountPlan.find(p => p.id === y.accountPlanId);
              return ap?.type !== 'Despesa';
            })
            .reduce((acc, y) => acc + y.amount, 0);

          const allYieldDebits = yields
            .filter(y => {
              if (y.bankAccountId !== bank.id || new Date(y.date).getTime() > now) return false;
              if (y.description.startsWith('TAXA CARTÃO Ref:')) return false;
              if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return true;
              if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return false;
              const ap = accountPlan.find(p => p.id === y.accountPlanId);
              return ap?.type === 'Despesa';
            })
            .reduce((acc, y) => acc + y.amount, 0);

          const allCardPayments = (corporateCardPayments || [])
            .filter(p => p.bankAccountId === bank.id && new Date(p.date).getTime() <= now)
            .reduce((acc, p) => acc + p.amount, 0);

          const currentRunningBalance = initialSystemBalance + allCredits + allTransferCredits + allYieldCredits - allDebits - allTransferDebits - allYieldDebits - allCardPayments;

          totalBancos += currentRunningBalance;
          
          rows.push(['CASH_FLOW_ITEM', `${bank.bankName}${bank.isBlocked ? ' (BLOQUEADO)' : ''}`, bank.agency, bank.accountNumber, formatCurrency(currentRunningBalance), '']);
        });
        rows.push(['CASH_FLOW_SUBTOTAL', 'Total em Bancos:', '', '', formatCurrency(totalBancos), '']);
        rows.push(['', '', '', '', '', '']);

        // 2. Contas a Receber (grouped by customer)
        rows.push(['CASH_FLOW_SECTION', 'CLIENTES A RECEBER (Saldo no período selecionado)']);
        rows.push(['COLUMN_HEADERS_CASHFLOW', 'Cliente', 'Documentos (NFs)', 'Vencimentos', 'Saldo a Receber', '']);
        
        const receivablesByCustomer = new Map<string, { total: number; nfs: Set<string>; dueDates: Set<string> }>();
        
        sales.forEach(s => {
          const sInstallments = s.installmentsList || [];
          if (sInstallments.length > 0) {
            sInstallments.forEach(inst => {
              if (inst.status !== 'Pago') {
                const instPayments = payments.filter(p => p.saleId === s.id && p.installmentId === inst.id);
                const paidOnInst = instPayments.reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
                const balance = inst.value - paidOnInst;
                if (balance > 0.01) {
                  const d = new Date(inst.dueDate).getTime();
                  if (d >= startTimestamp && d <= endTimestamp) {
                    if (!receivablesByCustomer.has(s.customerName)) receivablesByCustomer.set(s.customerName, { total: 0, nfs: new Set(), dueDates: new Set() });
                    const cData = receivablesByCustomer.get(s.customerName)!;
                    cData.total += balance;
                    cData.nfs.add(s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N'));
                    cData.dueDates.add(formatDateDisplay(inst.dueDate));
                  }
                }
              }
            });
          } else {
            const totalPaid = payments.filter(p => p.saleId === s.id).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
            const balance = s.totalValue - totalPaid;
            if (balance > 0.01) {
              const refDate = s.dueDate ? new Date(s.dueDate) : (s.paymentCondition === 'A Vista' ? new Date(s.date) : new Date(s.date));
              const d = refDate.getTime();
              if (d >= startTimestamp && d <= endTimestamp) {
                if (!receivablesByCustomer.has(s.customerName)) receivablesByCustomer.set(s.customerName, { total: 0, nfs: new Set(), dueDates: new Set() });
                const cData = receivablesByCustomer.get(s.customerName)!;
                cData.total += balance;
                cData.nfs.add(s.isNoNf ? 'S/NF' : (s.nfNumber || 'S/N'));
                cData.dueDates.add(formatDateDisplay(s.dueDate || s.date));
              }
            }
          }
        });

        let totalReceber = 0;
        Array.from(receivablesByCustomer.entries()).sort((a,b) => a[0].localeCompare(b[0])).forEach(([customer, data]) => {
          totalReceber += data.total;
          rows.push(['CASH_FLOW_ITEM', customer, Array.from(data.nfs).join(', '), Array.from(data.dueDates).join(', '), formatCurrency(data.total), '']);
        });
        if (receivablesByCustomer.size === 0) {
          rows.push(['CASH_FLOW_ITEM', 'Nenhum valor a receber no período selecionado.', '', '', '', '']);
        } else {
          rows.push(['CASH_FLOW_SUBTOTAL', 'Total a Receber:', '', '', formatCurrency(totalReceber), '']);
        }
        rows.push(['', '', '', '', '', '']);

        // 3. Contas a Pagar (grouped by vendor)
        rows.push(['CASH_FLOW_SECTION', 'DESPESAS/CONTAS A PAGAR (Saldo no período selecionado)']);
        rows.push(['COLUMN_HEADERS_CASHFLOW', 'Fornecedor', 'Documentos', 'Vencimentos', 'Saldo a Pagar', '']);

        const payablesByVendor = new Map<string, { total: number; docs: Set<string>; dueDates: Set<string> }>();
        let totalCartao = 0;

        expenses.forEach(e => {
          const balance = e.totalValue - (e.amountPaid || 0);
          if (balance > 0.01) {
            // Despesas de Cartão Corporativo não entram aqui, são tratadas em sua própria seção
            if (e.paymentMethod === 'Cartão Corporativo') return;

            const refDate = e.dueDate ? new Date(e.dueDate) : new Date(e.date);
            const d = refDate.getTime();
            if (d >= startTimestamp && d <= endTimestamp) {
              if (!payablesByVendor.has(e.vendorName)) payablesByVendor.set(e.vendorName, { total: 0, docs: new Set(), dueDates: new Set() });
              const vData = payablesByVendor.get(e.vendorName)!;
              vData.total += balance;
              vData.docs.add(e.docNumber || 'S/N');
              vData.dueDates.add(formatDateDisplay(e.dueDate || e.date));
            }
          }
        });

        let totalPagar = 0;
        Array.from(payablesByVendor.entries()).sort((a,b) => a[0].localeCompare(b[0])).forEach(([vendor, data]) => {
          totalPagar += data.total;
          rows.push(['CASH_FLOW_ITEM', vendor, Array.from(data.docs).join(', '), Array.from(data.dueDates).join(', '), formatCurrency(data.total), '']);
        });
        if (payablesByVendor.size === 0) {
          rows.push(['CASH_FLOW_ITEM', 'Nenhum valor a pagar a fornecedores (cartão não incluso).', '', '', '', '']);
        } else {
          rows.push(['CASH_FLOW_SUBTOTAL', 'Total a Pagar (Fornecedores):', '', '', formatCurrency(totalPagar), '']);
        }
        rows.push(['', '', '', '', '', '']);

        // 4. Cartão Corporativo a Pagar (Saldo Acumulado - Dívida Atual)
        rows.push(['CASH_FLOW_SECTION', 'CARTÃO CORPORATIVO A PAGAR (Saldo em Aberto Atual)']);
        let totalDosCartoes = 0;
        const todayEnd = new Date().getTime() + (24 * 60 * 60 * 1000) - 1;
        
        if (corporateCards && corporateCards.length > 0) {
          corporateCards.forEach(card => {
            const totalComprasCard = expenses
              .filter(e => e.paymentMethod === 'Cartão Corporativo' && e.cardId === card.id && new Date(e.date).getTime() <= todayEnd)
              .reduce((acc, e) => acc + e.totalValue, 0);

            const totalPagosCard = (corporateCardPayments || [])
              .filter(p => p.cardId === card.id && new Date(p.date).getTime() <= todayEnd)
              .reduce((acc, p) => acc + p.amount, 0);
            
            const saldoAberto = totalComprasCard - totalPagosCard;
            if (saldoAberto > 0.01) {
              totalDosCartoes += saldoAberto;
              rows.push(['CASH_FLOW_ITEM', `Cartão: ${card.name}`, '', '', formatCurrency(saldoAberto), '']);
            }
          });

          if (totalDosCartoes > 0) {
            rows.push(['CASH_FLOW_SUBTOTAL', 'Total em Cartões (A pagar):', '', '', formatCurrency(totalDosCartoes), '']);
          } else {
            rows.push(['CASH_FLOW_ITEM', 'Nenhuma fatura de Cartão Corporativo em aberto.', '', '', '', '']);
          }
        } else {
          rows.push(['CASH_FLOW_ITEM', 'Nenhum cartão corporativo cadastrado.', '', '', '', '']);
        }
        rows.push(['', '', '', '', '', '']);

        // 5. Totalizador Bruto Periodo (Faturado / Despesas / Lucro)
        const totalFaturadoPeriodo = sales.filter(s => {
          const d = new Date(s.date).getTime();
          if (d < startTimestamp || d > endTimestamp) return false;
          if (!matchesClient(s)) return false;
          if (receivablesFilter === 'withNf') return !s.isNoNf;
          if (receivablesFilter === 'withoutNf') return !!s.isNoNf;
          return true;
        }).reduce((acc, s) => acc + s.totalValue, 0) + 
        (yields || []).filter(y => {
          const d = new Date(y.date).getTime();
          if (d < startTimestamp || d > endTimestamp) return false;
          if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return true;
          if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return false;
          const ap = accountPlan.find(p => p.id === y.accountPlanId);
          return ap?.type === 'Receita';
        }).reduce((acc, y) => acc + y.amount, 0);

        const totalDespesasPeriodo = expenses.filter(e => {
          const d = new Date(e.date).getTime();
          if (d < startTimestamp || d > endTimestamp) return false;
          if (selectedCategoryId !== 'all' && e.accountPlanId !== selectedCategoryId) return false;
          return true;
        }).reduce((acc, e) => acc + e.totalValue, 0) + 
        (yields || []).filter(y => {
          const d = new Date(y.date).getTime();
          if (d < startTimestamp || d > endTimestamp) return false;
          if (y.description.startsWith('SAÍDA EMPRÉSTIMO:')) return true;
          if (y.description.startsWith('RECBTO EMPRÉSTIMO:')) return false;
          const ap = accountPlan.find(p => p.id === y.accountPlanId);
          return ap?.type === 'Despesa';
        }).reduce((acc, y) => acc + y.amount, 0);

        const lucroPeriodo = Math.round((totalFaturadoPeriodo - totalDespesasPeriodo) * 100) / 100;

        // row[0] = tag, row[1] = title, row[2] = bancos, row[3] = receber, row[4] = pagar, row[5] = saldoFluxo, row[6] = faturado, row[7] = despesas, row[8] = lucro
        rows.push(['CASH_FLOW_RESUMO', 'RESUMO DO FLUXO DE CAIXA', totalBancos, totalReceber, totalPagar + totalDosCartoes, totalBancos + totalReceber - (totalPagar + totalDosCartoes), totalFaturadoPeriodo, totalDespesasPeriodo, lucroPeriodo]);

        return {
          title: `Relatório de Fluxo de Caixa - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Visão consolidada de caixa: Bancos, Recebíveis, Pagáveis e Resultado Gerencial.',
          headers: ['', '', '', '', '', ''],
          rows: rows
        };
      }
      case 'dre': {
        const dreSales = sales.filter(s => {
          const d = new Date(s.date).getTime();
          return d >= startTimestamp && d <= endTimestamp;
        });

        const dreExpenses = expenses.filter(e => {
          const d = new Date(e.date).getTime();
          return d >= startTimestamp && d <= endTimestamp;
        });

        const dreYields = yields?.filter(y => {
          const d = new Date(y.date).getTime();
          return d >= startTimestamp && d <= endTimestamp;
        }) || [];

        const valueByAccountId = new Map<string, number>();

        dreSales.forEach(s => {
          valueByAccountId.set(s.accountPlanId, (valueByAccountId.get(s.accountPlanId) || 0) + s.totalValue);
        });

        dreExpenses.forEach(e => {
          valueByAccountId.set(e.accountPlanId, (valueByAccountId.get(e.accountPlanId) || 0) + e.totalValue);
        });

        dreYields.forEach(y => {
          valueByAccountId.set(y.accountPlanId, (valueByAccountId.get(y.accountPlanId) || 0) + y.amount);
        });

        let totalReceitas = 0;
        let totalDespesasOperacionais = 0;
        let totalInvestimentos = 0;

        const rows: any[] = [];
        
        // --- 1. RECEITAS ---
        rows.push(['ACCOUNT_DRE_HIERARCHY', 0, '', 'RECEITAS', '']);
        const receitasCats = accountCategories
          .filter(c => c.type === 'Receita')
          .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

        receitasCats.forEach(cat => {
          let catTotal = 0;
          const catRows: any[] = [];
          
          accountSubcategories
            .filter(s => s.categoryId === cat.id)
            .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
            .forEach(sub => {
              let subcatTotal = 0;
              const subcatRows: any[] = [];
              
              accountPlan
                .filter(p => p.type === 'Receita' && p.category === cat.name && p.subcategory === sub.name && p.mostrarDre !== false)
                .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
                .forEach(acc => {
                  const val = valueByAccountId.get(acc.id) || 0;
                  if (val !== 0) {
                    subcatTotal += val;
                    subcatRows.push(['ACCOUNT_DRE_HIERARCHY', 3, acc.accountNumber || '---', acc.description, formatCurrency(val)]);
                  }
                });

              if (subcatRows.length > 0) {
                catTotal += subcatTotal;
                catRows.push(['ACCOUNT_DRE_HIERARCHY', 2, sub.accountNumber || '---', sub.name, formatCurrency(subcatTotal)]);
                catRows.push(...subcatRows);
              }
            });

          if (catRows.length > 0) {
            totalReceitas += catTotal;
            rows.push(['ACCOUNT_DRE_HIERARCHY', 1, cat.accountNumber || '---', cat.name, formatCurrency(catTotal)]);
            rows.push(...catRows);
          }
        });
        // Atualiza o total da Receita na linha de destaque
        rows[0][4] = formatCurrency(totalReceitas);

        rows.push(['', '', '']);

        // --- 2. DESPESAS OPERACIONAIS (Categorias 1 e 2) ---
        rows.push(['ACCOUNT_DRE_HIERARCHY', 0, '', 'DESPESAS OPERACIONAIS', '']);
        const despesasCats = accountCategories
          .filter(c => c.type === 'Despesa')
          .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

        const operacionaisCats = despesasCats.filter(c => {
          const mainNum = parseInt((c.accountNumber || '0').split('.')[0]);
          return mainNum < 3;
        });

        operacionaisCats.forEach(cat => {
          let catTotal = 0;
          const catRows: any[] = [];

          accountSubcategories
            .filter(s => s.categoryId === cat.id)
            .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
            .forEach(sub => {
              let subcatTotal = 0;
              const subcatRows: any[] = [];

              accountPlan
                .filter(p => p.type === 'Despesa' && p.category === cat.name && p.subcategory === sub.name && p.mostrarDre !== false)
                .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
                .forEach(acc => {
                  const val = valueByAccountId.get(acc.id) || 0;
                  if (val !== 0) {
                    subcatTotal += val;
                    subcatRows.push(['ACCOUNT_DRE_HIERARCHY', 3, acc.accountNumber || '---', acc.description, formatCurrency(val)]);
                  }
                });

              if (subcatRows.length > 0) {
                catTotal += subcatTotal;
                catRows.push(['ACCOUNT_DRE_HIERARCHY', 2, sub.accountNumber || '---', sub.name, formatCurrency(subcatTotal)]);
                catRows.push(...subcatRows);
              }
            });

          if (catRows.length > 0) {
            totalDespesasOperacionais += catTotal;
            rows.push(['ACCOUNT_DRE_HIERARCHY', 1, cat.accountNumber || '---', cat.name, formatCurrency(catTotal)]);
            rows.push(...catRows);
          }
        });
        // Atualiza o total da Despesa Operacional
        rows[rows.length - (operacionaisCats.length > 0 ? rows.slice().reverse().findIndex(r => r[1] === 0 && r[3] === 'DESPESAS OPERACIONAIS') : 1) - 1][4] = formatCurrency(totalDespesasOperacionais);
        // Ajuste simplificado: localizar a linha de cabeçalho correta
        const operationalHeaderIndex = rows.findIndex(r => r[1] === 0 && r[3] === 'DESPESAS OPERACIONAIS');
        if (operationalHeaderIndex !== -1) rows[operationalHeaderIndex][4] = formatCurrency(totalDespesasOperacionais);

        rows.push(['', '', '']);
        
        // --- 3. RESULTADO DO PERÍODO (Antes dos Investimentos) ---
        const lucroBruto = totalReceitas - totalDespesasOperacionais;
        rows.push(['DRE_RESULT', 'RESULTADO DO PERÍODO:', formatCurrency(lucroBruto)]);
        rows.push(['', '', '']);

        // --- 4. COMPRAS E INVESTIMENTOS (Categorias 3 em diante) ---
        rows.push(['ACCOUNT_DRE_HIERARCHY', 0, '', 'COMPRAS E INVESTIMENTOS', '']);
        const investimentosCats = despesasCats.filter(c => {
          const mainNum = parseInt((c.accountNumber || '0').split('.')[0]);
          return mainNum >= 3;
        });

        investimentosCats.forEach(cat => {
          let catTotal = 0;
          const catRows: any[] = [];

          accountSubcategories
            .filter(s => s.categoryId === cat.id)
            .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
            .forEach(sub => {
              let subcatTotal = 0;
              const subcatRows: any[] = [];

              accountPlan
                .filter(p => p.type === 'Despesa' && p.category === cat.name && p.subcategory === sub.name && p.mostrarDre !== false)
                .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''))
                .forEach(acc => {
                  const val = valueByAccountId.get(acc.id) || 0;
                  if (val !== 0) {
                    subcatTotal += val;
                    subcatRows.push(['ACCOUNT_DRE_HIERARCHY', 3, acc.accountNumber || '---', acc.description, formatCurrency(val)]);
                  }
                });

              if (subcatRows.length > 0) {
                catTotal += subcatTotal;
                catRows.push(['ACCOUNT_DRE_HIERARCHY', 2, sub.accountNumber || '---', sub.name, formatCurrency(subcatTotal)]);
                catRows.push(...subcatRows);
              }
            });

          if (catRows.length > 0) {
            totalInvestimentos += catTotal;
            rows.push(['ACCOUNT_DRE_HIERARCHY', 1, cat.accountNumber || '---', cat.name, formatCurrency(catTotal)]);
            rows.push(...catRows);
          }
        });
        
        // Atualiza cabeçalho de Investimentos
        const investmentHeaderIndex = rows.findIndex(r => r[1] === 0 && r[3] === 'COMPRAS E INVESTIMENTOS');
        if (investmentHeaderIndex !== -1) rows[investmentHeaderIndex][4] = formatCurrency(totalInvestimentos);

        // Se tiver valor em compras/investimentos, mostrar o totalizador abaixo
        if (totalInvestimentos > 0) {
          rows.push(['DRE_RESULT_INVESTMENT', 'TOTAL DE COMPRAS/INVESTIMENTOS:', formatCurrency(totalInvestimentos)]);
        }

        // --- 5. SALDO FINAL (Diferença entre Resultado Operacional e Investimentos) ---
        const saldoFinal = lucroBruto - totalInvestimentos;
        rows.push(['', '', '']);
        rows.push(['DRE_RESULT_FINAL', 'SALDO FINAL DO PERÍODO:', formatCurrency(saldoFinal)]);

        return {
          title: `DRE - Demonstração do Resultado - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Visão gerencial de resultados: Receitas - Despesas Operacionais = Resultado Operacional.',
          headers: ['Nº', 'Descrição da Conta', 'Valor do Período'],
          rows: rows
        };
      }
      case 'ctr': {
        const filtered = ctrs
          .filter(c => {
            const d = new Date(c.emittedAt).getTime();
            return d >= startTimestamp && d <= endTimestamp;
          })
          .sort((a, b) => new Date(a.emittedAt).getTime() - new Date(b.emittedAt).getTime());

        return {
          title: `Relatório de CTR Emitidos - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: 'Listagem dos Controles de Transporte de Resíduos registrados no sistema.',
          headers: ['Data Emissão', 'CTR Nº', 'Cliente', 'Observações'],
          rows: filtered.map(c => [
            formatDateDisplay(c.emittedAt),
            c.ctrNumber,
            c.clientName,
            c.observations || '---'
          ])
        };
      }
      case 'orcamentos': {
        const filtered = orcamentos
          .filter(o => {
            const d = new Date(o.dataEmissao).getTime();
            return d >= startTimestamp && d <= endTimestamp;
          })
          .sort((a, b) => a.numero - b.numero);

        const totalGeral = filtered.reduce((acc, o) => {
          return acc + (o.items || []).reduce((s, i) => s + i.value, 0);
        }, 0);

        const rows = filtered.map(o => {
          const tot = (o.items || []).reduce((s, i) => s + i.value, 0);
          return [
            formatDateDisplay(o.dataEmissao),
            `Nº ${String(o.numero).padStart(3, '0')}`,
            o.nome,
            `${o.formaPagamento} / ${o.condicaoPagamento}`,
            formatCurrency(tot),
            o.status
          ];
        });

        rows.push(['', '', '', 'TOTAL GERAL', formatCurrency(totalGeral), '']);

        return {
          title: `Relatório de Orçamentos - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: `${filtered.length} orçamento(s) encontrado(s). Total: ${formatCurrency(totalGeral)}`,
          headers: ['Data Emissão', 'Nº Orçamento', 'Cliente', 'Pagamento', 'Total', 'Status'],
          rows
        };
      }
      case 'employees': {
        return {
          title: 'Relatório Geral de Funcionários Registrados',
          headerInfo: 'Listagem completa de funcionários com salários e encargos.',
          headers: ['Nome Completo', 'Data Registro', 'Função', 'Salário Bruto', 'Diferença P/F', 'Observações'],
          rows: employees.map(e => [
            e.nomeCompleto,
            formatDateDisplay(e.dataRegistro),
            e.funcao,
            formatCurrency(e.salarioBruto),
            formatCurrency(e.diferencaPf || 0),
            e.observacao || '---'
          ]),
          total: employees.reduce((acc, e) => acc + e.salarioBruto + (e.diferencaPf || 0), 0)
        };
      }
      case 'employeeLoans': {
        const filtered = employeeLoans
          .filter(l => {
            const d = new Date(l.dataEmprestimo).getTime();
            return d >= startTimestamp && d <= endTimestamp;
          })
          .sort((a, b) => new Date(a.dataEmprestimo).getTime() - new Date(b.dataEmprestimo).getTime());

        const rows: any[] = [];

        filtered.forEach((loan, loanIdx) => {
          if (loanIdx > 0) rows.push(['MONTH_SEPARATOR', '', '', '', '', '']);

          const bank = bankAccounts.find(b => b.id === loan.bancoSaidaId);
          const acc = accountPlan.find(p => p.id === loan.accountPlanId);
          const pagas = loan.parcelas.filter(p => p.status === 'Pago').length;
          const totalPago = loan.parcelas.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valorPago, 0);
          const totalPendente = loan.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0);

          rows.push([`FUNCIONÁRIO: ${loan.funcionarioNome.toUpperCase()}`, 'FULL_WIDTH_HEADER', '', '', '', '']);
          rows.push([
            `📅 Data: ${formatDateDisplay(loan.dataEmprestimo)} | 💰 Valor: ${formatCurrency(loan.valorEmprestimo)} (${loan.qtdParcelas}x de ${formatCurrency(loan.valorEmprestimo / loan.qtdParcelas)}) | 🏦 Banco: ${bank?.bankName || '---'} | 🏷️ Conta: ${acc?.description || '---'}`,
            'FULL_WIDTH_HEADER', '', '', '', ''
          ]);
          if (loan.descricao) rows.push([`📝 Descrição: ${loan.descricao}`, 'FULL_WIDTH_HEADER', '', '', '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '']);

          loan.parcelas.forEach(p => {
            const bankParcela = p.bancoId ? bankAccounts.find(b => b.id === p.bancoId) : null;
            rows.push([
              `Parc. ${String(p.numero).padStart(2, '0')}/${loan.qtdParcelas}`,
              formatDateDisplay(p.vencimento),
              formatCurrency(p.valor),
              p.status === 'Pago' ? formatDateDisplay(p.dataPagamento) : '---',
              p.status === 'Pago' ? formatCurrency(p.valorPago) : '---',
              p.status === 'Pago'
                ? (p.tipoBaixa === 'Desconto Salário' ? 'DESC. SALÁRIO' : `BANCO${bankParcela ? ` (${bankParcela.bankName})` : ''}`)
                : getStatusLabel(p)
            ]);
          });

          rows.push([`Resumo: ${pagas}/${loan.qtdParcelas} pagas | Pago: ${formatCurrency(totalPago)} | Pendente: ${formatCurrency(totalPendente)}`, 'IS_TOTAL_MONTH', '', '', '', '']);
        });

        const totalGeral = filtered.reduce((acc, l) => acc + l.valorEmprestimo, 0);
        const totalRecebido = filtered.reduce((acc, l) => acc + l.parcelas.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valorPago, 0), 0);

        return {
          title: `Relatório de Empréstimos a Funcionários - Período: ${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}`,
          headerInfo: `${filtered.length} empréstimo(s) | Total Emprestado: ${formatCurrency(totalGeral)} | Total Recebido: ${formatCurrency(totalRecebido)}`,
          headers: ['Parcela', 'Vencimento', 'Valor', 'Data Pagto', 'Valor Pago', 'Tipo Baixa'],
          rows: rows,
          total: totalGeral
        };
      }
      case 'companyLoans': {
        const filtered = companyLoans
          .filter(l => selectedLoanId === 'all' || l.id === selectedLoanId)
          .sort((a, b) => new Date(a.dataEmprestimo).getTime() - new Date(b.dataEmprestimo).getTime());

        const rows: any[] = [];

        filtered.forEach((loan, loanIdx) => {
          if (loanIdx > 0) rows.push(['MONTH_SEPARATOR', '', '', '', '', '']);

          const bank = bankAccounts.find(b => b.id === loan.bancoCreditoId);
          const pagas = loan.parcelas.filter(p => p.status === 'Pago');
          const totalPago = pagas.reduce((s, p) => s + p.valorPago + (p.juros || 0), 0);
          const totalPendente = loan.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0);
          const totalJuros = pagas.reduce((s, p) => s + (p.juros || 0), 0);

          rows.push([`EMPRÉSTIMO: ${loan.nomeEmprestimo.toUpperCase()}`, 'FULL_WIDTH_HEADER', '', '', '', '']);
          rows.push([
            `📅 Data: ${formatDateDisplay(loan.dataEmprestimo)} | 💰 Valor: ${formatCurrency(loan.valorEmprestado)} (${loan.qtdParcelas}x) | 🏦 Banco: ${bank?.bankName || '---'}${loan.totalTaxasContrato > 0 ? ` | ⚠️ Taxas: ${formatCurrency(loan.totalTaxasContrato)}` : ''}`,
            'FULL_WIDTH_HEADER', '', '', '', ''
          ]);
          if (loan.descricao) rows.push([`📝 ${loan.descricao}`, 'FULL_WIDTH_HEADER', '', '', '', '']);
          rows.push(['COLUMN_HEADERS', '', '', '', '', '']);

          loan.parcelas.forEach(p => {
            const bankParcela = p.bancoDebitoId ? bankAccounts.find(b => b.id === p.bancoDebitoId) : null;
            rows.push([
              `Parc. ${String(p.numero).padStart(2, '0')}/${loan.qtdParcelas}`,
              formatDateDisplay(p.vencimento),
              formatCurrency(p.valor),
              p.status === 'Pago' ? formatDateDisplay(p.dataPagamento) : '---',
              p.status === 'Pago' ? formatCurrency(p.valorPago + (p.juros || 0)) : '---',
              p.status === 'Pago'
                ? `BANCO${bankParcela ? ` (${bankParcela.bankName})` : ''}${p.juros && p.juros > 0 ? ` +Juros ${formatCurrency(p.juros)}` : ''}`
                : getStatusLabel(p)
            ]);
          });

          rows.push([`Resumo: ${pagas.length}/${loan.qtdParcelas} pagas | Pago: ${formatCurrency(totalPago)}${totalJuros > 0 ? ` (Juros: ${formatCurrency(totalJuros)})` : ''} | Saldo Devedor: ${formatCurrency(totalPendente)}`, 'IS_TOTAL_MONTH', '', '', '', '']);
        });

        const totalEmprestado = filtered.reduce((acc, l) => acc + l.valorEmprestado, 0);
        const totalPagoGeral = filtered.reduce((acc, l) => acc + l.parcelas.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valorPago + (p.juros || 0), 0), 0);
        const totalDevedorGeral = filtered.reduce((acc, l) => acc + l.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0), 0);

        return {
          title: `Relatório de Empréstimos Bancos a Pagar`,
          headerInfo: `${filtered.length} empréstimo(s) | Total Emprestado: ${formatCurrency(totalEmprestado)} | Total Pago: ${formatCurrency(totalPagoGeral)} | Saldo Devedor: ${formatCurrency(totalDevedorGeral)}`,
          headers: ['Parcela', 'Vencimento', 'Valor', 'Data Pagto', 'Total Pago', 'Tipo Baixa'],
          rows: rows,
          total: totalEmprestado
        };
      }
      default:
        return null;
    }
  }, [selectedReport, selectedBankId, selectedEquipmentId, startDate, endDate, customers, vendors, vendorCategories, sales, expenses, payments, accountPlan, bankAccounts, fleet, maintenanceRecords, agendaItems, receivablesFilter, selectedCategoryId, selectedCustomerId, selectedCardId, statusFilter, agendaStatus, agendaCategory, corporateCards, corporateCardPayments, ctrs, orcamentos, employees, employeeLoans, companyLoans, selectedLoanId]);

  return (
    <div className="space-y-8">
      <div className="print:hidden space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Relatórios Financeiros */}
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <HandCoins className="text-amber-500 mr-2" size={20} />
                Relatórios Financeiros
              </label>
              <div className="relative group">
                <select
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white focus:border-amber-200 transition-all appearance-none cursor-pointer"
                  value={['cashFlow', 'bankStatement', 'corporateCard', 'sales', 'receivables', 'cardFees', 'receivablesPending', 'customerStatement', 'payments', 'expensesPending'].includes(selectedReport || '') ? selectedReport || '' : ''}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                >
                  <option value="" disabled>Selecione um Relatório...</option>
                  <option value="cashFlow">🌊 Fluxo de Caixa</option>
                  <option value="bankStatement">💰 Extrato Bancário</option>
                  <option value="sales">📈 Faturamento por Período</option>
                  <option value="receivablesPending">⏳ Contas a Receber</option>
                  <option value="receivables">📥 Contas Recebidas</option>
                  <option value="customerStatement">📘 Conta Corrente de Clientes</option>
                  <option value="expensesPending">⚠️ Contas a Pagar</option>
                  <option value="expensesByMonth">📊 Despesas por Conta</option>
                  <option value="expensesByMonthFlat">📊 Despesas por Mês</option>
                  <option value="payments">💸 Pagamentos Efetuados</option>
                  <option value="corporateCard">💳 Cartão Corporativo</option>
                  <option value="cardFees">✂️ Taxas de Cartão (Vendas)</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-amber-500 transition-transform rotate-90" size={18} />
              </div>
            </div>

            {/* Relatórios Cadastrais */}
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <Users className="text-blue-500 mr-2" size={20} />
                Relatórios Cadastrais
              </label>
              <div className="relative group">
                <select
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer"
                  value={['customers', 'vendors', 'customersSummary', 'vendorsSummary', 'banks', 'accountCategoriesList', 'agenda', 'ctr', 'orcamentos', 'employees', 'employeeLoans', 'companyLoans'].includes(selectedReport || '') ? selectedReport || '' : ''}
                  onChange={(e) => {
                    setSelectedReport(e.target.value as ReportType);
                    setSelectedEquipmentId('all');
                  }}
                >
                  <option value="" disabled>Selecione um Relatório...</option>
                  <option value="customers">👥 Listagem de Clientes</option>
                  <option value="customersSummary">📝 Listagem de Clientes (Resumo)</option>
                  <option value="vendors">🚚 Relatório Geral de Fornecedores</option>
                  <option value="vendorsSummary">📝 Listagem de Fornecedores (Resumo)</option>
                  <option value="employees">👷 Relatório de Funcionários</option>

                  <option value="accountCategoriesList">📖 PLANO DE CONTAS</option>
                  <option value="banks">🏛️ Contas Bancárias</option>
                  <option value="agenda">📅 Agenda de Tarefas</option>
                  <option value="ctr">📄 Relatório CTR</option>
                  <option value="orcamentos">📋 Relatório Orçamentos</option>
                  <option value="employeeLoans">💰 Empréstimos a Funcionários</option>
                  <option value="companyLoans">🏦 Empréstimos Bancos a Pagar</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-transform rotate-90" size={18} />
              </div>
            </div>

            {/* Relatórios de Frota */}
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <Wrench className="text-rose-500 mr-2" size={20} />
                Frota e Manutenção
              </label>
              <div className="relative group">
                <select
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white focus:border-rose-200 transition-all appearance-none cursor-pointer"
                  value={['fleetAlerts', 'fleetHistory', 'fleetIntervals'].includes(selectedReport || '') ? selectedReport || '' : ''}
                  onChange={(e) => {
                    setSelectedReport(e.target.value as ReportType);
                    setSelectedEquipmentId('all');
                  }}
                >
                  <option value="" disabled>Selecione um Relatório...</option>
                  <option value="fleetAlerts">🚨 ALERTAS DE MANUTENÇÃO</option>
                  <option value="fleetHistory">📜 Histórico Completo</option>
                  <option value="fleetIntervals">⏱️ Prazos Cadastrados</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-rose-500 transition-transform rotate-90" size={18} />
              </div>
            </div>

            {/* Relatórios Contábeis */}
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <BookOpen className="text-emerald-500 mr-2" size={20} />
                Relatórios Contábeis
              </label>
              <div className="relative group">
                <select
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-200 transition-all appearance-none cursor-pointer"
                  value={['dre'].includes(selectedReport || '') ? selectedReport || '' : ''}
                  onChange={(e) => {
                    setSelectedReport(e.target.value as ReportType);
                    setSelectedEquipmentId('all');
                  }}
                >
                  <option value="" disabled>Selecione um Relatório...</option>
                  <option value="dre">📈 DRE (Resultado)</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-transform rotate-90" size={18} />
              </div>
            </div>
          </div>

          {selectedReport && (
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 space-y-6">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                {selectedReport === 'bankStatement' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Building2 size={14} className="mr-1" /> Selecionar Conta Banco
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                    >
                      <option value="">Escolha um banco...</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName}{b.isBlocked ? ' (BLOQUEADO)' : ''} - {b.accountNumber}</option>)}
                    </select>
                  </div>
                )}

                {selectedReport === 'fleetHistory' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Truck size={14} className="mr-1" /> Selecionar Equipamento
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                      value={selectedEquipmentId}
                      onChange={(e) => setSelectedEquipmentId(e.target.value)}
                    >
                      <option value="all">TODOS OS EQUIPAMENTOS</option>
                      {fleet.map(e => {
                        const v = companyVehicles.find(v => v.id === e.vehicleId);
                        return <option key={e.id} value={e.id}>{v?.type} - {v?.model}</option>;
                      })}
                    </select>
                  </div>
                )}

                {selectedReport === 'fleetAlerts' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Truck size={14} className="mr-1" /> Equipamento
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                      value={selectedEquipmentId}
                      onChange={(e) => setSelectedEquipmentId(e.target.value)}
                    >
                      <option value="all">TODOS OS VEÍCULOS</option>
                      {fleet.map(e => {
                        const v = companyVehicles.find(v => v.id === e.vehicleId);
                        return <option key={e.id} value={e.id}>{v?.type} - {v?.model}</option>;
                      })}
                    </select>
                  </div>
                )}

                {selectedReport === 'companyLoans' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Building2 size={14} className="mr-1" /> Escolher Empréstimo
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 font-bold"
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                    >
                      <option value="all">TODOS OS EMPRÉSTIMOS</option>
                      {companyLoans?.map(l => (
                        <option key={l.id} value={l.id}>{l.nomeEmprestimo.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                )}

                {['cashFlow', 'dre', 'sales', 'receivables', 'receivablesPending', 'customerStatement', 'payments', 'expensesByMonth', 'expensesByMonthFlat', 'expensesPending', 'bankStatement', 'corporateCard', 'fleetHistory', 'cardFees', 'fleetAlerts', 'ctr', 'orcamentos', 'employees'].includes(selectedReport) && (
                  <>
                    {['dre', 'sales', 'receivables', 'receivablesPending'].includes(selectedReport) && (
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <Receipt size={14} className="mr-1" /> Faturamento
                        </label>
                        <select
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          value={receivablesFilter}
                          onChange={(e) => setReceivablesFilter(e.target.value as any)}
                        >
                          <option value="all">TODOS</option>
                          <option value="withNf">RECEBIMENTOS COM NF</option>
                          <option value="withoutNf">RECEBIMENTOS SEM NF</option>
                        </select>
                      </div>
                    )}

                    {['sales', 'receivables', 'receivablesPending', 'customerStatement'].includes(selectedReport) && (
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <Users size={14} className="mr-1" /> Clientes
                        </label>
                        <select
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                          <option value="all">TODOS</option>
                          {customers.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {['expensesPending', 'expensesByMonth', 'expensesByMonthFlat', 'payments'].includes(selectedReport) && (
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <BookOpen size={14} className="mr-1" /> Conta
                        </label>
                        <select
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                        >
                          <option value="all">TODAS AS CONTAS</option>
                          {sortedExpenseAccounts.map(p => (
                            <option key={p.id} value={p.id}>{p.subcategory} / {p.description}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {selectedReport === 'corporateCard' && (
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <CreditCard size={14} className="mr-1" /> Selecionar Cartão
                        </label>
                        <select
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          value={selectedCardId}
                          onChange={(e) => setSelectedCardId(e.target.value)}
                        >
                          <option value="all">TODOS OS CARTÕES</option>
                          {corporateCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Calendar size={14} className="mr-1" /> Data Inicial
                      </label>
                      <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={startDate} onChange={(e) => {
                        setStartDate(e.target.value);
                        setPeriod('custom');
                      }} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Calendar size={14} className="mr-1" /> Data Final
                      </label>
                      <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={endDate} onChange={(e) => {
                        setEndDate(e.target.value);
                        setPeriod('custom');
                      }} />
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Clock size={14} className="mr-1" /> Período
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        value={period}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setPeriod(val);
                          const today = new Date();
                          if (val === 'today') {
                            setStartDate(today.toLocaleDateString('en-CA'));
                            setEndDate(today.toLocaleDateString('en-CA'));
                          } else if (val === '7days') {
                            const start = new Date();
                            // If agenda, maybe follow the "from tomorrow + 6" or just "next 7 days starting today"
                            // For reports, usually it's "today + next 6 days"
                            setStartDate(today.toLocaleDateString('en-CA'));
                            const end = new Date();
                            end.setDate(today.getDate() + 6);
                            setEndDate(end.toLocaleDateString('en-CA'));
                          } else if (val === 'current') {
                            setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA'));
                          } else if (val === 'last') {
                            setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA'));
                          } else if (val === 'year') {
                            setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
                          }
                        }}
                      >
                        <option value="today">Hoje</option>
                        <option value="current">Mês Atual</option>
                        <option value="last">Mês Passado</option>
                        <option value="7days">Próximos 7 Dias</option>
                        <option value="year">Ano Atual</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>
                  </>
                )}

                {['customers', 'vendors', 'customersSummary', 'vendorsSummary'].includes(selectedReport || '') && (
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Users size={14} className="mr-1" /> {
                        ['vendors', 'vendorsSummary'].includes(selectedReport || '')
                          ? 'Filtra Fornecedores'
                          : ['customers', 'customersSummary'].includes(selectedReport || '')
                            ? 'Filtra Clientes'
                            : 'Filtrar Status'
                      }
                    </label>
                    <select
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="Ativos">ATIVOS</option>
                      <option value="Inativos">INATIVOS</option>
                      <option value="Todos">TODOS</option>
                    </select>
                  </div>
                )}

                {selectedReport === 'agenda' && (
                  <>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Clock size={14} className="mr-1" /> Status
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase"
                        value={agendaStatus}
                        onChange={(e) => setAgendaStatus(e.target.value as any)}
                      >
                        <option value="all">TODOS</option>
                        <option value="pending">PENDENTE</option>
                        <option value="scheduled">AGENDADO</option>
                        <option value="completed">CONCLUÍDO</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <AlertTriangle size={14} className="mr-1" /> Categoria
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase"
                        value={agendaCategory}
                        onChange={(e) => setAgendaCategory(e.target.value as any)}
                      >
                        <option value="all">TODOS</option>
                        <option value="Lembrete">LEMBRETE</option>
                        <option value="Urgente">URGENTE</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Calendar size={14} className="mr-1" /> Data Inicial
                      </label>
                      <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={startDate} onChange={(e) => {
                        setStartDate(e.target.value);
                        setPeriod('custom');
                      }} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Calendar size={14} className="mr-1" /> Data Final
                      </label>
                      <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={endDate} onChange={(e) => {
                        setEndDate(e.target.value);
                        setPeriod('custom');
                      }} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Clock size={14} className="mr-1" /> Período
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        value={period}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setPeriod(val);
                          const today = new Date();
                          if (val === 'today') {
                            setStartDate(today.toLocaleDateString('en-CA'));
                            setEndDate(today.toLocaleDateString('en-CA'));
                          } else if (val === '7days') {
                            setStartDate(today.toLocaleDateString('en-CA'));
                            const end = new Date();
                            end.setDate(today.getDate() + 6);
                            setEndDate(end.toLocaleDateString('en-CA'));
                          } else if (val === 'current') {
                            setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA'));
                          } else if (val === 'last') {
                            setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA'));
                          } else if (val === 'year') {
                            setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
                            setEndDate(new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
                          }
                        }}
                      >
                        <option value="today">Hoje</option>
                        <option value="current">Mês Atual</option>
                        <option value="last">Mês Passado</option>
                        <option value="7days">Próximos 7 Dias</option>
                        <option value="year">Ano Atual</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>
                  </>
                )}
                {/* Period selector now inside the common area */}
              </div>
            </div>
          )}

          {selectedReport && (selectedReport !== 'bankStatement' || selectedBankId) && (
            <div className="flex justify-end mt-6">
              <button
                type="button"
                id="print-button"
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                <Printer size={20} />
                <span>Imprimir ou Gerar PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {
        selectedReport && reportContent && (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-100 shadow-xl print:shadow-none print:border-0 print:m-0">
            {/* Cabeçalho Visual (Apenas Tela) */}
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-center bg-white print:hidden">
              <Logo size="lg" className="origin-left" />
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Gerencial</p>
                <h2 className="text-xl font-black text-slate-800">Empréstimos Bancos</h2>
                <p className="text-sm font-bold text-slate-800">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <h2 className="text-sm font-normal text-slate-800 mb-2 border-l-4 border-amber-500 pl-4 uppercase leading-none print:hidden">
              {typeof reportContent.title === 'string' && reportContent.title.includes('(BLOQUEADO)') ? (
                <>
                  {reportContent.title.split('(BLOQUEADO)')[0]}
                  <span className="font-black text-rose-600">(BLOQUEADO)</span>
                  {reportContent.title.split('(BLOQUEADO)')[1]}
                </>
              ) : reportContent.title}
            </h2>
            {reportContent.headerInfo && (
              <p className="text-[10px] font-bold text-slate-500 mb-8 pl-5 uppercase tracking-widest print:hidden">{reportContent.headerInfo}</p>
            )}

            {reportContent.openingBalance !== undefined && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center print:hidden">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Saldo em {new Date(startDate).toLocaleDateString('pt-BR')} (Saldo Anterior):</span>
                <span className={`font-black text-lg ${reportContent.openingBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {formatCurrency(reportContent.openingBalance)}
                </span>
              </div>
            )}

            <div className="overflow-x-auto print:overflow-visible text-slate-800">
              <table className="w-full text-left text-sm border-collapse">
                {/* Repete Cabeçalho em Todas as Páginas na Impressão */}
                <thead className="hidden print:table-header-group">
                  <tr>
                    <th colSpan={reportContent.headers.length} className="pb-4 font-normal">
                      <div className="border-b-2 border-slate-900 pb-2 mb-4 flex justify-between items-center bg-white">
                        <Logo size="lg" className="origin-left" />
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Gerencial</p>
                          <p className="text-sm font-normal text-slate-800">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <h2 className="text-sm font-normal text-slate-800 mb-1 border-l-4 border-amber-500 pl-4 uppercase leading-none text-left print:text-[16px]">
                        {typeof reportContent.title === 'string' && reportContent.title.includes('(BLOQUEADO)') ? (
                          <>
                            {reportContent.title.split('(BLOQUEADO)')[0]}
                            <span className="font-black text-rose-600">(BLOQUEADO)</span>
                            {reportContent.title.split('(BLOQUEADO)')[1]}
                          </>
                        ) : reportContent.title}
                      </h2>
                      {reportContent.headerInfo && (
                        <p className="text-[10px] font-bold text-slate-500 mb-4 pl-5 uppercase tracking-widest text-left">{reportContent.headerInfo}</p>
                      )}
                      {reportContent.openingBalance !== undefined && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center w-full">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Saldo em {new Date(startDate).toLocaleDateString('pt-BR')} (Saldo Anterior):</span>
                          <span className={`font-black text-lg ${reportContent.openingBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(reportContent.openingBalance)}
                          </span>
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
                {selectedReport !== 'sales' && selectedReport !== 'receivables' && selectedReport !== 'customerStatement' && selectedReport !== 'expensesByMonth' && selectedReport !== 'expensesByMonthFlat' && selectedReport !== 'customers' && selectedReport !== 'vendors' && selectedReport !== 'employeeLoans' && selectedReport !== 'companyLoans' && (
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      {reportContent.headers.map((h, k) => (
                        <th
                          key={k}
                          className={`px-4 py-3 font-black text-slate-600 uppercase text-[12px] tracking-wider whitespace-nowrap
                        ${selectedReport === 'receivables' && k === 0 ? 'w-[120px]' : ''}
                        ${selectedReport === 'receivables' && k === 1 ? 'w-auto min-w-[200px]' : ''}
                        ${selectedReport === 'receivables' && k === 5 ? 'w-[200px] text-left' : ''}
                        ${selectedReport === 'receivables' && k === 6 ? 'w-[110px] text-left' : ''}
                        ${selectedReport === 'customerStatement' ? (
                              k === 0 ? 'w-[100px] text-left' :
                                k === 1 ? 'w-full min-w-[300px] text-left' :
                                  k === 2 ? 'w-[140px] text-right' :
                                    k === 3 ? 'w-[140px] text-right' :
                                      k === 4 ? 'w-[140px] text-right' :
                                        k === 5 ? 'w-[160px] text-right' : ''
                            ) : ''}
                         ${selectedReport === 'expensesPending' ? (
                              k === 0 ? 'w-[150px]' :
                                k === 1 ? 'w-full min-w-[180px]' :
                                  k === 2 ? 'w-[80px]' :
                                    k === 3 ? 'w-[90px]' :
                                      k === 4 ? 'w-[90px]' :
                                        k === 5 ? 'w-[110px] text-left' : ''
                            ) : ''}
                        ${selectedReport === 'payments' && k === 0 ? 'w-[120px]' : ''}
                        ${selectedReport === 'payments' && k === 4 ? 'text-left w-[120px]' : ''}
                        ${selectedReport === 'payments' && k === 6 ? 'text-right' : ''}
                         ${selectedReport === 'receivablesPending' && k === 5 ? 'text-left w-[120px]' : ''}
                         ${selectedReport === 'corporateCard' && k === 4 ? 'w-[120px] text-left' : ''}
                         ${selectedReport === 'cardFees' ? (
                              k === 0 ? 'w-full min-w-[150px] text-left' :
                                k === 4 || k === 5 || k === 6 ? 'w-[110px] text-left' : 'text-left'
                            ) : ''}
                         ${selectedReport === 'bankStatement' && (k === 2 || k === 3 || k === 4) ? 'w-[110px] text-left' : ''}
                          ${selectedReport === 'customers' ? (
                              k === 0 ? 'w-full min-w-[200px]' :
                                k === 1 ? 'w-[150px]' :
                                  k === 2 ? 'w-[100px]' :
                                    k === 3 ? 'w-[150px]' :
                                      k === 4 ? 'w-[200px]' :
                                        k === 5 ? 'w-[250px]' : ''
                            ) : ''}
                          ${selectedReport === 'vendors' ? (
                              k === 0 ? 'w-full min-w-[180px]' :
                                k === 1 ? 'w-[150px]' :
                                  k === 2 ? 'w-[150px]' :
                                    k === 3 ? 'w-[100px]' :
                                      k === 4 ? 'w-[150px]' :
                                        k === 5 ? 'w-[200px]' : ''
                            ) : ''}
                          ${selectedReport === 'sales' ? (
                              k === 0 ? 'w-[100px] text-left' :
                                k === 1 ? 'w-[90px] text-left' :
                                  k === 2 ? 'w-auto text-left' :
                                    k === 3 ? 'w-[200px] text-left' :
                                      k === 4 ? 'w-[110px] text-left' :
                                        k === 5 ? 'w-[120px] text-right' : ''
                            ) : ''}
                          ${selectedReport === 'agenda' ? (
                              k === 0 ? 'w-[150px] text-left' :
                                k === 1 ? 'w-full text-left' :
                                  k === 2 ? 'w-[150px] text-left' :
                                    k === 3 ? 'w-[150px] text-left' : ''
                            ) : ''}
                          ${(['customersSummary', 'vendorsSummary'].includes(selectedReport || '')) ? (
                              k === 0 ? (selectedReport === 'vendorsSummary' ? 'w-[200px]' : 'w-[280px]') :
                                k === 1 ? (selectedReport === 'vendorsSummary' ? 'w-[200px]' : 'w-[170px]') :
                                  k === 2 ? (selectedReport === 'vendorsSummary' ? 'w-[140px]' : 'w-[170px]') :
                                    k === 3 ? (selectedReport === 'customersSummary' ? 'w-full text-left' : 'w-[130px] text-left') :
                                      k === 4 ? (selectedReport === 'vendorsSummary' ? 'w-full text-left' : 'w-full text-left') : ''
                            ) : ''}
                          ${selectedReport === 'dre' ? (
                              k === 0 ? 'w-[120px]' :
                                k === 1 ? 'w-full text-left' :
                                  k === 2 ? 'w-[200px] text-right' : ''
                            ) : ''}
                          ${selectedReport === 'accountCategoriesList' ? (
                              k === 0 ? 'w-[120px] text-left' :
                                k === 1 ? 'w-full text-left' : ''
                            ) : ''}
                      `}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-200">
                  {reportContent.rows.length > 0 ? reportContent.rows.map((row, i) => {
                    const rowString = row.join(' ');
                    const isTotalMonthRow = row[1] === 'IS_TOTAL_MONTH';
                    const isSubtotalRow = rowString.includes('SUBTOTAL') || isTotalMonthRow;
                    const isSectionHeader = !isSubtotalRow && (
                      rowString.includes('MÊS:') ||
                      rowString.includes('CLIENTE:') ||
                      rowString.includes('FATURAMENTO COM') ||
                      rowString.includes('FATURAMENTO SEM') ||
                      rowString.includes('RECEBIMENTOS COM') ||
                      rowString.includes('RECEBIMENTOS SEM') ||
                      rowString.includes('DESPESAS COM') ||
                      rowString.includes('DESPESAS POR') ||
                      rowString.includes('MOVIMENTAÇÃO DE')
                    );

                    // Treat empty rows as visual spacers
                    const isEmptyRow = row.every(cell => cell === '');
                    if (isEmptyRow) {
                      return (
                        <tr key={i} className="h-6 bg-white border-0">
                          <td colSpan={reportContent.headers.length}></td>
                        </tr>
                      );
                    }

                    if (row[0] === 'ACCOUNT_CAT_HIERARCHY' || row[0] === 'ACCOUNT_DRE_HIERARCHY') {
                      const level = row[1];
                      const num = row[2];
                      const title = row[3];
                      const value = row[4];

                      let numStyle = '';
                      let descStyle = '';
                      let paddingLeft1 = '';
                      let paddingLeft2 = '';

                      if (level === 0) {
                        numStyle = 'text-[20px] text-slate-900 font-normal print:text-[14px]';
                        descStyle = 'text-[20px] text-slate-900 font-normal uppercase tracking-widest print:text-[14px]';
                        paddingLeft1 = 'pl-4 pt-10 pb-4 print:pt-6 print:pb-2';
                        paddingLeft2 = 'pl-4 pt-10 pb-4 print:pt-6 print:pb-2';
                      } else if (level === 1) {
                        numStyle = 'text-base text-slate-900 font-normal print:text-[12px]';
                        descStyle = 'text-base text-slate-900 font-normal uppercase print:text-[12px]';
                        paddingLeft1 = 'pl-16 pt-3 pb-1 print:pt-1 print:pb-0';
                        paddingLeft2 = 'pl-6 pt-3 pb-1 print:pt-1 print:pb-0';
                      } else if (level === 2) {
                        numStyle = 'text-base text-slate-900 font-normal print:text-[12px]';
                        descStyle = 'text-base text-slate-900 font-normal uppercase print:text-[12px]';
                        paddingLeft1 = 'pl-[100px] pt-3 pb-1 print:pt-1 print:pb-0';
                        paddingLeft2 = 'pl-6 pt-3 pb-1 print:pt-1 print:pb-0';
                      } else if (level === 3) {
                        numStyle = 'text-sm text-slate-500/80 font-medium print:text-[12px]';
                        descStyle = 'text-sm text-slate-500/80 font-medium tracking-wide flex items-center gap-2 before:content-[\'\'] before:w-3 before:h-[1px] before:bg-slate-300/80 print:text-[12px]';
                        paddingLeft1 = 'pl-[130px] pt-1 pb-1 print:pt-0 print:pb-0';
                        paddingLeft2 = 'pl-8 pt-1 pb-1 print:pt-0 print:pb-0';
                      }

                      return (
                        <tr key={i} className={`border-0 bg-transparent`}>
                          <td className={`w-[120px] ${paddingLeft1} align-top print:py-1`}>
                            <span className={numStyle}>{num}</span>
                          </td>
                          <td className={`w-auto ${paddingLeft2} align-top print:py-1`}>
                            <span className={descStyle}>{title}</span>
                          </td>
                          {row[0] === 'ACCOUNT_DRE_HIERARCHY' && (
                            <td className={`text-right align-top print:py-1 px-4 ${level === 0 ? 'text-[20px] pt-10 pb-4 font-black print:text-[14px]' : level === 1 ? 'pt-3 pb-1 font-bold print:text-[12px] text-base' : level === 2 ? 'pt-3 pb-1 font-semibold print:text-[12px] text-base' : 'pt-1 pb-1 text-slate-500 font-medium print:text-[12px] text-sm'}`}>
                              {value}
                            </td>
                          )}
                        </tr>
                      );
                    }

                    if (row[0] === 'CUSTOM_CARD') {
                      return (
                        <tr key={i} className="py-4">
                          <td colSpan={reportContent.headers.length} className="px-4 py-4">
                            <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-wide">{row[1]}</span>
                              <span className={`text-[11px] font-black px-4 py-1 rounded-lg border-2 ${row[2] === 'ATIVO' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-rose-500 text-rose-600 bg-rose-50'}`}>
                                STATUS: {row[2]}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-8 gap-y-4 p-4 bg-slate-50/50 rounded-xl">
                              <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">CPF / CNPJ</p>
                                <p className="text-slate-900 font-normal text-[12px] tracking-wide">{row[3] || '---'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">
                                  {selectedReport === 'vendors' ? 'Nome Fantasia' : 'Responsável'}
                                </p>
                                <p className="text-slate-900 font-normal text-[12px] uppercase">{row[4] || '---'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Telefone / Email</p>
                                <p className="text-slate-900 font-normal text-[12px]">{row[5] || '---'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Endereço</p>
                                <p className="text-slate-900 font-normal text-[12px]">{row[6] || '---'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'CUSTOMER_STATEMENT_HEADER') {
                      return (
                        <tr key={i} className="py-2 bg-transparent border-0">
                          <td colSpan={reportContent.headers.length} className="px-4 py-6">
                            <div className="flex flex-col border-b-2 border-slate-900 pb-2">
                              <span className="text-lg font-black text-slate-800 uppercase tracking-wide">CLIENTE: {row[1]}</span>
                              <span className="text-sm font-bold text-slate-500 uppercase mt-2">
                                Saldo inicial em <span className="text-slate-700">{row[2]}</span>:
                                <span className={`font-black ml-2 ${row[3] >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                  {formatCurrency(row[3])}
                                </span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'CUSTOMER_STATEMENT_FOOTER') {
                      return (
                        <tr key={i} className="font-bold bg-slate-100 border-t-2 border-slate-900 border-b-2">
                          <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-sm text-slate-900">Total no Período:</td>
                          <td className="px-4 py-3 text-right text-slate-900">{row[1]}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{row[2]}</td>
                          <td className="px-4 py-3 text-right text-rose-600">{row[3]}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      );
                    }

                    if (row[1] === 'SECTION_HEADER') {
                      return (
                        <tr key={i} className="bg-slate-800 text-white border-b-2 border-slate-900">
                          <td colSpan={reportContent.headers.length} className="px-4 py-2 font-black text-xs tracking-[0.2em]">
                            {row[0]}
                          </td>
                        </tr>
                      );
                    }

                    if (row[1] === 'FULL_WIDTH_HEADER') {
                      return (
                        <tr key={i} className="bg-slate-50/50 border-0">
                          <td colSpan={reportContent.headers.length} className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-slate-800 uppercase tracking-wide leading-relaxed">{row[0]}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'MONTH_SEPARATOR') {
                      return (
                        <tr key={i} className="bg-white border-0">
                          <td colSpan={reportContent.headers.length} className="py-6">
                            <hr className="border-t-2 border-slate-300 border-dashed" />
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'COLUMN_HEADERS') {
                      return (
                        <tr key={i} className="bg-slate-50 border-y border-slate-200">
                          {reportContent.headers.map((h: string, k: number) => (
                            <th
                              key={k}
                              className={`px-4 py-3 font-black text-slate-600 uppercase text-[12px] tracking-wider whitespace-nowrap
                                ${h.toLowerCase().includes('valor') || h.toLowerCase().includes('total') || h.toLowerCase().includes('saldo') || h.toLowerCase().includes('líquido') || h.toLowerCase().includes('faturado') || h.toLowerCase().includes('recebido') || h.toLowerCase().includes('deduç') ? 'text-right' : 'text-left'}
                                ${k === 0 ? 'w-[90px]' : ''}
                      ${(selectedReport === 'expensesByMonth' || selectedReport === 'expensesByMonthFlat') ? (
                                  k === 1 ? 'w-[180px]' :
                                    k === 2 ? 'w-[40px]' :
                                      k === 3 ? 'w-full' :
                                        k === 4 ? 'w-[100px]' : ''
                                ) : selectedReport === 'sales' ? (
                                  k === 0 ? 'w-[100px]' :
                                    k === 1 ? 'w-[90px]' :
                                      k === 2 ? 'w-auto' :
                                        k === 3 ? 'w-[200px]' :
                                          k === 4 ? 'w-[110px]' :
                                            k === 5 ? 'w-[120px]' : ''
                                ) : selectedReport === 'employeeLoans' ? (
                                  k === 0 ? 'w-[140px] min-w-[140px]' :
                                    k === 1 ? 'w-[110px]' :
                                      k === 2 ? 'w-[110px]' :
                                        k === 3 ? 'w-[110px]' :
                                          k === 4 ? 'w-[110px]' :
                                            k === 5 ? 'w-full' : ''
                                ) : selectedReport === 'companyLoans' ? (
                                  k === 0 ? 'w-[140px] min-w-[140px]' :
                                    k === 1 ? 'w-[110px]' :
                                      k === 2 ? 'w-[110px]' :
                                        k === 3 ? 'w-[110px]' :
                                          k === 4 ? 'w-[110px]' :
                                            k === 5 ? 'w-full' : ''
                                ) : selectedReport === 'receivables' ? (
                                  k === 0 ? 'w-full min-w-[180px]' :
                                    k === 1 ? 'w-[70px]' :
                                      k === 2 ? 'w-[90px]' :
                                        k === 3 ? 'w-[90px]' :
                                          k === 4 ? 'w-[130px]' :
                                            k === 5 ? 'w-[130px]' :
                                              k === 6 ? 'w-[120px]' :
                                                k === 7 ? 'w-[110px]' : ''
                                ) : selectedReport === 'receivablesPending' ? (
                                  k === 0 ? 'w-[100px]' :
                                    k === 1 ? 'w-full' :
                                      k === 2 ? 'w-[60px]' :
                                        k === 3 ? 'w-[150px]' :
                                          k === 4 ? 'w-[100px]' :
                                            k === 5 ? 'w-[120px]' : ''
                                ) : selectedReport === 'expensesPending' ? (
                                  k === 0 ? 'w-[150px]' :
                                    k === 1 ? 'w-full min-w-[180px]' :
                                      k === 2 ? 'w-[80px]' :
                                        k === 3 ? 'w-[90px]' :
                                          k === 4 ? 'w-[90px]' :
                                            k === 5 ? 'w-[110px]' : ''
                                ) : selectedReport === 'cardFees' ? (
                                  k === 0 ? 'w-full min-w-[150px]' :
                                    k === 1 ? 'w-[60px]' :
                                      k === 2 ? 'w-[100px]' :
                                        k === 3 ? 'w-[100px]' :
                                          k === 4 ? 'w-[110px]' :
                                            k === 5 ? 'w-[110px]' :
                                              k === 6 ? 'w-[110px]' : ''
                                ) : selectedReport === 'fleetAlerts' ? (
                                  k === 0 ? 'w-full min-w-[350px]' :
                                    k === 1 ? 'w-[250px]' :
                                      k === 2 ? 'w-[140px]' :
                                        k === 3 ? 'w-[140px]' : ''
                                ) : selectedReport === 'dre' ? (
                                  k === 0 ? 'w-[120px]' :
                                    k === 1 ? 'w-full' :
                                      k === 2 ? 'w-[200px] text-right' : ''
                                ) : selectedReport === 'payments' ? (
                                  k === 0 ? 'w-[100px]' :
                                    k === 1 ? 'w-[100px]' :
                                      k === 2 ? 'w-[80px]' :
                                        k === 3 ? 'w-full min-w-[180px]' :
                                          k === 4 ? 'w-[150px]' :
                                            k === 5 ? 'w-[120px]' :
                                              k === 6 ? 'w-[110px]' : ''
                                ) : selectedReport === 'bankStatement' ? (
                                  k === 1 ? 'w-full min-w-[200px]' :
                                    k === 2 ? 'w-[120px]' :
                                      k === 3 ? 'w-[120px]' :
                                      k === 4 ? 'w-[150px]' : ''
                                ) : selectedReport === 'employees' ? (
                                  k === 0 ? 'w-full text-left' :
                                  k === 1 ? 'w-[100px] text-left' :
                                  k === 2 ? 'w-[150px] text-left' :
                                  k === 3 ? 'w-[120px] text-right' :
                                  k === 4 ? 'w-[120px] text-right' :
                                  k === 5 ? 'w-[180px] text-left' : ''
                                ) : selectedReport === 'accountCategoriesList' ? (
                                  k === 0 ? 'w-[150px]' :
                                    k === 1 ? 'w-full' :
                                      k === 2 ? 'w-[200px]' : ''
                                ) : (
                                  k === 1 ? 'w-[60px]' :
                                    k === 2 ? 'w-auto min-w-[300px] print:min-w-0' :
                                      k === 3 ? '' :
                                        k === 4 ? 'w-[120px]' :
                                          k === 5 ? 'w-[120px]' : ''
                                )}
                              `}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      );
                    }

                    if (row[0] === 'ACCOUNT_PLAN_LEVEL') {
                      const text = row[1];
                      const level = row[2];

                      let paddingLeft = 'pl-4';
                      let styling = 'font-normal text-slate-700';

                      if (level === 0) {
                        paddingLeft = 'pl-4';
                        styling = 'font-black text-slate-900 border-b-2 border-slate-900 text-lg uppercase tracking-widest block pb-1 mt-6';
                      } else if (level === 1) {
                        paddingLeft = 'pl-10';
                        styling = 'font-bold text-slate-800 text-base uppercase tracking-wide mt-4 block';
                      } else if (level === 2) {
                        paddingLeft = 'pl-20';
                        styling = 'font-semibold text-slate-700 text-sm mt-2 block';
                      } else if (level === 3) {
                        paddingLeft = 'pl-32';
                        styling = 'font-medium text-slate-500 text-sm mt-1 block pb-1 border-b border-slate-100 max-w-2xl';
                      }

                      return (
                        <tr key={i} className="border-0 bg-transparent">
                          <td colSpan={reportContent.headers.length} className={`py-0 ${paddingLeft}`}>
                            <span className={styling}>{text}</span>
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'DRE_SECTION') {
                      return (
                        <tr key={i} className="bg-slate-50/50 border-y border-slate-200">
                          <td colSpan={reportContent.headers.length} className="px-4 py-3 font-black text-slate-800 uppercase tracking-widest text-sm">
                            {row[1]}
                          </td>
                        </tr>
                      );
                    }
                    if (row[0] === 'DRE_SUBTOTAL') {
                      return (
                        <tr key={i} className="border-t border-slate-200">
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 font-black text-slate-700 text-right">{row[1]}</td>
                          <td className="px-4 py-2 font-black text-slate-900 border-l border-slate-200 text-right">{row[2]}</td>
                        </tr>
                      );
                    }
                    if (row[0] === 'DRE_RESULT' || row[0] === 'DRE_RESULT_INVESTMENT' || row[0] === 'DRE_RESULT_FINAL') {
                      const isInvest = row[0] === 'DRE_RESULT_INVESTMENT';
                      const isFinal = row[0] === 'DRE_RESULT_FINAL';
                      
                      let bgColor = 'bg-amber-500/10';
                      let borderColor = 'border-slate-900';
                      let textColor = 'text-amber-700';

                      if (isInvest) {
                        bgColor = 'bg-slate-500/10';
                        textColor = 'text-slate-700';
                      }
                      if (isFinal) {
                        bgColor = 'bg-blue-600/10';
                        borderColor = 'border-blue-900';
                        textColor = 'text-blue-700 font-bold';
                      }

                      return (
                        <tr key={i} className={`border-t-4 ${borderColor} ${bgColor}`}>
                          <td colSpan={2} className="px-6 py-5 font-black text-slate-900 text-right uppercase tracking-widest text-sm sm:text-base">
                            {row[1]}
                          </td>
                          <td className={`px-6 py-5 font-black ${textColor} text-xl sm:text-2xl border-l ${borderColor} text-right whitespace-nowrap`}>
                            {row[2]}
                          </td>
                        </tr>
                      );
                    }

                    if (row[0] === 'CASH_FLOW_SECTION') {
                      return (
                        <tr key={i} className="bg-slate-50 border-y border-slate-200 border-t-4 border-t-amber-500 mt-8">
                          <td colSpan={reportContent.headers.length} className="px-4 py-4 font-black text-slate-800 uppercase tracking-widest text-sm text-left">
                            {row[1]}
                          </td>
                        </tr>
                      );
                    }
                    if (row[0] === 'COLUMN_HEADERS_CASHFLOW') {
                      return (
                        <tr key={i} className="bg-slate-100/50 border-b border-slate-200">
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-left max-w-[250px]">{row[1]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-left">{row[2]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-left w-[200px]">{row[3]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right w-[150px]">{row[4]}</th>
                          <th colSpan={reportContent.headers.length - 4} className="px-4 py-2"></th>
                        </tr>
                      );
                    }
                    if (row[0] === 'CASH_FLOW_ITEM') {
                      return (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-700 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]">{row[1]}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[250px]">{row[2]}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[200px]">{row[3]}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-800 text-right">{row[4]}</td>
                          <td colSpan={reportContent.headers.length - 4} className="px-4 py-3"></td>
                        </tr>
                      );
                    }
                    if (row[0] === 'CASH_FLOW_SUBTOTAL') {
                      return (
                        <tr key={i} className="bg-white border-b border-slate-300">
                          <td colSpan={3} className="px-4 py-3 text-sm font-black text-slate-500 text-right uppercase tracking-wider">{row[1]}</td>
                          <td className="px-4 py-3 text-base font-black text-slate-900 border-l border-slate-200 text-right">{row[4]}</td>
                          <td colSpan={reportContent.headers.length - 4} className="px-4 py-3"></td>
                        </tr>
                      );
                    }
                    if (row[0] === 'CASH_FLOW_RESUMO') {
                      return (
                        <React.Fragment key={i}>
                          <tr className="bg-white border-0">
                            <td colSpan={reportContent.headers.length} className="py-6 border-b-2 border-slate-200"></td>
                          </tr>
                          <tr className="bg-slate-900 border-0">
                            <td colSpan={reportContent.headers.length} className="px-4 py-6 font-black text-amber-500 uppercase tracking-widest text-lg text-center rounded-t-xl">
                              {row[1]}
                            </td>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase text-sm">Disponibilidades (Bancos)</td>
                            <td className="px-6 py-4 text-base font-black text-blue-600 text-right border-l border-slate-200 bg-white">{formatCurrency(row[2])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase text-sm flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Contas a Receber</td>
                            <td className="px-6 py-4 text-base font-black text-emerald-600 text-right border-l border-slate-200 bg-white">+ {formatCurrency(row[3])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase text-sm flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> Contas a Pagar (Incluindo Cartão)</td>
                            <td className="px-6 py-4 text-base font-black text-rose-600 text-right border-l border-slate-200 bg-white">- {formatCurrency(row[4])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          <tr className="bg-slate-100 border-b-4 border-slate-900">
                            <td colSpan={3} className="px-6 py-5 font-black text-slate-900 uppercase text-sm text-right tracking-widest">Saldo do Fluxo de Caixa:</td>
                            <td className={`px-6 py-5 text-2xl font-black text-right border-l border-slate-300 bg-white shadow-inner ${row[5] >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(row[5])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          
                          <tr className="bg-white border-0">
                            <td colSpan={reportContent.headers.length} className="py-6 border-b-2 border-slate-200"></td>
                          </tr>
                          <tr className="bg-slate-900 border-0">
                            <td colSpan={reportContent.headers.length} className="px-4 py-6 font-black text-amber-500 uppercase tracking-widest text-lg text-center rounded-t-xl">
                              RESULTADO DO PERÍODO
                            </td>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase text-sm flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Faturado Bruto</td>
                            <td className="px-6 py-4 text-base font-black text-emerald-600 text-right border-l border-slate-200 bg-white">{formatCurrency(row[6])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={3} className="px-6 py-4 font-bold text-slate-700 uppercase text-sm flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> Total Despesas</td>
                            <td className="px-6 py-4 text-base font-black text-rose-600 text-right border-l border-slate-200 bg-white">{formatCurrency(row[7])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                          <tr className="bg-slate-100 border-b-4 border-slate-900">
                            <td colSpan={3} className="px-6 py-5 font-black text-slate-900 uppercase text-sm text-right tracking-widest">LUCRO / PREJUÍZO (REGIME DE COMPETÊNCIA):</td>
                            <td className={`px-6 py-5 text-2xl font-black text-right border-l border-slate-300 bg-white shadow-inner ${row[8] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row[8])}</td>
                            <td colSpan={reportContent.headers.length - 4} className="bg-white"></td>
                          </tr>
                        </React.Fragment>
                      );
                    }

                    if (row[0] === 'CARD_RESUMO_HEADER') {
                      return (
                        <tr key={i} className="bg-slate-900 border-0">
                          <td colSpan={reportContent.headers.length} className="px-4 py-4 font-black text-amber-500 uppercase tracking-widest text-lg text-left rounded-t-xl">
                            CARTÃO: {row[1]}
                          </td>
                        </tr>
                      );
                    }
                    if (row[0] === 'COLUMN_HEADERS_CARD') {
                      return (
                        <tr key={i} className="bg-slate-100 border-y border-slate-200">
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-left w-[110px] whitespace-nowrap">{row[1]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-left">{row[2]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right w-[130px] whitespace-nowrap">{row[3]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right w-[130px] whitespace-nowrap">{row[4]}</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right w-[130px] whitespace-nowrap">{row[5]}</th>
                          <th colSpan={reportContent.headers.length - 5} className="px-4 py-2"></th>
                        </tr>
                      );
                    }
                    if (row[0] === 'CARD_ITEM') {
                      const date = row[1] || '';
                      const desc = row[2] || '';
                      const isSpecial = desc.includes('SALDO ANTERIOR') || desc.includes('PAGAMENTO FATURA');
                      const isMinus = typeof row[5] === 'string' && row[5].startsWith('-');
                      
                      const weightClass = isSpecial ? 'font-black' : 'font-normal';
                      
                      return (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-600">{row[1]}</td>
                          <td className={`px-4 py-3 text-sm text-slate-700 ${weightClass}`}>{row[2]}</td>
                          <td className={`px-4 py-3 text-sm text-emerald-600 text-right ${weightClass}`}>{row[3]}</td>
                          <td className={`px-4 py-3 text-sm text-rose-600 text-right ${weightClass}`}>{row[4]}</td>
                          <td className={`px-4 py-3 text-sm text-right ${weightClass} ${isMinus ? 'text-rose-600' : 'text-slate-800'}`}>{row[5]}</td>
                          <td colSpan={reportContent.headers.length - 5} className="px-4 py-3"></td>
                        </tr>
                      );
                    }
                    if (row[0] === 'CARD_FOOTER') {
                      const isMinus = typeof row[5] === 'string' && row[5].startsWith('-');
                      return (
                        <tr key={i} className="bg-slate-50 border-y-2 border-slate-300">
                          <td colSpan={2} className="px-4 py-3 text-sm font-black text-slate-500 text-right uppercase tracking-wider">{row[1]}</td>
                          <td className="px-4 py-3 text-sm font-black text-emerald-600 text-right">{row[3]}</td>
                          <td className="px-4 py-3 text-sm font-black text-rose-600 text-right">{row[4]}</td>
                          <td className={`px-4 py-3 text-base font-black text-right border-l border-slate-200 ${isMinus ? 'text-rose-600' : 'text-slate-900'}`}>{row[5]}</td>
                          <td colSpan={reportContent.headers.length - 5} className="px-4 py-3"></td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={i} className={`${isSectionHeader ? 'font-black border-y border-slate-300' : ''} ${isSubtotalRow ? 'font-black border-y border-slate-200' : ''}`}>
                        {row.map((cell, j) => {
                          // Skip empty cells in subtotal rows that are covered by the colSpan of the first cell
                          if (isSubtotalRow && j > 0 && j < row.length - 1) return null;
                          if (isSectionHeader && j > 0) return null;

                          const isCredit = selectedReport === 'bankStatement' && j === 2 && typeof cell === 'number' && cell > 0;
                          const isDebit = selectedReport === 'bankStatement' && j === 3 && typeof cell === 'number' && cell > 0;
                          const isBalance = selectedReport === 'bankStatement' && j === 4;

                          return (
                            <td
                              key={j}
                              colSpan={isSectionHeader ? reportContent.headers.length : (isSubtotalRow && j === 0 ? reportContent.headers.length - 1 : 1)}
                              className={`px-4 py-3 text-slate-700 font-medium leading-relaxed print:text-[12px] ${(selectedReport === 'employeeLoans' || selectedReport === 'companyLoans') && j === 0 ? 'whitespace-nowrap' : ''}
                                ${isSectionHeader ? 'text-slate-900 text-sm tracking-widest uppercase py-4 whitespace-nowrap print:text-[12px]' : ''}
                                ${isSubtotalRow ? 'text-slate-800 text-sm print:text-[12px]' : ''}
                                ${isCredit ? 'text-emerald-600 font-bold' : ''}
                                ${isDebit ? 'text-rose-600 font-bold' : ''}
                                ${isBalance ? 'bg-slate-50/50 font-black text-slate-900 border-l border-slate-200' : ''}
                                 ${isTotalMonthRow ? 'bg-amber-500/10' : ''}
                                 ${isSubtotalRow && j === (isSectionHeader ? 0 : row.length - 1) ? 'text-right font-black border-l-2 border-slate-900' : ''}
                                  ${(selectedReport === 'sales' && j === 5) || (selectedReport === 'customerStatement' && [2, 3, 4, 5].includes(j)) || (selectedReport === 'receivables' && j === 7) || (selectedReport === 'expensesPending' && j === 5) || (selectedReport === 'payments' && j === 6) || (selectedReport === 'receivablesPending' && j === 5) || (selectedReport === 'corporateCard' && j === 4) || (selectedReport === 'cardFees' && [4, 5, 6].includes(j)) || (selectedReport === 'bankStatement' && [2, 3, 4].includes(j)) || (selectedReport === 'employees' && [3, 4].includes(j)) ? 'text-right' : 'text-left'}
                                 ${(selectedReport === 'expensesByMonth' || selectedReport === 'expensesByMonthFlat') && j === 4 ? 'text-right' : ''}
                                 ${(selectedReport === 'accountCategoriesList' || selectedReport === 'dre') && j === 0 ? 'w-[120px] pl-8 font-mono text-slate-500 font-bold' : ''}
                                 ${selectedReport === 'payments' ? (
                                  j === 0 ? 'w-[100px]' :
                                    j === 1 ? 'w-[100px]' :
                                      j === 2 ? 'w-[80px]' :
                                        j === 3 ? 'w-full min-w-[180px]' :
                                          j === 4 ? 'w-[150px]' :
                                            j === 5 ? 'w-[120px]' :
                                              j === 6 ? 'w-[110px]' : ''
                                ) : selectedReport === 'customerStatement' ? (
                                  j === 0 ? 'w-[100px]' :
                                    j === 1 ? 'w-full min-w-[300px]' :
                                      j === 2 ? 'w-[140px] text-right' :
                                        j === 3 ? 'w-[140px] text-right' :
                                          j === 4 ? 'w-[140px] text-right' :
                                            j === 5 ? 'w-[160px] text-right font-black' : ''
                                ) : selectedReport === 'sales' ? (
                                  j === 0 ? 'w-[100px]' :
                                    j === 1 ? 'w-[90px]' :
                                      j === 2 ? 'w-auto' :
                                        j === 3 ? 'w-[200px]' :
                                          j === 4 ? 'w-[110px]' :
                                            j === 5 ? 'w-[120px]' : ''
                                ) : (selectedReport === 'expensesByMonth' || selectedReport === 'expensesByMonthFlat') && j === 1 ? 'min-w-[180px]' : ''}
                                 ${((selectedReport === 'expensesByMonth' || selectedReport === 'expensesByMonthFlat') && j === 1) || ((selectedReport === 'customersSummary' || selectedReport === 'vendorsSummary') && (j >= 0 && j <= 4)) || (selectedReport === 'payments' && j === 4) || (selectedReport === 'expensesPending' && j === 0) ? 'whitespace-nowrap' : (isSectionHeader ? '' : 'whitespace-pre-line')}
                                ${(selectedReport === 'expensesByMonth' || selectedReport === 'expensesByMonthFlat') && j === 1 ? 'min-w-[180px]' : ''}
                                ${(selectedReport === 'customersSummary' || selectedReport === 'vendorsSummary') && j === 3 ? 'text-left' : ''}
                                ${(isSubtotalRow && (j === 0 || j === 1)) ? 'whitespace-nowrap text-left' : ''}
                                ${isTotalMonthRow && j === 0 ? 'font-black text-slate-900 text-sm' : ''}
                            `}
                            >
                              {selectedReport === 'agenda' && j === 1 && typeof cell === 'string' ? (
                                <>
                                  <span className="font-bold text-slate-900 block">{cell.split('\n')[0]}</span>
                                  {cell.includes('\n') && <span className="text-slate-500 block mt-0.5">{cell.split('\n').slice(1).join('\n')}</span>}
                                </>
                              ) : typeof cell === 'string' && cell.includes('(BLOQUEADO)') ? (
                                <>
                                  {cell.split('(BLOQUEADO)')[0]}
                                  <span className="font-black text-rose-600">(BLOQUEADO)</span>
                                  {cell.split('(BLOQUEADO)')[1]}
                                </>
                              ) : cell}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={reportContent.headers.length} className="px-4 py-10 text-center italic text-slate-400">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>

                {(reportContent.total !== undefined || reportContent.closingBalance !== undefined) && reportContent.rows.length > 0 && (
                  <tbody className="border-t-4 border-slate-900 bg-slate-100 font-black">
                    <tr className="print:break-inside-avoid">
                      <td colSpan={reportContent.headers.length - 1} className="px-4 py-5 text-right text-slate-900 uppercase tracking-widest text-sm">
                        {reportContent.closingBalance !== undefined
                          ? 'Saldo Final em Conta:'
                          : selectedReport === 'payments'
                            ? 'TOTAL DE PAGAMENTOS REALIZADOS:'
                            : selectedReport === 'receivablesPending'
                              ? 'TOTAL A RECEBER:'
                              : selectedReport === 'receivables'
                                ? 'TOTAL RECEBIDO:'
                                : selectedReport === 'sales'
                                  ? 'TOTAL DO FATURAMENTO:'
                                  : selectedReport === 'customerStatement'
                                    ? 'Total a Receber no Período:'
                                    : selectedReport === 'employees'
                                      ? 'TOTAL GERAL (SALÁRIOS + DIFERENÇA):'
                                      : selectedReport === 'employeeLoans'
                                        ? 'TOTAL EMPRESTADO:'
                                        : selectedReport === 'companyLoans'
                                          ? 'TOTAL EMPRESTADO:'
                                          : 'TOTAL DE DESPESAS:'}
                      </td>
                      <td className={`px-4 py-5 text-xl whitespace-nowrap text-right ${reportContent.closingBalance !== undefined && reportContent.closingBalance < 0 ? 'text-rose-600' : 'text-slate-900 underline underline-offset-8 decoration-slate-300'}`}>
                        {formatCurrency(reportContent.closingBalance ?? reportContent.total ?? 0)}
                      </td>
                    </tr>
                  </tbody>
                )}

                {/* Repete Rodapé em Todas as Páginas na Impressão */}
                {/* Rodapé removido conforme solicitação */}
              </table>
            </div>

            {/* Rodapé removido conforme solicitação */}
          </div>
        )
      }

      {
        !selectedReport && (
          <div className="bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 px-4 text-center">
            <Printer size={48} className="text-slate-300 mb-4" />
            <h4 className="text-slate-500 font-bold text-lg">Pronto para emitir!</h4>
            <p className="text-slate-400 text-sm max-w-xs mt-2">Selecione um relatório acima para visualizar a prévia antes de imprimir.</p>
          </div>
        )
      }
    </div >
  );
};

export default ReportsManager;
