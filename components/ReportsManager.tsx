
import React, { useState, useMemo } from 'react';
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
  BankAccount,
  Equipment,
  MaintenanceRecord,
  MaintenanceIntervals
} from '../types';
import Logo from './Logo';

type ReportType = 'customers' | 'vendors' | 'sales' | 'receivables' | 'payments' | 'accountPlan' | 'banks' | 'bankStatement' | 'corporateCard' | 'fleetOverdue' | 'fleetDue2' | 'fleetDue15' | 'fleetHistory' | 'fleetIntervals' | 'expensesPending' | 'receivablesPending' | 'cardFees';

interface ReportsManagerProps {
  customers: Customer[];
  vendors: Vendor[];
  vendorCategories: VendorCategory[];
  sales: Sale[];
  expenses: Expense[];
  payments: Payment[];
  accountPlan: AccountPlan[];
  bankAccounts: BankAccount[];
  fleet: Equipment[];
  maintenanceRecords: MaintenanceRecord[];
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

const ReportsManager: React.FC<ReportsManagerProps> = ({
  customers, vendors, vendorCategories, sales, expenses, payments, accountPlan, bankAccounts, fleet, maintenanceRecords
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatMonths = (n: number) => n === 1 ? '1 Mês' : `${n} Meses`;

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const setMonthRange = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
  };

  const reportContent = useMemo(() => {
    if (!selectedReport) return null;

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);

    const getFleetAlerts = (statusFilter: 'overdue' | 'warning' | 'info' | 'all') => {
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

            let status: 'overdue' | 'warning' | 'info' | 'ok' = 'ok';
            if (diffDays <= 0) status = 'overdue';
            else if (diffDays <= 2) status = 'warning';
            else if (diffDays <= 15) status = 'info';

            if (statusFilter === 'all' || status === statusFilter) {
              alerts.push({
                equipName: `${equip.type} - ${equip.model}`,
                item: itemLabels[itemKey],
                dueDate: nextDate.toLocaleDateString(),
                daysLeft: diffDays,
                statusText: diffDays <= 0 ? `Vencido há ${Math.abs(diffDays)} dias` : `Vence em ${diffDays} dias`
              });
            }
          }
        });
      });
      return alerts;
    };

    switch (selectedReport) {
      case 'expensesPending': {
        const pending = expenses
          .filter(e => e.status === 'Pendente')
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
          });

        return {
          title: 'Relatório de Contas a Pagar (Pendentes)',
          headerInfo: 'Listagem de despesas cadastradas que ainda não foram baixadas (pagas).',
          headers: ['Vencimento', 'Fornecedor', 'Documento', 'Plano de Contas', 'Valor'],
          rows: pending.map(e => [
            e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '---',
            e.vendorName,
            e.docNumber || 'S/N',
            accountPlan.find(p => p.id === e.accountPlanId)?.subcategory || '---',
            formatCurrency(e.totalValue)
          ]),
          total: pending.reduce((acc, e) => acc + e.totalValue, 0)
        };
      }
      case 'receivablesPending': {
        const pending = sales
          .filter(s => {
            const totalPaid = payments.filter(p => p.saleId === s.id).reduce((sum, p) => sum + p.amount, 0);
            return s.totalValue - totalPaid > 0.01;
          })
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
          });

        return {
          title: 'Relatório de Contas a Receber (Pendentes)',
          headerInfo: 'Listagem de faturamentos de serviços com saldo em aberto por parte dos clientes.',
          headers: ['Vencimento', 'Cliente', 'NF / Fatura', 'Plano de Contas', 'Saldo Devedor'],
          rows: pending.map(s => {
            const totalPaid = payments.filter(p => p.saleId === s.id).reduce((sum, p) => sum + p.amount, 0);
            const balance = s.totalValue - totalPaid;
            return [
              s.dueDate ? new Date(s.dueDate).toLocaleDateString() : (s.paymentCondition === 'A Vista' ? new Date(s.date).toLocaleDateString() : '---'),
              s.customerName,
              s.isNoNF ? 'S/NF' : (s.nfNumber || 'S/N'),
              accountPlan.find(p => p.id === s.accountPlanId)?.subcategory || '---',
              formatCurrency(balance)
            ];
          }),
          total: pending.reduce((acc, s) => {
            const totalPaid = payments.filter(p => p.saleId === s.id).reduce((sum, p) => sum + p.amount, 0);
            return acc + (s.totalValue - totalPaid);
          }, 0)
        };
      }
      case 'fleetIntervals': {
        return {
          title: 'Configuração de Prazos de Manutenção Preventiva',
          headerInfo: 'Relatório geral de intervalos por equipamento',
          headers: ['Equipamento', 'Troca Óleo', 'Filtro Diesel', 'Filtro Óleo', 'Filtro Ar Int.', 'Filtro Ar Ext.', 'Sangrar Filtro', 'Outros'],
          rows: fleet.map(e => [
            `${e.type} - ${e.model}`,
            formatMonths(e.intervals.oilChange),
            formatMonths(e.intervals.dieselFilter),
            formatMonths(e.intervals.oilFilter),
            formatMonths(e.intervals.internalAirFilter),
            formatMonths(e.intervals.externalAirFilter),
            formatMonths(e.intervals.bleedDieselFilter),
            formatMonths(e.intervals.others)
          ])
        };
      }
      case 'fleetOverdue': {
        const items = getFleetAlerts('overdue');
        return {
          title: 'Relatório de Manutenções Vencidas',
          headers: ['Equipamento', 'Item de Manutenção', 'Data Vencimento', 'Status'],
          rows: items.map(i => [i.equipName, i.item, i.dueDate, i.statusText.toUpperCase()])
        };
      }
      case 'fleetDue2': {
        const items = getFleetAlerts('warning');
        return {
          title: 'Manutenções Vencendo em 2 Dias',
          headers: ['Equipamento', 'Item de Manutenção', 'Data Vencimento', 'Status'],
          rows: items.map(i => [i.equipName, i.item, i.dueDate, i.statusText.toUpperCase()])
        };
      }
      case 'fleetDue15': {
        const items = getFleetAlerts('info');
        return {
          title: 'Manutenções Vencendo em 15 Dias',
          headers: ['Equipamento', 'Item de Manutenção', 'Data Vencimento', 'Status'],
          rows: items.map(i => [i.equipName, i.item, i.dueDate, i.statusText.toUpperCase()])
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
          : fleet.find(f => f.id === selectedEquipmentId)?.model || '---';

        return {
          title: `Histórico de Manutenções - ${equipTitle}`,
          headerInfo: `Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data', 'Equipamento', 'Nota Fiscal', 'Itens Trocados', 'Observações'],
          rows: hist.map(r => {
            const equip = fleet.find(f => f.id === r.equipmentId);
            return [
              new Date(r.date).toLocaleDateString(),
              equip ? `${equip.type} - ${equip.model}` : '---',
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
          .filter(e => e.bankAccountId === selectedBankId && e.status === 'Pago' && e.paymentDate && new Date(e.paymentDate).getTime() < startTimestamp)
          .reduce((acc, e) => acc + e.totalValue, 0);

        const openingBalance = initialSystemBalance + prevCredits - prevDebits;

        const periodCredits = payments
          .filter(p => p.bankAccountId === selectedBankId && new Date(p.date).getTime() >= startTimestamp && new Date(p.date).getTime() <= endTimestamp)
          .map(p => {
            const sale = sales.find(s => s.id === p.saleId);
            return {
              date: p.date,
              credit: p.amount,
              debit: 0,
              desc: `RECEBIMENTO: ${sale?.customerName || 'Cliente'} / NF: ${sale?.nfNumber || 'S/N'} / ${p.method}`
            };
          });

        const periodDebits = expenses
          .filter(e => e.bankAccountId === selectedBankId && e.status === 'Pago' && e.paymentDate && new Date(e.paymentDate).getTime() >= startTimestamp && new Date(e.paymentDate).getTime() <= endTimestamp)
          .map(e => ({
            date: e.paymentDate!,
            credit: 0,
            debit: e.totalValue,
            desc: `PAGAMENTO: ${e.vendorName} / DOC: ${e.docNumber || 'S/N'} / ${e.items.map(i => i.description).join(', ')}`
          }));

        const sortedMovements = [...periodCredits, ...periodDebits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentRunningBalance = openingBalance;
        const rowsWithBalance = sortedMovements.map(m => {
          currentRunningBalance = currentRunningBalance + m.credit - m.debit;
          return [
            new Date(m.date).toLocaleDateString('pt-BR'),
            m.desc,
            m.credit > 0 ? formatCurrency(m.credit) : '---',
            m.debit > 0 ? formatCurrency(m.debit) : '---',
            formatCurrency(currentRunningBalance)
          ];
        });

        return {
          title: `Extrato Bancário Detalhado - ${bank.bankName}`,
          headerInfo: `Agência: ${bank.agency} | Conta: ${bank.accountNumber} | Saldo Inicial Sistema: ${formatCurrency(initialSystemBalance)}`,
          openingBalance: openingBalance,
          closingBalance: currentRunningBalance,
          headers: ['Data', 'Descrição do Lançamento', 'Valor Crédito (+)', 'Valor Débito (-)', 'Saldo'],
          rows: rowsWithBalance
        };
      }

      case 'corporateCard': {
        const cardExpenses = expenses
          .filter(e => e.paymentMethod === 'Cartão Corporativo' && new Date(e.date).getTime() >= startTimestamp && new Date(e.date).getTime() <= endTimestamp)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          title: `Relatório de Cartão Corporativo - Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data Compra', 'Vencimento', 'Fornecedor', 'Descrição', 'Valor'],
          rows: cardExpenses.map(e => [
            new Date(e.date).toLocaleDateString(),
            e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '---',
            e.vendorName,
            e.items.map(i => i.description).join(', '),
            formatCurrency(e.totalValue)
          ]),
          total: cardExpenses.reduce((acc, e) => acc + e.totalValue, 0)
        };
      }

      case 'customers':
        return {
          title: 'Relatório Geral de Clientes',
          headers: ['Nome / Razão Social', 'CPF / CNPJ', 'Responsável', 'Telefone / Email', 'Endereço'],
          rows: customers.map(c => [c.name, c.document, c.contactPerson, `${c.phone}\n${c.email}`, c.address])
        };
      case 'vendors':
        return {
          title: 'Relatório Geral de Fornecedores',
          headers: ['Fornecedor', 'Categoria', 'Documento', 'Responsável', 'Contato'],
          rows: vendors.map(v => [
            v.name,
            vendorCategories.find(c => c.id === v.categoryId)?.name || 'N/A',
            v.document,
            v.contactPerson,
            `${v.phone}\n${v.email}`
          ])
        };
      case 'sales': {
        const filteredSales = sales.filter(s => {
          const d = new Date(s.date).getTime();
          return d >= startTimestamp && d <= endTimestamp;
        });

        const salesWithNF = filteredSales.filter(s => !s.isNoNF).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const salesWithoutNF = filteredSales.filter(s => !!s.isNoNF).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const totalWithNF = salesWithNF.reduce((sum, s) => sum + s.totalValue, 0);
        const totalWithoutNF = salesWithoutNF.reduce((sum, s) => sum + s.totalValue, 0);

        const rows: any[] = [];

        if (salesWithNF.length > 0) {
          rows.push(['FATURAMENTO COM NOTA FISCAL', '', '', '', '']);
          salesWithNF.forEach(s => {
            rows.push([
              new Date(s.date).toLocaleDateString(),
              s.nfNumber || 'S/N',
              s.customerName,
              accountPlan.find(p => p.id === s.accountPlanId)?.subcategory || '---',
              formatCurrency(s.totalValue)
            ]);
          });
          rows.push(['SUBTOTAL COM NOTA FISCAL:', '', '', '', formatCurrency(totalWithNF)]);
        }

        if (salesWithoutNF.length > 0) {
          if (rows.length > 0) rows.push(['', '', '', '', '']);
          rows.push(['FATURAMENTO SEM NOTA FISCAL (S/NF)', '', '', '', '']);
          salesWithoutNF.forEach(s => {
            rows.push([
              new Date(s.date).toLocaleDateString(),
              'S/NF',
              s.customerName,
              accountPlan.find(p => p.id === s.accountPlanId)?.subcategory || '---',
              formatCurrency(s.totalValue)
            ]);
          });
          rows.push(['SUBTOTAL SEM NOTA FISCAL (S/NF):', '', '', '', formatCurrency(totalWithoutNF)]);
        }

        return {
          title: `Relatório de Faturamento de Serviços - Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data', 'NF', 'Cliente', 'Plano de Contas', 'Valor'],
          rows: rows,
          total: filteredSales.reduce((acc, curr) => acc + curr.totalValue, 0)
        };
      }
      case 'receivables': {
        const filteredPayments = payments.filter(p => {
          const d = new Date(p.date).getTime();
          return d >= startTimestamp && d <= endTimestamp;
        });

        const paymentsWithNF = filteredPayments.filter(p => {
          const sale = sales.find(s => s.id === p.saleId);
          return sale && !sale.isNoNF;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const paymentsWithoutNF = filteredPayments.filter(p => {
          const sale = sales.find(s => s.id === p.saleId);
          return sale && sale.isNoNF;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const rows: any[] = [];

        if (paymentsWithNF.length > 0) {
          rows.push(['RECEBIMENTOS COM NOTA FISCAL', '', '', '', '', '']);
          paymentsWithNF.forEach(p => {
            const sale = sales.find(s => s.id === p.saleId);
            const bank = bankAccounts.find(b => b.id === p.bankAccountId);
            rows.push([
              new Date(p.date).toLocaleDateString(),
              sale?.customerName || '---',
              bank?.bankName || '---',
              p.method,
              formatCurrency(p.amount),
              formatCurrency(p.amount - (p.fee || 0))
            ]);
          });
          rows.push(['SUBTOTAL RECEBIMENTOS COM NF:', '', '', '', '', formatCurrency(paymentsWithNF.reduce((acc, p) => acc + (p.amount - (p.fee || 0)), 0))]);
        }

        if (paymentsWithoutNF.length > 0) {
          if (rows.length > 0) rows.push(['', '', '', '', '', '']);
          rows.push(['RECEBIMENTOS SEM NOTA FISCAL (S/NF)', '', '', '', '', '']);
          paymentsWithoutNF.forEach(p => {
            const sale = sales.find(s => s.id === p.saleId);
            const bank = bankAccounts.find(b => b.id === p.bankAccountId);
            rows.push([
              new Date(p.date).toLocaleDateString(),
              sale?.customerName || '---',
              bank?.bankName || '---',
              p.method,
              formatCurrency(p.amount),
              formatCurrency(p.amount - (p.fee || 0))
            ]);
          });
          rows.push(['SUBTOTAL RECEBIMENTOS SEM NF (S/NF):', '', '', '', '', formatCurrency(paymentsWithoutNF.reduce((acc, p) => acc + (p.amount - (p.fee || 0)), 0))]);
        }

        return {
          title: `Recebimentos Baixados - Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data Rec.', 'Cliente', 'Banco', 'Forma', 'Vlr Bruto', 'Vlr Líquido'],
          rows: rows,
          total: filteredPayments.reduce((acc, curr) => acc + (curr.amount - (curr.fee || 0)), 0)
        };
      }
      case 'cardFees': {
        const cardPayments = payments.filter(p => {
          const d = new Date(p.date).getTime();
          return d >= startTimestamp && d <= endTimestamp && p.method === 'Cartão' && (p.fee || 0) > 0;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          title: 'Relatório de Despesas com Taxas de Recebimentos com Cartão',
          headerInfo: `Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data Recebimento', 'Valor da Taxa', 'Ref NF'],
          rows: cardPayments.map(p => {
            const sale = sales.find(s => s.id === p.saleId);
            return [
              new Date(p.date).toLocaleDateString(),
              formatCurrency(p.fee || 0),
              sale?.nfNumber || 'S/N'
            ];
          }),
          total: cardPayments.reduce((acc, p) => acc + (p.fee || 0), 0)
        };
      }
      case 'payments':
        const filteredExpenses = expenses.filter(e => {
          if (!e.paymentDate) return false;
          const d = new Date(e.paymentDate).getTime();
          return d >= startTimestamp && d <= endTimestamp && e.status === 'Pago';
        }).sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime());
        return {
          title: `Pagamentos Realizados - Período: ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
          headers: ['Data Pag.', 'Fornecedor', 'Banco Saída', 'Doc', 'Valor'],
          rows: filteredExpenses.map(e => {
            const bank = bankAccounts.find(b => b.id === e.bankAccountId);
            return [
              new Date(e.paymentDate!).toLocaleDateString(),
              e.vendorName,
              bank?.bankName || '---',
              e.docNumber || 'S/N',
              formatCurrency(e.totalValue)
            ];
          }),
          total: filteredExpenses.reduce((acc, curr) => acc + curr.totalValue, 0)
        };
      case 'accountPlan':
        return {
          title: 'Estrutura do Plano de Contas',
          headers: ['Tipo', 'Categoria Principal', 'Subcategoria', 'Descrição'],
          rows: accountPlan.sort((a, b) => a.type.localeCompare(b.type)).map(p => [
            p.type.toUpperCase(),
            p.category,
            p.subcategory,
            p.description || '---'
          ])
        };
      case 'banks':
        return {
          title: 'Relatório de Contas Bancárias',
          headers: ['Instituição', 'Agência', 'Conta Corrente'],
          rows: bankAccounts.map(b => [b.bankName, b.agency, b.accountNumber])
        };
      default:
        return null;
    }
  }, [selectedReport, selectedBankId, selectedEquipmentId, startDate, endDate, customers, vendors, vendorCategories, sales, expenses, payments, accountPlan, bankAccounts, fleet, maintenanceRecords]);

  return (
    <div className="space-y-8">
      <div className="print:hidden space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <Printer className="mr-2 text-amber-500" size={20} /> Relatórios Financeiros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReportButton active={selectedReport === 'bankStatement'} onClick={() => setSelectedReport('bankStatement')} label="Extrato Bancário" icon={ArrowUpRight} />
            <ReportButton active={selectedReport === 'corporateCard'} onClick={() => setSelectedReport('corporateCard')} label="Cartão Corporativo" icon={CreditCard} />
            <ReportButton active={selectedReport === 'sales'} onClick={() => setSelectedReport('sales')} label="Faturamento por Período" icon={Receipt} />
            <ReportButton active={selectedReport === 'receivables'} onClick={() => setSelectedReport('receivables')} label="Baixa de Recebidos" icon={HandCoins} />
            <ReportButton active={selectedReport === 'cardFees'} onClick={() => setSelectedReport('cardFees')} label="Taxas de Cartão" icon={CreditCard} color="rose" />
            <ReportButton active={selectedReport === 'receivablesPending'} onClick={() => setSelectedReport('receivablesPending')} label="Contas a Receber (Pendentes)" icon={Clock} color="blue" />
            <ReportButton active={selectedReport === 'payments'} onClick={() => setSelectedReport('payments')} label="Pagamentos Efetuados" icon={Wallet} />
            <ReportButton active={selectedReport === 'expensesPending'} onClick={() => setSelectedReport('expensesPending')} label="Contas a Pagar (Pendentes)" icon={Clock} color="rose" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 mt-10 mb-6 flex items-center">
            <Wrench className="mr-2 text-rose-500" size={20} /> Relatórios de Frota e Manutenção
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReportButton active={selectedReport === 'fleetOverdue'} onClick={() => setSelectedReport('fleetOverdue')} label="Preventivas VENCIDAS" icon={AlertTriangle} color="rose" />
            <ReportButton active={selectedReport === 'fleetDue2'} onClick={() => setSelectedReport('fleetDue2')} label="Vencendo em 2 Dias" icon={AlertTriangle} color="amber" />
            <ReportButton active={selectedReport === 'fleetDue15'} onClick={() => setSelectedReport('fleetDue15')} label="Vencendo em 15 Dias" icon={Calendar} color="blue" />
            <ReportButton active={selectedReport === 'fleetHistory'} onClick={() => setSelectedReport('fleetHistory')} label="Histórico Completo" icon={History} />
            <ReportButton active={selectedReport === 'fleetIntervals'} onClick={() => setSelectedReport('fleetIntervals')} label="Prazos Cadastrados" icon={Timer} />
          </div>

          <h3 className="text-lg font-bold text-slate-800 mt-10 mb-6 flex items-center">
            <BookOpen className="mr-2 text-blue-500" size={20} /> Relatórios Cadastrais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReportButton active={selectedReport === 'customers'} onClick={() => setSelectedReport('customers')} label="Listagem de Clientes" icon={Users} />
            <ReportButton active={selectedReport === 'vendors'} onClick={() => setSelectedReport('vendors')} label="Listagem de Fornecedores" icon={Truck} />
            <ReportButton active={selectedReport === 'accountPlan'} onClick={() => setSelectedReport('accountPlan')} label="Plano de Contas" icon={BookOpen} />
            <ReportButton active={selectedReport === 'banks'} onClick={() => setSelectedReport('banks')} label="Contas Bancárias" icon={Building2} />
          </div>
        </div>

        {selectedReport && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 space-y-6">
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
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
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
                    {fleet.map(e => <option key={e.id} value={e.id}>{e.type} - {e.model}</option>)}
                  </select>
                </div>
              )}

              {['sales', 'receivables', 'payments', 'bankStatement', 'corporateCard', 'fleetHistory'].includes(selectedReport) && (
                <>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Calendar size={14} className="mr-1" /> Data Inicial
                    </label>
                    <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      <Calendar size={14} className="mr-1" /> Data Final
                    </label>
                    <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <button type="button" onClick={setMonthRange} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors mb-[2px]">
                    Mês Atual
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {selectedReport && (selectedReport !== 'bankStatement' || selectedBankId) && (
          <div className="flex justify-end">
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

      {selectedReport && reportContent && (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-100 shadow-xl print:shadow-none print:border-0 print:p-0 print:m-0 print-visible">
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-center">
            <Logo size="lg" className="origin-left" />
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Gerencial</p>
              <p className="text-sm font-bold text-slate-800">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <h2 className="text-[12px] font-normal text-slate-800 mb-2 border-l-4 border-amber-500 pl-4 uppercase leading-none">
            {reportContent.title}
          </h2>
          {reportContent.headerInfo && (
            <p className="text-[10px] font-bold text-slate-500 mb-8 pl-5 uppercase tracking-widest">{reportContent.headerInfo}</p>
          )}

          {reportContent.openingBalance !== undefined && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Saldo em {new Date(startDate).toLocaleDateString('pt-BR')} (Saldo Anterior):</span>
              <span className={`font-black text-lg ${reportContent.openingBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {formatCurrency(reportContent.openingBalance)}
              </span>
            </div>
          )}

          <div className="overflow-x-auto print:overflow-visible text-slate-800">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  {reportContent.headers.map((h, k) => (
                    <th
                      key={k}
                      className={`px-4 py-3 font-black text-slate-600 uppercase text-[10px] tracking-wider whitespace-nowrap
                        ${selectedReport === 'sales' && k === 0 ? 'w-[100px]' : ''}
                        ${selectedReport === 'sales' && k === 1 ? 'w-[60px] text-left' : ''}
                        ${selectedReport === 'sales' && k === 2 ? 'w-auto min-w-[300px] print:min-w-0' : ''}
                        ${selectedReport === 'sales' && k === 4 ? 'w-[120px] text-right' : ''}
                      `}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportContent.rows.length > 0 ? reportContent.rows.map((row, i) => {
                  const isSectionHeader = row.some(cell =>
                    cell.toString().includes('FATURAMENTO COM') ||
                    cell.toString().includes('FATURAMENTO SEM') ||
                    cell.toString().includes('DESPESAS COM') ||
                    cell.toString().includes('DESPESAS POR') ||
                    cell.toString().includes('MOVIMENTAÇÃO DE')
                  );
                  const isSubtotalRow = row.some(cell => cell.toString().includes('SUBTOTAL'));

                  // Treat empty rows as visual spacers
                  const isEmptyRow = row.every(cell => cell === '');
                  if (isEmptyRow) {
                    return (
                      <tr key={i} className="h-8 bg-white border-0">
                        <td colSpan={reportContent.headers.length}></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={i} className={`${isSectionHeader ? 'bg-slate-100/80 font-black border-y border-slate-300' : ''} ${isSubtotalRow ? 'bg-slate-50/50 font-bold border-y border-slate-200 italic' : ''}`}>
                      {row.map((cell, j) => {
                        // Skip empty cells in subtotal rows that are covered by the colSpan of the first cell
                        if (isSubtotalRow && j > 0 && j < row.length - 1 && cell === '') return null;
                        if (isSectionHeader && j > 0) return null;

                        const isCredit = selectedReport === 'bankStatement' && j === 2 && typeof cell === 'number' && cell > 0;
                        const isDebit = selectedReport === 'bankStatement' && j === 3 && typeof cell === 'number' && cell > 0;
                        const isBalance = selectedReport === 'bankStatement' && j === 4;

                        return (
                          <td
                            key={j}
                            colSpan={isSectionHeader ? reportContent.headers.length : (isSubtotalRow && j === 0 ? reportContent.headers.length - 1 : 1)}
                            className={`px-4 py-3 text-slate-700 font-medium whitespace-pre-line leading-relaxed
                                ${isSectionHeader ? 'text-slate-900 text-[11px] tracking-widest uppercase py-4 whitespace-nowrap' : ''}
                                ${isSubtotalRow ? 'text-slate-800 text-xs italic' : ''}
                                ${isCredit ? 'text-emerald-600 font-bold' : ''}
                                ${isDebit ? 'text-rose-600 font-bold' : ''}
                                ${isBalance ? 'bg-slate-50/50 font-black text-slate-900 border-l border-slate-200' : ''}
                                ${isSubtotalRow && j === row.length - 1 ? 'text-right font-black border-l-2 border-slate-900' : ''}
                                ${selectedReport === 'sales' && j === 4 ? 'text-right' : ''}
                                ${(isSubtotalRow && j === 0) ? 'whitespace-nowrap' : ''}
                            `}
                          >
                            {cell}
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
                <tfoot className="border-t-4 border-slate-900 bg-slate-100 font-black">
                  <tr>
                    <td colSpan={reportContent.headers.length - 1} className="px-4 py-5 text-right text-slate-900 uppercase tracking-widest text-sm">
                      {reportContent.closingBalance !== undefined ? 'Saldo Final em Conta:' : 'TOTAL PENDENTE GERAL:'}
                    </td>
                    <td className={`px-4 py-5 text-xl whitespace-nowrap text-right ${reportContent.closingBalance !== undefined && reportContent.closingBalance < 0 ? 'text-rose-600' : 'text-slate-900 underline underline-offset-8 decoration-slate-300'}`}>
                      {formatCurrency(reportContent.closingBalance ?? reportContent.total ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <div>
              <p>Relatório Gerencial Interno - Sistema Terraplanagem Bauru</p>
            </div>
            <div className="text-right">
              <p>Página 1 de 1</p>
            </div>
          </div>
        </div>
      )}

      {!selectedReport && (
        <div className="bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 px-4 text-center">
          <Printer size={48} className="text-slate-300 mb-4" />
          <h4 className="text-slate-500 font-bold text-lg">Pronto para emitir!</h4>
          <p className="text-slate-400 text-sm max-w-xs mt-2">Selecione um dos botões acima para visualizar a prévia do relatório antes de imprimir.</p>
        </div>
      )}
    </div>
  );
};

const ReportButton = ({ active, onClick, label, icon: Icon, color = 'amber' }: any) => {
  const activeColors: Record<string, string> = {
    amber: 'border-amber-500 bg-amber-50 text-amber-700',
    rose: 'border-rose-500 bg-rose-50 text-rose-700',
    blue: 'border-blue-500 bg-blue-50 text-blue-700'
  };

  const iconColors: Record<string, string> = {
    amber: 'text-amber-700 bg-amber-200',
    rose: 'text-rose-700 bg-rose-200',
    blue: 'text-blue-700 bg-blue-200'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all group ${active
        ? `${activeColors[color]} shadow-lg`
        : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50 text-slate-500'
        }`}
    >
      <div className="flex items-center space-x-3 text-left">
        <div className={`p-2 rounded-xl transition-colors ${active ? iconColors[color] : 'bg-slate-100 group-hover:bg-amber-100'}`}>
          <Icon size={20} className={active ? '' : 'text-slate-400 group-hover:text-amber-500'} />
        </div>
        <span className={`font-bold text-sm leading-tight ${active ? 'opacity-100' : 'text-slate-600'}`}>{label}</span>
      </div>
      <ChevronRight size={18} className={`flex-shrink-0 transition-transform ${active ? 'rotate-90 text-current' : 'text-slate-300'}`} />
    </button>
  );
};

export default ReportsManager;
